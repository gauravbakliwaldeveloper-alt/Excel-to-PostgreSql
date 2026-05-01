const express = require('express');
const dotenv = require('dotenv');
const db = require('./db');
const uploadRoute = require('./routes/upload');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Initialize Database Table
db.initDB();

// Routes
app.use('/upload', uploadRoute);

// Global Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
