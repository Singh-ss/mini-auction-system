const Redis = require('ioredis');
require('dotenv').config();

// const redis = new Redis({
//     host: process.env.UPSTASH_REDIS_URL,
//     password: process.env.UPSTASH_REDIS_TOKEN,
//     tls: {},
// });
const client = new Redis(process.env.REDIS_URL);

module.exports = client;