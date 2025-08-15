const WebSocket = require('ws');

const initWebSocket = (server) => {
    const wss = new WebSocket.Server({ server });
    wss.on('connection', (ws) => {
        console.log('WebSocket client connected');
        ws.on('message', (message) => {
            console.log('Received:', message);
        });
    });
};

module.exports = initWebSocket;