const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// Ensure DB is initialized
require('./db');

const { router: authRouter } = require('./routes/auth');
const eventRouter = require('./routes/event');
const participantsRouter = require('./routes/participants');
const settingsRouter = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Static uploads folder
const uploadsPath = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/event', eventRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend build if present
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // SPA Catch-all fallback
  app.use((req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`Server Presensi & Registrasi Aktif!`);
  console.log(`URL Backend: http://localhost:${PORT}`);
  console.log(`Default Admin: admin / admin123`);
  console.log(`Default Panitia: panitia / panitia123`);
  console.log(`=========================================`);
});
