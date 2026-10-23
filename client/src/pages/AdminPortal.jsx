import React, { useState, useEffect } from 'react';
import AdminNavbar from '../components/AdminNavbar';
import AdminDashboard from './AdminDashboard';
import AdminLoginPage from './AdminLoginPage';
import { getCurrentUser } from '../utils/api';

export default function AdminPortal() {
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

  if (!user || user.role !== 'admin') {
    return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-purple-500 selection:text-white">
      <AdminNavbar onLogout={handleLogout} />
      <div className="flex-1">
        <AdminDashboard />
      </div>
    </div>
  );
}
