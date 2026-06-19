require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/anomalies', require('./routes/anomalies'));
app.use('/api/base-data', require('./routes/base_data'));
app.use('/api/export', require('./routes/export'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/flow', require('./routes/flow'));
app.use('/api/users', require('./routes/users'));
app.use('/api/system', require('./routes/system'));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`总装异常管理系统服务已启动: http://0.0.0.0:${PORT}`);
});
