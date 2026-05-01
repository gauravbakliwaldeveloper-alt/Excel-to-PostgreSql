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

// Configure Multer for Excel file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files are allowed'));
    }
    cb(null, true);
  }
});

const uploadMiddleware = upload.single('file');

// Helper function to normalize Excel headers
const normalizeKey = (key) => {
  if (!key) return '';
  return key
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\(.*\)/g, '')         // Remove content in parentheses like (USD)
    .replace(/\s+/g, '_')           // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, '')     // Remove non-alphanumeric except underscores
    .replace(/_{2,}/g, '_')         // Replace multiple underscores with single
    .trim()
    .replace(/^_+|_+$/g, '');       // Trim leading/trailing underscores
};

router.post('/', (req, res) => {
  uploadMiddleware(req, res, async function (err) {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    try {
      // Parse Excel file with cellDates: true to handle Excel serial dates
      const workbook = xlsx.readFile(req.file.path, { cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      /**
       * 1. Skip top rows:
       * range: 5 tells xlsx to start reading from row 6 (0-indexed).
       * Row 6 becomes the header row for sheet_to_json.
       */
      const rawData = xlsx.utils.sheet_to_json(sheet, { range: 5, defval: "" });

      if (rawData.length > 0) {
        console.log('--- DEBUG: Call Center Data Parsing ---');
        console.log('Detected keys:', Object.keys(rawData[0]));
        const mapping = {};
        Object.keys(rawData[0]).forEach(k => mapping[normalizeKey(k)] = k);
        console.log('Normalized mapping:', mapping);
        console.log('---------------------------');
      }

      let insertedCount = 0;
      const errors = [];

      // Validate and insert rows
      for (const [index, row] of rawData.entries()) {
        // 2. Normalize and Map Keys
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
          normalizedRow[normalizeKey(key)] = row[key];
        });

        const callData = {
          ticket_id: normalizedRow["id"],
          customer_name: normalizedRow["customer_name"],
          sentiment: normalizedRow["sentiment"],
          csat_score: normalizedRow["csat_score"],
          call_timestamp: normalizedRow["call_timestamp"],
          reason: normalizedRow["reason"],
          city: normalizedRow["city"],
          state: normalizedRow["state"],
          channel: normalizedRow["channel"],
          response_time: normalizedRow["response_time"],
          call_duration: normalizedRow["call_duration"],
          call_center: normalizedRow["call_center"]
        };

        // 3. Validation: require ticket_id and customer_name at minimum
        if (!callData.ticket_id) {
          errors.push(`Row ${index + 7}: Missing ID.`); // index + 7 because we skipped 5 rows and headers are on row 6
          continue;
        }

        // 4. Insert into PostgreSQL
        const query = `
          INSERT INTO golf_scores (ticket_id, customer_name, sentiment, csat_score, call_timestamp, reason, city, state, channel, response_time, call_duration, call_center)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        const values = [
          callData.ticket_id,
          callData.customer_name,
          callData.sentiment,
          callData.csat_score ? Number(callData.csat_score) : null,
          callData.call_timestamp,
          callData.reason,
          callData.city,
          callData.state,
          callData.channel,
          callData.response_time,
          callData.call_duration ? Number(callData.call_duration) : null,
          callData.call_center
        ];

        await db.query(query, values);
        insertedCount++;
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        inserted: insertedCount,
        skipped: errors.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('Error processing upload:', error);

      // Clean up file if an exception occurred during processing
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ success: false, error: 'Internal server error processing file' });
    }
  });
});

module.exports = router;
