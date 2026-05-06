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
    CREATE TABLE IF NOT EXISTS golf_resorts (
      id SERIAL PRIMARY KEY,
      state VARCHAR(10),
      resort_name TEXT,
      slug TEXT UNIQUE,
      city VARCHAR(100),
      image_url TEXT,
      stay_play_from VARCHAR(50),
      resort_tier VARCHAR(50),
      category_tags TEXT,
      holes_count INT,
      courses_count INT,
      course_difficulty VARCHAR(50),
      handicap_recommendation VARCHAR(100),
      beginner_friendly BOOLEAN,
      group_size_fit VARCHAR(50),
      trip_type_primary VARCHAR(100),
      best_season VARCHAR(50),
      weather_badge VARCHAR(50),
      season_insight TEXT,
      ui_badges TEXT,
      onsite_golf_strength VARCHAR(50),
      stay_play_complexity VARCHAR(50),
      "18stays_take" TEXT,
      golf_trip_score FLOAT,
      buddy_trip_score FLOAT,
      luxury_score FLOAT,
      value_score FLOAT,
      beginner_score FLOAT,
      advanced_golfer_score FLOAT,
      data_confidence FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log('Database table golf_resorts ensured.');
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
