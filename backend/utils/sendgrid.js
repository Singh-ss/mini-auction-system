const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const senderEmail = 'subhanshusingh3680@gmail.com';

const sendAuctionConfirmationEmail = async (to, auction) => {
    const msg = {
        to,
        from: senderEmail,
        subject: 'Auction Created Successfully',
        text: `Your auction "${auction.item_name}" has been created!\nStarting Price: ₹${auction.starting_price}\nGo Live: ${auction.go_live_time}\nDuration: ${auction.duration}`,
        html: `<p>Your auction <strong>${auction.item_name}</strong> has been created!</p><p>Starting Price: ₹${auction.starting_price}</p><p>Go Live: ${auction.go_live_time}</p><p>Duration: ${auction.duration}</p>`,
    };
    await sgMail.send(msg);
};

const sendWelcomeEmail = async (to, username) => {
    const msg = {
        to,
        from: senderEmail,
        subject: 'Welcome to Auction App!',
        text: `Welcome, ${username}!\nYour account has been created successfully. Start creating auctions now!`,
        html: `<p>Welcome, <strong>${username}</strong>!</p><p>Your account has been created successfully. Start creating auctions now!</p>`,
    };
    await sgMail.send(msg);
};

const sendAuctionEditConfirmationEmail = async (to, auction) => {
    const msg = {
        to,
        from: senderEmail,
        subject: 'Auction Updated Successfully',
        text: `Your auction "${auction.item_name}" has been updated!\nStarting Price: ₹${auction.starting_price}\nGo Live: ${auction.go_live_time}\nDuration: ${auction.duration}`,
        html: `<p>Your auction <strong>${auction.item_name}</strong> has been updated!</p><p>Starting Price: ₹${auction.starting_price}</p><p>Go Live: ${auction.go_live_time}</p><p>Duration: ${auction.duration}</p>`,
    };
    await sgMail.send(msg);
};

const sendAuctionDeleteConfirmationEmail = async (to, item_name) => {
    const msg = {
        to,
        from: senderEmail,
        subject: 'Auction Deleted Successfully',
        text: `Your auction "${item_name}" has been deleted.`,
        html: `<p>Your auction <strong>${item_name}</strong> has been deleted.</p>`,
    };
    await sgMail.send(msg);
};

module.exports = {
    sendAuctionConfirmationEmail,
    sendWelcomeEmail,
    sendAuctionEditConfirmationEmail,
    sendAuctionDeleteConfirmationEmail
};