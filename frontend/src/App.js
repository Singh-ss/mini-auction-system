import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabase';
import CreateAuction from './components/CreateAuction';
import Auth from './components/Auth';
import AuctionList from './components/AuctionList';
import EditAuction from './components/EditAuction';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setToken(session?.access_token || null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold">Auction App</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              <nav>
                <Link to="/auctions" className="text-white hover:underline">All Auctions</Link>
                <Link to="/auctions/create" className="ml-4 text-white hover:underline">Create Auction</Link>
              </nav>
              <div>
                <span>Welcome, {user.email}</span>
                <button onClick={handleSignOut} className="ml-4 p-2 bg-red-500 rounded">
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <Link to="/auth" className="p-2 bg-green-500 rounded text-white">Sign In</Link>
          )}
        </header>
        <Routes>
          {user ? (
            <>
              <Route path="/auctions" element={<AuctionList token={token} userId={user?.id} />} />
              <Route path="/auctions/create" element={<CreateAuction token={token} />} />
              <Route path="/auctions/edit/:id" element={<EditAuction token={token} />} />
              <Route path="*" element={<AuctionList token={token} userId={user?.id} />} />
            </>
          ) : (
            <Route path="/auth" element={<Auth setUser={setUser} setToken={setToken} />} />
          )}
          <Route path="*" element={<Auth setUser={setUser} setToken={setToken} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;