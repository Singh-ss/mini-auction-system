const express = require('express');
const { signup, login } = require('../services/authService');
const router = express.Router();

router.post('/signup', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const user = await signup({ email, password, username });
        res.status(201).json({ user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const { user, token } = await login({ email, password });
        res.json({ user, token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;