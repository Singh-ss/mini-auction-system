import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-timezone';

const AuctionList = ({ token, userId }) => {
    const navigate = useNavigate();
    const [auctions, setAuctions] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAuctions = async () => {
            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/auctions`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setAuctions(response.data);
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.error || err.message);
                setLoading(false);
            }
        };

        fetchAuctions();
    }, [token]);

    const handleDelete = async (auctionId, item_name) => {
        if (window.confirm(`Are you sure you want to delete "${item_name}"?`)) {
            try {
                await axios.delete(`${process.env.REACT_APP_API_URL}/api/auctions/${auctionId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                setAuctions(auctions.filter((auction) => auction.id !== auctionId));
            } catch (err) {
                setError(err.response?.data?.error || err.message);
            }
        }
    };

    if (loading) return <p className="text-center">Loading auctions...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">All Auctions</h2>
            {auctions.length === 0 ? (
                <p className="text-center">No auctions available.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {auctions.map((auction) => (
                        <div key={auction.id} className="border p-4 rounded shadow">
                            <h3 className="text-xl font-semibold">{auction.item_name}</h3>
                            <p className="text-gray-600">{auction.description || 'No description'}</p>
                            <p><strong>Starting Price:</strong> ₹{auction.starting_price}</p>
                            <p><strong>Bid Increment:</strong> ₹{auction.bid_increment}</p>
                            <p><strong>Go Live (IST):</strong> {moment(auction.go_live_time).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')}</p>
                            <p><strong>Duration:</strong> {auction.duration.hours} hour(s)</p>
                            <p><strong>Created By:</strong> {auction.User?.username || 'Unknown'}</p>
                            <p><strong>Created At (IST):</strong> {moment(auction.created_at).tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss')}</p>
                            <div className="mt-4 flex space-x-2">
                                <button
                                    onClick={() => navigate(`/auctions/${auction.id}`)}
                                    className="p-2 bg-blue-500 text-white rounded"
                                >
                                    View Auction
                                </button>
                                {auction.user_id === userId && (
                                    <>
                                        <button
                                            onClick={() => navigate(`/auctions/edit/${auction.id}`)}
                                            className="p-2 bg-yellow-500 text-white rounded"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(auction.id, auction.item_name)}
                                            className="p-2 bg-red-500 text-white rounded"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuctionList;