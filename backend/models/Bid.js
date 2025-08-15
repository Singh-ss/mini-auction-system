const { DataTypes } = require('sequelize');
const sequelize = require('../database/connection');
const Auction = require('./Auction');
const User = require('./User');

const Bid = sequelize.define('Bid', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    auction_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    bid_amount: {
        type: DataTypes.DECIMAL,
        allowNull: false,
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'bids',
    timestamps: true,
    updatedAt: false,
});

Bid.belongsTo(Auction, { foreignKey: 'auction_id' });
Bid.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Bid;