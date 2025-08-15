const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sequelize = require('./database/connection');
const Auction = require('./models/Auction');
const User = require('./models/User');
const Bid = require('./models/Bid');
const redis = require('./utils/redis');
const {
    sendAuctionConfirmationEmail,
    sendWelcomeEmail,
    sendAuctionEditConfirmationEmail,
    sendAuctionDeleteConfirmationEmail
} = require('./utils/sendgrid');
const http = require('http');
const initWebSocket = require('./websocket');
require('dotenv').config();
const cors = require("cors");

const app = express();
const server = http.createServer(app);
app.use(express.json());

app.use(cors({
    origin: "*"
}))

// Initialize WebSocket
const { broadcastToAuction } = initWebSocket(server);

// Initialize Supabase for authentication
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// Middleware to verify authenticated user
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) return res.status(401).json({ error: 'Invalid token' });
    req.user = user;
    next();
};

// Sign-up with email
app.post('/signup', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: { user }, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;

        await User.create({
            id: user.id,
            username,
            email,
        });

        await sendWelcomeEmail(email, username);
        res.status(201).json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login with email
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;

        res.json({ user, token: session.access_token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Create auction
app.post('/auctions', authenticate, async (req, res) => {
    try {
        const { item_name, description, starting_price, bid_increment, go_live_time, duration } = req.body;

        if (!item_name || !starting_price || !bid_increment || !go_live_time || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starting_price <= 0 || bid_increment <= 0) {
            return res.status(400).json({ error: 'Invalid price or increment' });
        }

        const auction = await Auction.create({
            user_id: req.user.id,
            item_name,
            description,
            starting_price,
            bid_increment,
            go_live_time,
            duration,
        });

        await sendAuctionConfirmationEmail(req.user.email, auction);
        res.status(201).json(auction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch all auctions
app.get('/auctions', authenticate, async (req, res) => {
    try {
        const auctions = await Auction.findAll({
            attributes: ['id', 'user_id', 'item_name', 'description', 'starting_price', 'bid_increment', 'go_live_time', 'duration', 'created_at'],
            include: [{ model: User, attributes: ['username'] }],
        });

        res.json(auctions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Edit auction
app.put('/auctions/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, description, starting_price, bid_increment, go_live_time, duration } = req.body;

        if (!item_name || !starting_price || !bid_increment || !go_live_time || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starting_price <= 0 || bid_increment <= 0) {
            return res.status(400).json({ error: 'Invalid price or increment' });
        }

        const auction = await Auction.findOne({ where: { id, user_id: req.user.id } });
        if (!auction) {
            return res.status(403).json({ error: 'Auction not found or you are not the creator' });
        }

        await auction.update({
            item_name,
            description,
            starting_price,
            bid_increment,
            go_live_time,
            duration,
        });

        await sendAuctionEditConfirmationEmail(req.user.email, auction);
        res.json(auction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete auction
app.delete('/auctions/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const auction = await Auction.findOne({ where: { id, user_id: req.user.id } });
        if (!auction) {
            return res.status(403).json({ error: 'Auction not found or you are not the creator' });
        }

        await auction.destroy();
        await sendAuctionDeleteConfirmationEmail(req.user.email, auction.item_name);
        res.json({ message: 'Auction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Place a bid
app.post('/auctions/:id/bids', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { bid_amount } = req.body;

        if (!bid_amount || bid_amount <= 0) {
            return res.status(400).json({ error: 'Invalid bid amount' });
        }

        // Fetch auction
        const auction = await Auction.findOne({ where: { id } });
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }

        // Check if auction is active
        const now = new Date();
        const endTime = new Date(new Date(auction.go_live_time).getTime() + parseDuration(auction.duration));
        if (now < new Date(auction.go_live_time) || now > endTime) {
            return res.status(400).json({ error: 'Auction is not active' });
        }

        // Get current highest bid from Redis
        const currentBid = await redis.get(`auction:${id}:highest_bid`);
        const highestBid = currentBid ? parseFloat(currentBid) : auction.starting_price;
        const highestBidderId = await redis.get(`auction:${id}:highest_bidder`);

        // Validate bid
        if (bid_amount < highestBid + auction.bid_increment) {
            return res.status(400).json({ error: `Bid must be at least $${(highestBid + auction.bid_increment).toFixed(2)}` });
        }

        // Save bid to Supabase
        const bid = await Bid.create({
            auction_id: id,
            user_id: req.user.id,
            bid_amount,
        });

        // Update Redis with new highest bid
        await redis.set(`auction:${id}:highest_bid`, bid_amount);
        await redis.set(`auction:${id}:highest_bidder`, req.user.id);

        // Fetch user details for notifications
        const bidder = await User.findOne({ where: { id: req.user.id } });
        const seller = await User.findOne({ where: { id: auction.user_id } });
        const previousBidder = highestBidderId ? await User.findOne({ where: { id: highestBidderId } }) : null;

        // Broadcast bid update
        await broadcastToAuction(id.toString(), {
            type: 'new_bid',
            auctionId: id,
            bid_amount,
            bidder_username: bidder.username,
        });

        // Broadcast notifications
        // To seller
        await broadcastToAuction(id.toString(), {
            type: 'notification',
            recipient_id: auction.user_id,
            message: `New bid of $${bid_amount} on your auction "${auction.item_name}" by ${bidder.username}`,
        });

        // To previous bidder (if outbid)
        if (previousBidder && highestBidderId !== req.user.id) {
            await broadcastToAuction(id.toString(), {
                type: 'notification',
                recipient_id: highestBidderId,
                message: `You have been outbid on "${auction.item_name}". New highest bid: $${bid_amount}`,
            });
        }

        res.status(201).json(bid);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Parse duration (duplicate from websocket.js to avoid circular dependency)
const parseDuration = (durationObj) => {
    if (!durationObj || typeof durationObj !== "object") return 0;

    const {
        years = 0,
        months = 0,
        days = 0,
        hours = 0,
        minutes = 0,
        seconds = 0
    } = durationObj;

    // Convert each unit to milliseconds
    // Approximation: 1 year = 365.25 days, 1 month = 30.44 days
    const msFromYears = years * 365.25 * 24 * 60 * 60 * 1000;
    const msFromMonths = months * 30.44 * 24 * 60 * 60 * 1000;
    const msFromDays = days * 24 * 60 * 60 * 1000;
    const msFromHours = hours * 60 * 60 * 1000;
    const msFromMinutes = minutes * 60 * 1000;
    const msFromSeconds = seconds * 1000;

    return (
        msFromYears +
        msFromMonths +
        msFromDays +
        msFromHours +
        msFromMinutes +
        msFromSeconds
    );
};

// Sync database and start server
sequelize.sync({ force: false }).then(() => {
    console.log('Database synced!');
    server.listen(4000, () => console.log('Server running on port 4000'));
});