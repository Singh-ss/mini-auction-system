import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-timezone';

const AuctionRoom = ({ token, userId }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [auction, setAuction] = useState(null);
    // const [currentBid, setCurrentBid] = useState(null);
    const [bidAmount, setBidAmount] = useState('');
    const [error, setError] = useState(null);
    // const [notifications, setNotifications] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [auctionStatus, setAuctionStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const fetched = useRef(false);

    // Fetch auction details only once
    useEffect(() => {
        if (fetched.current) return;
        fetched.current = true;

        const fetchAuction = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auctions/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const auctionData = response.data;
                setAuction(auctionData);
                // setCurrentBid(Number(auctionData.current_price || auctionData.starting_price));
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
        const websocket = new WebSocket(`process.env.REACT_APP_WS_URL/auctions/${id}`);
        websocket.onopen = () => {
            websocket.send(JSON.stringify({ type: 'join', auctionId: id }));
        };
        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'new_bid') {
                // setCurrentBid(Number(data.bid_amount));
                setAuction(prev => ({
                    ...prev,
                    current_price: data.bid_amount,
                    winner_id: data.bidder_id,
                    winner_name: data.bidder_username,
                    bids: [...(prev.bids || []), {
                        bidder: data.bidder_id,
                        bidderName: data.bidder_username,
                        bidAmount: data.bid_amount,
                        bidTime: moment().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')
                    }]
                }));
            } else if (data.type === 'auction_ended') {
                // setNotifications((prev) => [...prev, data.message]);
                setTimeLeft(0);
                setAuction(prev => ({ ...prev, is_sold: true }));
                setAuctionStatus('Ended');
            }
        };
        websocket.onclose = () => {
            // setError('WebSocket connection closed');
        };

        return () => {
            console.log('closing websocket');
            websocket.close();
        };
    }, [id]);

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
            setAuctionStatus(status);
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
                `${process.env.REACT_APP_API_URL}/api/bids/${id}/bids`,
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
            <p><strong>Current Price:</strong> ₹{Number(auction.current_price || auction.starting_price).toFixed(2)}</p>
            <p><strong>Bid Increment:</strong> ₹{auction.bid_increment}</p>
            <p><strong>Auction Status:</strong> {auction.is_sold ? 'Sold' : auctionStatus}</p>
            <p><strong>Time Left (IST):</strong> {formatTimeLeft(timeLeft)}</p>
            <p><strong>Created By:</strong> {auction.User?.username || 'Unknown'}</p>
            {auction.winner_id && <p><strong>Winner:</strong> {auction.winner_name}</p>}
            {timeLeft > 0 && !auction.is_sold && (
                <form onSubmit={handleBid} className="mt-4 space-y-2">
                    <input
                        type="number"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={`Enter bid (min ₹${(Number(auction.current_price || auction.starting_price) + Number(auction.bid_increment)).toFixed(2)})`}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full p-2 bg-blue-500 text-white rounded"
                        disabled={timeLeft <= 0 || auction.is_sold}
                    >
                        Place Bid
                    </button>
                </form>
            )}
            {/* <div className="mt-4">
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
            </div> */}
            <div className="mt-4">
                <h3 className="text-lg font-semibold">Bids</h3>
                {auction.bids.length === 0 ? (
                    <p>No bids yet</p>
                ) : (
                    <ul className="list-disc pl-5">
                        {auction.bids
                            .slice()
                            .reverse()
                            .map((bid, index) => (
                                <li key={index} className="text-sm text-gray-700">
                                    ₹{bid.bidAmount} by {bid.bidderName || bid.bidder} at {bid.bidTime}
                                </li>
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