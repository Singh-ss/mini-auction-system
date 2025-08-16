const moment = require('moment-timezone');
const Auction = require('../models/Auction');
const User = require('../models/User');
const Bid = require('../models/Bid');
const redis = require('../utils/redis');
const { parseDuration } = require('../utils/timeUtils');
const { broadcastToAuction } = require('../websocket');

const placeBid = async (auctionId, userId, bid_amount) => {
    const auction = await Auction.findOne({ where: { id: auctionId } });
    if (!auction) throw new Error('Auction not found');

    const now = moment().tz('Asia/Kolkata');
    const goLiveTime = moment(auction.go_live_time).tz('Asia/Kolkata');
    const endTime = moment(goLiveTime).add(parseDuration(auction.duration));
    if (now < goLiveTime || now > endTime) {
        throw new Error('Auction is not active');
    }

    const currentBid = await redis.get(`auction:${auctionId}:highest_bid`);
    const highestBid = currentBid ? Number(currentBid) : Number(auction.starting_price);
    const highestBidderId = await redis.get(`auction:${auctionId}:highest_bidder`);

    if (bid_amount < highestBid + Number(auction.bid_increment)) {
        throw new Error(`Bid must be at least ₹${(Number(highestBid) + Number(auction.bid_increment)).toFixed(2)}`);
    }

    const bid = await Bid.create({
        auction_id: auctionId,
        user_id: userId,
        bid_amount,
    });

    await redis.set(`auction:${auctionId}:highest_bid`, bid_amount);
    await redis.set(`auction:${auctionId}:highest_bidder`, userId);

    const bidder = await User.findOne({ where: { id: userId } });
    const seller = await User.findOne({ where: { id: auction.user_id } });
    const previousBidder = highestBidderId ? await User.findOne({ where: { id: highestBidderId } }) : null;

    await broadcastToAuction(auctionId.toString(), {
        type: 'new_bid',
        auctionId,
        bid_amount,
        bidder_username: bidder.username,
    });

    await broadcastToAuction(auctionId.toString(), {
        type: 'notification',
        recipient_id: auction.user_id,
        message: `New bid of ₹${bid_amount} on your auction "${auction.item_name}" by ${bidder.username} at ${now.format('YYYY-MM-DD HH:mm:ss')}`,
    });

    if (previousBidder && highestBidderId !== userId) {
        await broadcastToAuction(auctionId.toString(), {
            type: 'notification',
            recipient_id: highestBidderId,
            message: `You have been outbid on "${auction.item_name}". New highest bid: ₹${bid_amount} at ${now.format('YYYY-MM-DD HH:mm:ss')}`,
        });
    }

    return {
        ...bid.dataValues,
        created_at: moment(bid.created_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    };
};

module.exports = { placeBid };