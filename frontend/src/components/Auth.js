import React, { useState } from 'react';
import { supabase } from '../supabase';
import axios from 'axios';

const Auth = ({ setUser, setToken }) => {
    const [isSignUp, setIsSignUp] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        username: '',
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
            if (isSignUp) {
                const response = await axios.post('process.env.REACT_APP_API_URL/signup', formData);
                setSuccess('Sign-up successful! Please check your email.');
            } else {
                const { data: { user, session }, error } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
                if (error) throw error;
                setUser(user);
                setToken(session.access_token);
                setSuccess('Login successful!');
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="max-w-md mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">{isSignUp ? 'Sign Up' : 'Login'}</h2>
            {error && <p className="text-red-500">{error}</p>}
            {success && <p className="text-green-500">{success}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                    <div>
                        <label className="block text-sm font-medium">Username</label>
                        <input
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required={isSignUp}
                        />
                    </div>
                )}
                <div>
                    <label className="block text-sm font-medium">Email</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Password</label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-2 border rounded"
                        required
                    />
                </div>
                <button type="submit" className="w-full p-2 bg-blue-500 text-white rounded">
                    {isSignUp ? 'Sign Up' : 'Login'}
                </button>
            </form>
            <p className="mt-4 text-center">
                {isSignUp ? 'Already have an account?' : 'Need an account?'}
                <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="ml-2 text-blue-500 underline"
                >
                    {isSignUp ? 'Login' : 'Sign Up'}
                </button>
            </p>
        </div>
    );
};

export default Auth;