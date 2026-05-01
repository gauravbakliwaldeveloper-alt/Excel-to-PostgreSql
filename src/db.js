const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Initialize database schema
const initDB = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS golf_scores (
      id SERIAL PRIMARY KEY,
      ticket_id VARCHAR(100),
      customer_name VARCHAR(255),
      sentiment VARCHAR(100),
      csat_score INTEGER,
      call_timestamp TIMESTAMP,
      reason TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      channel VARCHAR(100),
      response_time VARCHAR(100),
      call_duration INTEGER,
      call_center VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Database table golf_scores (Call Center format) ensured.');
  } catch (err) {
    console.error('Error creating table', err);
    process.exit(1);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  initDB,
  pool
};
