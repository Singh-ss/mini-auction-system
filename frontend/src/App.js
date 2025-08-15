import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import CreateAuction from './components/CreateAuction';
import Auth from './components/Auth';
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
    <div className="min-h-screen bg-gray-100">
      <header className="p-4 bg-blue-600 text-white flex justify-between items-center">
        <h1 className="text-xl font-bold">Auction App</h1>
        {user && (
          <div>
            <span>Welcome, {user.email}</span>
            <button onClick={handleSignOut} className="ml-4 p-2 bg-red-500 rounded">
              Sign Out
            </button>
          </div>
        )}
      </header>
      {user ? <CreateAuction token={token} /> : <Auth setUser={setUser} setToken={setToken} />}
    </div>
  );
}

export default App;