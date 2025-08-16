const { WebSocketServer } = require('ws');
const moment = require('moment-timezone');
const Auction = require('./models/Auction');
const { parseDuration } = require('./utils/timeUtils');
const wsManager = require('./wsManager');

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

                // Check latest bids from DB to avoid stale cache
                const hasBids = dbAuction.bids.length > 0;
                if (dbAuction && hasBids) {
                    await dbAuction.update({ is_sold: true });
                }

                await broadcastToAuction(id, {
                    type: 'auction_ended',
                    auctionId: id,
                    message: `Auction "${auction.item_name}" has ended at ${now.format('YYYY-MM-DD HH:mm:ss')}.`,
                });

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
        setInterval(checkAuctionEnd, 1000);

        // Refresh cache every 30 seconds to get new auctions
        setInterval(refreshCache, 30000);
    })();

    return { broadcastToAuction, broadcastToUser, parseDuration };
}

module.exports = initWebSocket;