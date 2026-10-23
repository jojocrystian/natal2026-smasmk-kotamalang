import React, { useState, useEffect } from 'react';
import PanitiaNavbar from '../components/PanitiaNavbar';
import PanitiaDashboard from './PanitiaDashboard';
import PanitiaLoginPage from './PanitiaLoginPage';
import { getCurrentUser } from '../utils/api';

export default function PanitiaPortal() {
  const [user, setUser] = useState(() => getCurrentUser());

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    setUser(null);
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
  };

  if (!user) {
    return <PanitiaLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <PanitiaNavbar onLogout={handleLogout} />
      <div className="flex-1">
        <PanitiaDashboard />
      </div>
    </div>
  );
}
