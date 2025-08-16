const moment = require('moment-timezone');
const Auction = require('../models/Auction');
const User = require('../models/User');
const redis = require('../utils/redis');
const { parseDuration } = require('../utils/timeUtils');
const wsManager = require('../wsManager');

const placeBid = async (auctionId, userId, bid_amount) => {
    const auction = await Auction.findOne({ where: { id: auctionId } });
    if (!auction) throw new Error('Auction not found');

    const now = moment().tz('Asia/Kolkata');
    const goLiveTime = moment(auction.go_live_time).tz('Asia/Kolkata');
    const endTime = moment(goLiveTime).add(parseDuration(auction.duration));
    if (now < goLiveTime || now > endTime) {
        throw new Error('Auction is not active');
    }

    const highestBidData = await redis.get(`auction:${auctionId}:highest_bid_data`);
    const currentBid = highestBidData?.bid_amount;
    const highestBid = currentBid ? Number(currentBid) : Number(auction.starting_price);
    const highestBidderId = highestBidData?.userId;

    if (bid_amount < highestBid + Number(auction.bid_increment)) {
        throw new Error(`Bid must be at least ₹${(Number(highestBid) + Number(auction.bid_increment)).toFixed(2)}`);
    }

    const bid = {
        bidder: userId,
        bidAmount: bid_amount,
        bidTime: moment().toDate(), // Stored in UTC
    };

    const updatedBids = [...auction.bids, bid];
    await auction.update({
        bids: updatedBids,
        current_price: bid_amount,
        winner_id: userId,
    });

    // await redis.set(`auction:${auctionId}:highest_bid`, bid_amount);
    // await redis.set(`auction:${auctionId}:highest_bidder`, userId);

    await redis.set(`auction:${auctionId}:highest_bid_data`, { userId, bid_amount });

    const bidder = await User.findOne({ where: { id: userId } });
    const seller = await User.findOne({ where: { id: auction.user_id } });
    const previousBidder = highestBidderId ? await User.findOne({ where: { id: highestBidderId } }) : null;

    await wsManager.broadcastToAuction(auctionId.toString(), {
        type: 'new_bid',
        auctionId,
        bid_amount,
        bidder_username: bidder.username,
        bidder_id: userId,
    });

    await wsManager.broadcastToUser(auction.user_id, {
        type: 'notification',
        recipient_id: auction.user_id,
        message: `New bid of ₹${bid_amount} on your auction "${auction.item_name}" by ${bidder.username} at ${now.format('YYYY-MM-DD HH:mm:ss')}`,
    });

    if (previousBidder && highestBidderId !== userId) {
        await wsManager.broadcastToUser(highestBidderId, {
            type: 'notification',
            recipient_id: highestBidderId,
            message: `You have been outbid on "${auction.item_name}". New highest bid: ₹${bid_amount} at ${now.format('YYYY-MM-DD HH:mm:ss')}`,
        });
    }

    return {
        bidder: userId,
        bidAmount: bid_amount,
        bidTime: moment(bid.bidTime).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    };
};

module.exports = { placeBid };