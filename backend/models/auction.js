const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');

const Auction = sequelize.define('Auction', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    item_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    starting_price: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    bid_increment: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    go_live_time: {
        type: DataTypes.DATE,
        allowNull: false,
    },
    duration: {
        type: DataTypes.STRING, // Store interval as string (e.g., '1 hour')
        allowNull: false,
    },
}, {
    tableName: 'auctions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
});

module.exports = Auction;