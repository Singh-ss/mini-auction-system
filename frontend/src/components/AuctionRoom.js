import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-timezone';

const AuctionRoom = ({ token, userId }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [auction, setAuction] = useState(null);
    const [currentBid, setCurrentBid] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [error, setError] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [auctionStatus, setAuctionStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch auction details
    useEffect(() => {
        const fetchAuction = async () => {
            try {
                const response = await axios.get('http://localhost:4000/auctions', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const auctionData = response.data.find((a) => a.id === parseInt(id));
                if (!auctionData) {
                    throw new Error('Auction not found');
                }
                setAuction(auctionData);
                setCurrentBid(Number(auctionData.starting_price));
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.error || err.message);
                setLoading(false);
            }
        };

        fetchAuction();
    }, [id, token, userId]);

    // WebSocket for real-time updates
    useEffect(() => {
        const websocket = new WebSocket(`ws://localhost:4000/auctions/${id}`);
        websocket.onopen = () => {
            websocket.send(JSON.stringify({ type: 'join', auctionId: id }));
        };
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_bid') {
                setCurrentBid(Number(data.bid_amount));
            } else if (data.type === 'notification' && data.recipient_id === userId) {
                setNotifications((prev) => [...prev, data.message]);
            } else if (data.type === 'auction_ended') {
                setNotifications((prev) => [...prev, data.message]);
                setTimeLeft(0);
            }
        };
        websocket.onclose = () => {
            setError('WebSocket connection closed');
        };

        // return () => websocket.close();
    }, [id, userId]); // Dependencies: id, userId

    // Countdown timer
    useEffect(() => {
        if (!auction) return;

        const updateCountdown = () => {
            const goLiveTime = moment(auction.go_live_time).tz('Asia/Kolkata');
            const endTime = moment(goLiveTime).add(parseDuration(auction.duration));
            const now = moment().tz('Asia/Kolkata');

            let timeDiff;
            let status;

            if (now.isBefore(goLiveTime)) {
                // Auction hasn't started yet
                timeDiff = goLiveTime.diff(now);
                status = "Not Started";
            } else if (now.isBetween(goLiveTime, endTime)) {
                // Auction is running
                timeDiff = endTime.diff(now);
                status = "Running";
            } else {
                // Auction ended
                timeDiff = 0;
                status = "Ended";
            }

            setTimeLeft(timeDiff > 0 ? timeDiff : 0);
            setAuctionStatus(status); // You'll need to create this state
        };


        updateCountdown();
        const timer = setInterval(updateCountdown, 1000);
        return () => clearInterval(timer);
    }, [auction]);

    const parseDuration = (durationObj) => {
        if (!durationObj || typeof durationObj !== 'object') return 0;

        const {
            years = 0,
            months = 0,
            days = 0,
            hours = 0,
            minutes = 0,
            seconds = 0
        } = durationObj;

        const msFromYears = years * 365.25 * 24 * 60 * 60 * 1000;
        const msFromMonths = months * 30.44 * 24 * 60 * 60 * 1000;
        const msFromDays = days * 24 * 60 * 60 * 1000;
        const msFromHours = hours * 60 * 60 * 1000;
        const msFromMinutes = minutes * 60 * 1000;
        const msFromSeconds = seconds * 1000;

        return (
            msFromYears +
            msFromMonths +
            msFromDays +
            msFromHours +
            msFromMinutes +
            msFromSeconds
        );
    };

    const formatTimeLeft = (ms) => {
        if (ms <= 0) return 'Auction Ended';
        const seconds = Math.floor((ms / 1000) % 60);
        const minutes = Math.floor((ms / (1000 * 60)) % 60);
        const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
        const days = Math.floor((ms / (1000 * 60 * 60 * 24)) % 30);
        const months = Math.floor((ms / (1000 * 60 * 60 * 24 * 30)) % 12);
        const years = Math.floor(ms / (1000 * 60 * 60 * 24 * 365));

        let parts = [];
        if (years) parts.push(`${years}y`);
        if (months) parts.push(`${months}mo`);
        if (days) parts.push(`${days}d`);
        if (hours) parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        if (seconds || parts.length === 0) parts.push(`${seconds}s`);

        return parts.join(' ');
    };

    const handleBid = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await axios.post(
                `http://localhost:4000/auctions/${id}/bids`,
                { bid_amount: parseFloat(bidAmount) },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBidAmount('');
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    if (loading) return <p className="text-center">Loading auction...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;

    return (
        <div className="max-w-lg mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{auction.item_name}</h2>
            <p className="text-gray-600">{auction.description || 'No description'}</p>
            <p><strong>Starting Price:</strong> ₹{auction.starting_price}</p>
            <p><strong>Current Highest Bid:</strong> ₹{Number(currentBid).toFixed(2)}</p>
            <p><strong>Bid Increment:</strong> ₹{auction.bid_increment}</p>
            <p><strong>Auction Status:</strong> {auctionStatus}</p>
            <p><strong>Time Left (IST):</strong> {formatTimeLeft(timeLeft)}</p>

            <p><strong>Created By:</strong> {auction.User?.username || 'Unknown'}</p>
            {timeLeft > 0 && (
                <form onSubmit={handleBid} className="mt-4 space-y-2">
                    <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Enter bid (min ₹${(Number(currentBid) + Number(auction.bid_increment)).toFixed(2)})`}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full p-2 bg-blue-500 text-white rounded"
                        disabled={timeLeft <= 0}
                    >
                        Place Bid
                    </button>
                </form>
            )}
            <div className="mt-4">
                <h3 className="text-lg font-semibold">Notifications</h3>
                {notifications.length === 0 ? (
                    <p>No notifications</p>
                ) : (
                    <ul className="list-disc pl-5">
                        {notifications.map((msg, index) => (
                            <li key={index} className="text-sm text-gray-700">{msg}</li>
                        ))}
                    </ul>
                )}
            </div>
            <button
                onClick={() => navigate('/auctions')}
                className="mt-4 p-2 bg-gray-500 text-white rounded"
            >
                Back to Auctions
            </button>
        </div>
    );
};

export default AuctionRoom;