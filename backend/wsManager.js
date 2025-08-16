let broadcastToAuctionFn = null;
let broadcastToUserFn = null;

module.exports = {
    setBroadcastFn(fn) {
        broadcastToAuctionFn = fn;
    },
    setBroadcastToUserFn(fn) {
        broadcastToUserFn = fn;
    },
    broadcastToAuction(auctionId, message) {
        if (typeof broadcastToAuctionFn !== 'function') {
            throw new Error('WebSocket not initialized yet.');
        }
        return broadcastToAuctionFn(auctionId, message);
    },
    broadcastToUser(userId, message) {
        if (typeof broadcastToUserFn !== 'function') {
            throw new Error('User notification WebSocket not initialized yet.');
        }
        return broadcastToUserFn(userId, message);
    }
};