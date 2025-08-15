const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const sequelize = require('./database/connection');
const Auction = require('./models/Auction');
const User = require('./models/User');
const redis = require('./utils/redis');
const { sendAuctionConfirmationEmail, sendWelcomeEmail } = require('./utils/sendgrid');
const http = require('http');
const initWebSocket = require('./websocket');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
app.use(express.json());

// Initialize WebSocket (placeholder for real-time bidding)
initWebSocket(server);

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

        // Sign up with Supabase
        const { data: { user }, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;

        // Create user record in users table
        await User.create({
            id: user.id,
            username,
            email,
        });

        // Send welcome email
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

// Create auction (protected route, unchanged from previous)
app.post('/auctions', authenticate, async (req, res) => {
    try {
        const { item_name, description, starting_price, bid_increment, go_live_time, duration } = req.body;

        // Validate inputs
        if (!item_name || !starting_price || !bid_increment || !go_live_time || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starting_price <= 0 || bid_increment <= 0) {
            return res.status(400).json({ error: 'Invalid price or increment' });
        }

        // Create auction in Supabase
        const auction = await Auction.create({
            user_id: req.user.id,
            item_name,
            description,
            starting_price,
            bid_increment,
            go_live_time,
            duration,
        });

        // Cache auction metadata in Redis
        await redis.set(`auction:${auction.id}`, JSON.stringify({
            id: auction.id,
            item_name,
            starting_price,
            bid_increment,
            go_live_time,
            duration,
        }), 'EX', 60 * 60 * 24); // Cache for 24 hours

        // Send confirmation email
        await sendAuctionConfirmationEmail(req.user.email, auction);

        res.status(201).json(auction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Sync database and start server
sequelize.sync({ force: false }).then(() => {
    console.log('Database synced!');
    server.listen(4000, () => console.log('Server running on port 4000 🚀'));
});