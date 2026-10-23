import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './pages/PublicLayout';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import PanitiaPortal from './pages/PanitiaPortal';
import AdminPortal from './pages/AdminPortal';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Portal Publik / Peserta (Landing Page & Form Pendaftaran) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/daftar" element={<RegisterPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* 2. Portal Panitia Presensi (Terpisah Total) */}
        <Route path="/panitia" element={<PanitiaPortal />} />
        <Route path="/panitia/*" element={<PanitiaPortal />} />

        {/* 3. Portal Super Administrator (Terpisah Total) */}
        <Route path="/admin" element={<AdminPortal />} />
        <Route path="/admin/*" element={<AdminPortal />} />

        {/* Fallback jika route tidak dikenal */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
