const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");

const app = express();

// MySQL Pool (works local + Railway)
const pool = mysql.createPool({
  host: process.env.MYSQLHOST || "127.0.0.1",
  port: process.env.MYSQLPORT || 3306,
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "QwDKDOlwdwiNYAvgmDyYYvOavTqDAwMK",
  database: process.env.MYSQLDATABASE || "dha_fabrication_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.use(cors());
app.use(express.json());

// Serve static frontend (pages folder)
const staticPath = path.join(__dirname, "pages");
app.use(express.static(staticPath));

// Default landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(staticPath, "index.html"));
});

// Multer → Files stored in memory
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }
});

// =================================
// Client Inquiry Submit Form
// =================================
app.post("/api/inquiries", upload.array("files"), async (req, res) => {
  const { full_name, email, contact_number, requirement, message } = req.body;

  if (!full_name || !email || !contact_number || !requirement || !message) {
    return res.status(400).json({ success: false, message: "Missing required fields." });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO web_content_inquiries
       (full_name, email, contact_number, requirement, message)
       VALUES (?, ?, ?, ?, ?)`,
      [full_name, email, contact_number, requirement, message]
    );
    const inquiryId = result.insertId;

    if (req.files?.length) {
      for (const file of req.files) {
        await conn.execute(
          `INSERT INTO web_content_inquiry_file
           (InquiryID, OriginalName, ContentType, FileExt, FileSizeBytes, FileData)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            inquiryId,
            file.originalname,
            file.mimetype,
            path.extname(file.originalname),
            file.size,
            file.buffer,
          ]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, inquiry_id: inquiryId });
  } catch (err) {
    await conn.rollback();
    console.error("Error saving inquiry:", err);
    res.status(500).json({ success: false });
  } finally {
    conn.release();
  }
});

// Admin API — list inquiries
app.get("/api/admin/inquiries", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT inquiry_id, full_name, email, contact_number,
              requirement, status, created_at
       FROM web_content_inquiries
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// Admin — download file
app.get("/api/admin/inquiries/file/:fileId", async (req, res) => {
  const { fileId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT OriginalName, ContentType, FileData
       FROM web_content_inquiry_file
       WHERE FileID = ?`,
      [fileId]
    );
    if (!rows.length) return res.sendStatus(404);

    const file = rows[0];
    res.setHeader("Content-Type", file.ContentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.OriginalName}"`);
    res.send(file.FileData);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
