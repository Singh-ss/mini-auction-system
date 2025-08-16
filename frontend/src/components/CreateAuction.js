import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import moment from 'moment-timezone';

const CreateAuction = ({ token }) => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        item_name: '',
        description: '',
        starting_price: '',
        bid_increment: '',
        go_live_time: moment().tz('Asia/Kolkata').format('YYYY-MM-DDTHH:mm'),
        duration: '',
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await axios.post(`${process.env.REACT_APP_API_URL}/api/auctions`, formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setSuccess('Auction created successfully!');
            setTimeout(() => navigate('/auctions'), 1000);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    return (
        <div className="max-w-lg mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Create Auction</h2>
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
                    Create Auction
                </button>
            </form>
        </div>
    );
};

export default CreateAuction;