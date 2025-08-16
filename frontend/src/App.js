import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { supabase } from './supabase';
import CreateAuction from './components/CreateAuction';
import Auth from './components/Auth';
import AuctionList from './components/AuctionList';
import EditAuction from './components/EditAuction';
import AuctionRoom from './components/AuctionRoom';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      setToken(session?.access_token || null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // WebSocket for global notifications
  useEffect(() => {
    if (!user) return;

    const websocket = new WebSocket(`process.env.REACT_APP_WS_URL/notifications`);
    websocket.onopen = () => {
      websocket.send(JSON.stringify({ type: 'join', userId: user.id }));
    };
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification' && data.recipient_id === user.id) {
        setNotifications((prev) => [...prev, { message: data.message, id: Date.now() }]);
      }
    };
    websocket.onclose = () => {
      // console.log('Notification WebSocket closed');
    };

    return () => websocket.close();
  }, [user]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setToken(null);
    setNotifications([]);
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <header className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h1 className="text-xl font-bold">Auction App</h1>
          {user ? (
            <div className="flex items-center space-x-4">
              <nav className="flex items-center space-x-4">
                <Link to="/auctions" className="text-white hover:underline">All Auctions</Link>
                <Link to="/auctions/create" className="text-white hover:underline">Create Auction</Link>
              </nav>
              <div className="relative">
                <button onClick={toggleNotifications} className="relative focus:outline-none">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                      {notifications.length}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10">
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-800">Notifications</h3>
                      {notifications.length === 0 ? (
                        <p className="text-gray-600">No notifications</p>
                      ) : (
                        <ul className="mt-2 space-y-2">
                          {notifications.map((notification) => (
                            <li key={notification.id} className="text-sm text-gray-700">{notification.message}</li>
                          ))}
                        </ul>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="mt-2 w-full p-2 bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
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
              <Route path="/auctions/:id" element={<AuctionRoom token={token} userId={user?.id} />} />
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