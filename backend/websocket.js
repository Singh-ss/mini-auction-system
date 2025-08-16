const { WebSocketServer } = require('ws');
const redis = require('./utils/redis');
const moment = require('moment-timezone');
const Auction = require('./models/Auction');
const { parseDuration } = require('./utils/timeUtils');

function initWebSocket(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        const auctionId = req.url.split('/').pop();

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                ws.auctionId = auctionId;
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

    const cache = {
        auctions: new Map(), // key: auctionId, value: { endTime, item_name }
        lastRefresh: 0
    };

    const refreshCache = async () => {
        console.log('auction refresh')
        const auctions = await Auction.findAll();
        const now = moment().tz('Asia/Kolkata');

        cache.auctions.clear();

        for (const auction of auctions) {
            const goLiveTime = moment(auction.go_live_time).tz('Asia/Kolkata');
            const endTime = moment(goLiveTime).add(parseDuration(auction.duration));

            // Only cache active auctions
            if (now.isBefore(endTime)) {
                cache.auctions.set(auction.id.toString(), {
                    endTime,
                    item_name: auction.item_name
                });
            }
        }

        cache.lastRefresh = Date.now();
    };

    const checkAuctionEnd = async () => {
        console.log('auction check')
        const now = moment().tz('Asia/Kolkata');
        const endedIds = [];

        for (const [id, auction] of cache.auctions.entries()) {
            if (now.isSameOrAfter(auction.endTime)) {
                await broadcastToAuction(id, {
                    type: 'auction_ended',
                    auctionId: id,
                    message: `Auction "${auction.item_name}" has ended at ${now.format('YYYY-MM-DD HH:mm:ss')}.`,
                });
                endedIds.push(id);
            }
        }

        // Remove ended auctions from cache so we don’t check them again
        for (const id of endedIds) {
            cache.auctions.delete(id);
        }
    };

    // Initial load
    (async () => {
        await refreshCache();

        // Check every 100 second for end times
        setInterval(checkAuctionEnd, 100000);

        // Refresh cache every 300 seconds to get new auctions
        setInterval(refreshCache, 300000);
    })();

    return { broadcastToAuction, parseDuration };
}

module.exports = initWebSocket;