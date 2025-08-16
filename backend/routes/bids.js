const express = require('express');
const authenticate = require('../middleware/auth');
const { placeBid } = require('../services/bidService');
const router = express.Router();

router.post('/:id/bids', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        let { bid_amount } = req.body;
        bid_amount = Number(bid_amount);
        if (!bid_amount || bid_amount <= 0) {
            return res.status(400).json({ error: 'Invalid bid amount' });
        }
        const bid = await placeBid(id, req.user.id, bid_amount);
        res.status(201).json(bid);
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;