import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import CreateAuction from './components/CreateAuction';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="p-4 bg-blue-600 text-white">
        <h1 className="text-xl font-bold">Auction App</h1>
        {user ? (
          <div>
            <span>Welcome, {user.email}</span>
            <button onClick={handleSignOut} className="ml-4 p-2 bg-red-500 rounded">
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={handleSignIn} className="p-2 bg-green-500 rounded">
            Sign In with Google
          </button>
        )}
      </header>
      {user && <CreateAuction />}
    </div>
  );
}

export default App;