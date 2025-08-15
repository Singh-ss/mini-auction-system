const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendAuctionConfirmationEmail = async (to, auction) => {
    const msg = {
        to,
        from: 'your-verified-email@example.com', // Replace with your verified SendGrid sender
        subject: 'Auction Created Successfully',
        text: `Your auction "${auction.item_name}" has been created!\nStarting Price: $${auction.starting_price}\nGo Live: ${auction.go_live_time}\nDuration: ${auction.duration}`,
        html: `<p>Your auction <strong>${auction.item_name}</strong> has been created!</p><p>Starting Price: $${auction.starting_price}</p><p>Go Live: ${auction.go_live_time}</p><p>Duration: ${auction.duration}</p>`,
    };
    await sgMail.send(msg);
};

module.exports = { sendAuctionConfirmationEmail };