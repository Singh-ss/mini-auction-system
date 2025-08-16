const express = require('express');
const authenticate = require('../middleware/auth');
const { createAuction, getAllAuctions, getAuctionById, updateAuction, deleteAuction } = require('../services/auctionService');
const router = express.Router();

router.post('/', authenticate, async (req, res) => {
    try {
        const { item_name, description, starting_price, bid_increment, go_live_time, duration } = req.body;
        if (!item_name || !starting_price || !bid_increment || !go_live_time || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starting_price <= 0 || bid_increment <= 0) {
            return res.status(400).json({ error: 'Invalid price or increment' });
        }
        const auction = await createAuction(req.user, req.body);
        res.status(201).json(auction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/', authenticate, async (req, res) => {
    try {
        const auctions = await getAllAuctions();
        res.json(auctions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', authenticate, async (req, res) => {
    try {
        const auction = await getAuctionById(req.params.id);
        if (!auction) {
            return res.status(404).json({ error: 'Auction not found' });
        }
        res.json(auction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, description, starting_price, bid_increment, go_live_time, duration } = req.body;
        if (!item_name || !starting_price || !bid_increment || !go_live_time || !duration) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (starting_price <= 0 || bid_increment <= 0) {
            return res.status(400).json({ error: 'Invalid price or increment' });
        }
        const auction = await updateAuction(id, req.user.id, req.body);
        if (!auction) {
            return res.status(403).json({ error: 'Auction not found or you are not the creator' });
        }
        res.json(auction);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteAuction(id, req.user.id);
        if (!result) {
            return res.status(403).json({ error: 'Auction not found or you are not the creator' });
        }
        res.json({ message: 'Auction deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;