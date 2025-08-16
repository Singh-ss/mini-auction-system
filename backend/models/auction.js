const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const User = require('./User');

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
        allowNull: true,
    },
    starting_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    current_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
    },
    bid_increment: {
        type: DataTypes.DECIMAL(10, 2),
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
    bids: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
    },
    winner_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: 'id',
        },
        defaultValue: null,
    },
    is_sold: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'auctions',
    timestamps: false,
});

Auction.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Auction;