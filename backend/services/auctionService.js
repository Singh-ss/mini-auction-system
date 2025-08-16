const moment = require('moment-timezone');
const Auction = require('../models/Auction');
const User = require('../models/User');
const redis = require('../utils/redis');

const createAuction = async (user, { item_name, description, starting_price, bid_increment, go_live_time, duration }) => {
    const goLiveTimeUTC = moment.tz(go_live_time, 'Asia/Kolkata').toDate();
    const auction = await Auction.create({
        user_id: user.id,
        item_name,
        description,
        starting_price,
        bid_increment,
        go_live_time: goLiveTimeUTC,
        duration,
    });

    const auctionIST = {
        ...auction.dataValues,
        go_live_time: moment(auction.go_live_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    };

    return auctionIST;
};

const getAllAuctions = async () => {
    const auctions = await Auction.findAll({
        attributes: ['id', 'user_id', 'item_name', 'description', 'starting_price', 'bid_increment', 'go_live_time', 'duration', 'created_at'],
        include: [{ model: User, attributes: ['username'] }],
    });

    return auctions.map(auction => ({
        ...auction.dataValues,
        go_live_time: moment(auction.go_live_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
        created_at: moment(auction.created_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }));
};

const getAuctionById = async (id) => {
    const auction = await Auction.findOne({
        where: { id },
        attributes: ['id', 'user_id', 'item_name', 'description', 'starting_price', 'bid_increment', 'go_live_time', 'duration', 'created_at'],
        include: [{ model: User, attributes: ['username'] }],
    });

    if (!auction) return null;

    return {
        ...auction.dataValues,
        go_live_time: moment(auction.go_live_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
        created_at: moment(auction.created_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    };
};

const updateAuction = async (id, userId, { item_name, description, starting_price, bid_increment, go_live_time, duration }) => {
    const auction = await Auction.findOne({ where: { id, user_id: userId } });
    if (!auction) return null;

    const goLiveTimeUTC = moment.tz(go_live_time, 'Asia/Kolkata').toDate();
    await auction.update({
        item_name,
        description,
        starting_price,
        bid_increment,
        go_live_time: goLiveTimeUTC,
        duration,
    });

    return {
        ...auction.dataValues,
        go_live_time: moment(auction.go_live_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    };
};

const deleteAuction = async (id, userId) => {
    const auction = await Auction.findOne({ where: { id, user_id: userId } });
    if (!auction) return null;

    await auction.destroy();
    return true;
};

module.exports = { createAuction, getAllAuctions, getAuctionById, updateAuction, deleteAuction };