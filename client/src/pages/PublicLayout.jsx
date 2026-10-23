import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <PublicNavbar />
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
}
