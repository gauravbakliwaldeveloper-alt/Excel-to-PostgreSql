const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const db = require('../db');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, Date.now() + '-' + file.originalname),
});

const upload = multer({ storage });
const uploadMiddleware = upload.single('file');

// ================= ROUTE =================
router.post('/', (req, res) => {
  uploadMiddleware(req, res, async function (err) {
    if (err) return res.status(400).json({ success: false, error: err.message });
    if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    try {
      const workbook = xlsx.readFile(req.file.path, { cellDates: true });

      const sheetName = "All State Golf Intel Master-Exp";
      const sheet = workbook.Sheets[sheetName];

      if (!sheet) {
        return res.status(400).json({
          success: false,
          error: `Sheet not found. Available: ${workbook.SheetNames.join(", ")}`
        });
      }

      console.log(`--- DEBUG: Using Sheet: ${sheetName} ---`);

      // ================= 🔥 HEADER FIX =================
      let rawData = [];
      let headerRowIndex = -1;

      for (let i = 0; i < 10; i++) {
        const temp = xlsx.utils.sheet_to_json(sheet, {
          range: i,
          defval: ""
        });

        if (!temp.length) continue;

        const keys = Object.keys(temp[0]).map(k => k.toLowerCase());

        console.log(`👉 Checking row ${i + 1}:`, keys);

        if (
          keys.includes("state") &&
          keys.includes("slug") &&
          keys.includes("city")
        ) {
          console.log(`✅ HEADER FOUND AT ROW: ${i + 1}`);
          rawData = temp;
          headerRowIndex = i;
          break;
        }
      }

      if (!rawData.length) {
        return res.status(400).json({
          success: false,
          error: "Header row not found"
        });
      }

      console.log("HEADERS:", Object.keys(rawData[0]));

      // ================= SMART MAPPING =================
      const findValue = (obj, keyword) => {
        const key = Object.keys(obj).find(k =>
          k.toLowerCase().includes(keyword)
        );
        return key ? obj[key] : null;
      };

      let insertedCount = 0;
      const errors = [];

      for (const [index, row] of rawData.entries()) {

        const resortData = {
          state: findValue(row, "state"),
          resort_name: findValue(row, "resort"),
          slug: findValue(row, "slug"),
          city: findValue(row, "city"),
          image_url: findValue(row, "image"),
          stay_play_from: findValue(row, "stay"),
          resort_tier: findValue(row, "tier"),
          category_tags: findValue(row, "category"),
          holes_count: findValue(row, "holes"),
          courses_count: findValue(row, "courses"),
          course_difficulty: findValue(row, "difficulty"),
          handicap_recommendation: findValue(row, "handicap"),
          beginner_friendly: findValue(row, "beginner"),
          group_size_fit: findValue(row, "group"),
          trip_type_primary: findValue(row, "trip"),
          best_season: findValue(row, "season"),
          weather_badge: findValue(row, "weather"),
          season_insight: findValue(row, "insight"),
          ui_badges: findValue(row, "badge"),
          onsite_golf_strength: findValue(row, "strength"),
          stay_play_complexity: findValue(row, "complexity"),
          "18stays_take": findValue(row, "18stays"),
          golf_trip_score: findValue(row, "golf"),
          buddy_trip_score: findValue(row, "buddy"),
          luxury_score: findValue(row, "luxury"),
          value_score: findValue(row, "value"),
          beginner_score: findValue(row, "beginner_score"),
          advanced_golfer_score: findValue(row, "advanced"),
          data_confidence: findValue(row, "confidence"),
        };

        if (index === 0) {
          console.log("🔥 FIRST ROW MAPPED:", resortData);
        }

        if (!resortData.resort_name) {
          errors.push(`Row ${index + headerRowIndex + 2}: Missing resort_name`);
          continue;
        }

        const query = `
          INSERT INTO golf_resorts (
            state, resort_name, slug, city, image_url,
            stay_play_from, resort_tier, category_tags,
            holes_count, courses_count,
            course_difficulty, handicap_recommendation,
            beginner_friendly, group_size_fit,
            trip_type_primary, best_season, weather_badge,
            season_insight, ui_badges,
            onsite_golf_strength, stay_play_complexity,
            "18stays_take",
            golf_trip_score, buddy_trip_score, luxury_score,
            value_score, beginner_score, advanced_golfer_score,
            data_confidence
          )
          VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,
            $9,$10,
            $11,$12,
            $13,$14,
            $15,$16,$17,
            $18,$19,
            $20,$21,
            $22,
            $23,$24,$25,
            $26,$27,$28,
            $29
          )
             ON CONFLICT (slug) DO NOTHING
        `;

        const values = [
          resortData.state,
          resortData.resort_name,
          resortData.slug,
          resortData.city,
          resortData.image_url,
          resortData.stay_play_from,
          resortData.resort_tier,
          resortData.category_tags,
          resortData.holes_count ? parseInt(resortData.holes_count) : null,
          resortData.courses_count ? parseInt(resortData.courses_count) : null,
          resortData.course_difficulty,
          resortData.handicap_recommendation,
          resortData.beginner_friendly === 'Yes' || resortData.beginner_friendly === true,
          resortData.group_size_fit,
          resortData.trip_type_primary,
          resortData.best_season,
          resortData.weather_badge,
          resortData.season_insight,
          resortData.ui_badges,
          resortData.onsite_golf_strength,
          resortData.stay_play_complexity,
          resortData["18stays_take"],
          resortData.golf_trip_score ? parseFloat(resortData.golf_trip_score) : null,
          resortData.buddy_trip_score ? parseFloat(resortData.buddy_trip_score) : null,
          resortData.luxury_score ? parseFloat(resortData.luxury_score) : null,
          resortData.value_score ? parseFloat(resortData.value_score) : null,
          resortData.beginner_score ? parseFloat(resortData.beginner_score) : null,
          resortData.advanced_golfer_score ? parseFloat(resortData.advanced_golfer_score) : null,
          resortData.data_confidence ? parseFloat(resortData.data_confidence) : null
        ];

        await db.query(query, values);
        insertedCount++;
      }

      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        inserted: insertedCount,
        skipped: errors.length,
        errors
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, error: 'Server error' });
    }
  });
});

module.exports = router;