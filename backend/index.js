const express = require('express');
const http = require('http');
const cors = require('cors');
const initWebSocket = require('./websocket');
const sequelize = require('./config/sequelize');
const authRoutes = require('./routes/auth');
const auctionRoutes = require('./routes/auctions');
const bidRoutes = require('./routes/bids');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/auctions', auctionRoutes);
app.use('/bids', bidRoutes);

// Initialize WebSocket
initWebSocket(server);

// Sync database and start server
sequelize.sync({ force: false }).then(() => {
    console.log('Database synced!');
    const PORT = process.env.PORT;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});