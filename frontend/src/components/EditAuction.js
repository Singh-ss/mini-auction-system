import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import formatDuration from '../utils/formatDuration';
import moment from 'moment-timezone';

const EditAuction = ({ token }) => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        item_name: '',
        description: '',
        starting_price: '',
        bid_increment: '',
        go_live_time: '',
        duration: '',
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAuction = async () => {
            try {
                const response = await axios.get(`http://localhost:4000/auctions`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const auction = response.data.find((a) => a.id === parseInt(id));
                if (!auction) {
                    throw new Error('Auction not found');
                }
                setFormData({
                    item_name: auction.item_name,
                    description: auction.description || '',
                    starting_price: auction.starting_price,
                    bid_increment: auction.bid_increment,
                    go_live_time: moment(auction.go_live_time).tz('Asia/Kolkata').format('YYYY-MM-DDTHH:mm'),
                    duration: formatDuration(auction.duration),
                });
                setLoading(false);
            } catch (err) {
                setError(err.response?.data?.error || err.message);
                setLoading(false);
            }
        };

        fetchAuction();
    }, [id, token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await axios.put(`http://localhost:4000/auctions/${id}`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSuccess('Auction updated successfully!');
            setTimeout(() => navigate('/auctions'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    if (loading) return <p className="text-center">Loading auction...</p>;
    if (error) return <p className="text-red-500 text-center">{error}</p>;

    return (
        <div className="max-w-lg mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Edit Auction</h2>
            {error && <p className="text-red-500">{error}</p>}
            {success && <p className="text-green-500">{success}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium">Item Name</label>
                    <input
                        type="text"
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Starting Price</label>
                    <input
                        type="number"
                        name="starting_price"
                        value={formData.starting_price}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Bid Increment</label>
                    <input
                        type="number"
                        name="bid_increment"
                        value={formData.bid_increment}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        step="0.01"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Go Live Time (IST)</label>
                    <input
                        type="datetime-local"
                        name="go_live_time"
                        value={formData.go_live_time}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Duration (e.g., '1 hour')</label>
                    <input
                        type="text"
                        name="duration"
                        value={formData.duration}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
                    Update Auction
                </button>
            </form>
        </div>
    );
};

export default EditAuction;