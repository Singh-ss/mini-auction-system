const { WebSocketServer } = require('ws');
const moment = require('moment-timezone');
const Auction = require('./models/auction');
const { parseDuration } = require('./utils/timeUtils');
const wsManager = require('./wsManager');
const User = require('./models/User');

function initWebSocket(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        const urlParts = req.url.split('/');
        const endpoint = urlParts[1]; // e.g., 'auctions' or 'notifications'
        const id = urlParts[2]; // auctionId or undefined for notifications

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                if (endpoint === 'auctions') {
                    ws.auctionId = id;
                } else if (endpoint === 'notifications') {
                    ws.userId = data.userId;
                }
            }
        });

        ws.on('close', () => {
            // Cleanup if needed
        });
    });

    const broadcastToAuction = async (auctionId, message) => {
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN && client.auctionId === auctionId) {
                client.send(JSON.stringify(message));
            }
        });
    };

    const broadcastToUser = async (userId, message) => {
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN && client.userId === userId) {
                client.send(JSON.stringify(message));
            }
        });
    };

    // Store broadcast functions in wsManager for other files to use
    wsManager.setBroadcastFn(broadcastToAuction);
    wsManager.setBroadcastToUserFn(broadcastToUser);

    const cache = {
        auctions: new Map(), // key: auctionId, value: { endTime, goLiveTime, item_name, hasBids }
        lastRefresh: 0
    };

    const refreshCache = async () => {
        console.log('auction refresh');
        const auctions = await Auction.findAll();
        const now = moment().tz('Asia/Kolkata');

        cache.auctions.clear();

        for (const auction of auctions) {
            const goLiveTime = moment(auction.go_live_time).tz('Asia/Kolkata');
            const endTime = moment(goLiveTime).add(parseDuration(auction.duration));

            // Only cache auctions that have started and not yet ended
            if (now.isSameOrAfter(goLiveTime) && now.isBefore(endTime)) {
                cache.auctions.set(auction.id.toString(), {
                    endTime,
                    goLiveTime,
                    item_name: auction.item_name,
                    hasBids: auction.bids.length > 0
                });
            }
        }

        cache.lastRefresh = Date.now();
    };

    const checkAuctionEnd = async () => {
        console.log('auction check');
        const now = moment().tz('Asia/Kolkata');
        const endedIds = [];

        for (const [id, auction] of cache.auctions.entries()) {
            // Double-check go live time
            if (now.isBefore(auction.goLiveTime)) continue;

            if (now.isSameOrAfter(auction.endTime)) {
                const dbAuction = await Auction.findOne({ where: { id } });

                let winner_id = null;
                let winner_name = null;
                let topBid = null;

                if (dbAuction && dbAuction.bids.length > 0) {
                    topBid = dbAuction.bids.reduce((max, bid) =>
                        bid.bidAmount > max.bidAmount ? bid : max
                    );
                    winner_id = topBid.bidder;
                    const winnerUser = await User.findOne({ where: { id: winner_id } });
                    winner_name = winnerUser.username;

                    // Update auction in DB
                    await dbAuction.update({
                        is_sold: true,
                        winner_id: winner_id
                    });
                }

                await wsManager.broadcastToAuction(id, {
                    type: 'auction_ended',
                    auctionId: id,
                    message: `Auction "${auction.item_name}" has ended at ${now.format('YYYY-MM-DD HH:mm:ss')}${winner_name ? ` with winner ${winner_name}` : ''}.`,
                    winner_name,
                    winner_id
                });

                // Notify the winner, if any
                if (winner_id && winner_name) {
                    await wsManager.broadcastToUser(winner_id, {
                        type: 'notification',
                        recipient_id: winner_id,
                        message: `You won the auction "${auction.item_name}" with a bid of ₹${topBid.bidAmount} at ${now.format('YYYY-MM-DD HH:mm:ss')}.`
                    });
                }

                endedIds.push(id);
            }
        }

        // Remove ended auctions from cache
        endedIds.forEach(id => cache.auctions.delete(id));
    };

    // Initial load
    (async () => {
        await refreshCache();

        // Check every 1 seconds for end times
        setInterval(checkAuctionEnd, 10000);

        // Refresh cache every 30 seconds to get new auctions
        setInterval(refreshCache, 300000);
    })();

    return { broadcastToAuction, broadcastToUser, parseDuration };
}

module.exports = initWebSocket;