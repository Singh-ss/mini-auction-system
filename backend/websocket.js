const { WebSocketServer } = require('ws');
const redis = require('./utils/redis');

function initWebSocket(server) {
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws, req) => {
        const auctionId = req.url.split('/').pop(); // Extract auctionId from URL (e.g., /auctions/1)

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            if (data.type === 'join') {
                ws.auctionId = auctionId; // Store auctionId on the socket
            }
        });

        ws.on('close', () => {
            // Cleanup if needed
        });
    });

    // Function to broadcast updates to all clients in an auction room
    const broadcastToAuction = async (auctionId, message) => {
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN && client.auctionId === auctionId) {
                client.send(JSON.stringify(message));
            }
        });
    };

    // Function to check and broadcast auction end
    const checkAuctionEnd = async (auction) => {
        const endTime = new Date(new Date(auction.go_live_time).getTime() + parseDuration(auction.duration));
        if (new Date() >= endTime) {
            await broadcastToAuction(auction.id.toString(), {
                type: 'auction_ended',
                auctionId: auction.id,
                message: `Auction "${auction.item_name}" has ended.`,
            });
        }
    };

    // Parse duration (e.g., "1 hour" to milliseconds)
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

    // Periodically check active auctions
    setInterval(async () => {
        const auctions = await require('./models/Auction').findAll();
        for (const auction of auctions) {
            await checkAuctionEnd(auction);
        }
    }, 1000000); // Check every second

    return { broadcastToAuction, parseDuration };
}

module.exports = initWebSocket;