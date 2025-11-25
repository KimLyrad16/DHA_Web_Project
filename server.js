const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");

const app = express();

/* =========================================================
   🔧 MySQL Pool (Local + Railway)
   - Gagamit muna ng explicit env vars:
     MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE
   - Kung wala, susubukan niyang i-parse ang MYSQL_URL (Railway style)
   - Kung wala pa rin, babagsak sa local defaults (127.0.0.1)
========================================================= */

function buildDbConfig() {
  const cfg = {
    host: process.env.MYSQLHOST || "",
    port: process.env.MYSQLPORT || "",
    user: process.env.MYSQLUSER || "",
    password: process.env.MYSQLPASSWORD || "",
    database: process.env.MYSQLDATABASE || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };

  // Kung walang host pero may MYSQL_URL (ex: mysql://user:pass@host:port/db)
  if (!cfg.host && process.env.MYSQL_URL) {
    try {
      const url = new URL(process.env.MYSQL_URL);
      cfg.host = url.hostname;
      cfg.port = url.port || "3306";
      cfg.user = decodeURIComponent(url.username || "");
      cfg.password = decodeURIComponent(url.password || "");
      cfg.database = (url.pathname || "").replace("/", "") || cfg.database;
      cfg.ssl = { rejectUnauthorized: false };
    } catch (err) {
      console.error("❌ Failed to parse MYSQL_URL:", err.message);
    }
  }

  // Fallback to local dev defaults kung wala pa ring host
  if (!cfg.host) {
    cfg.host = "127.0.0.1";
    cfg.port = cfg.port || 3306;
    cfg.user = cfg.user || "root";
    cfg.password = cfg.password || "wnSvrMCcpxemJVMmowwqZLUeYagaYkPZ";
    cfg.database = cfg.database || "dha_fabrication_db";
  }

  // Kung host != localhost, enable SSL (karaniwan sa Railway)
  if (cfg.host !== "127.0.0.1" && cfg.host !== "localhost") {
    cfg.ssl = cfg.ssl || { rejectUnauthorized: false };
  }

  return cfg;
}

const dbConfig = buildDbConfig();
console.log("🔌 DB CONFIG =>", {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  ssl: !!dbConfig.ssl,
});

const pool = mysql.createPool(dbConfig);

app.use(cors());
app.use(express.json());

// Serve static frontend
app.use(express.static(path.join(__dirname, "pages")));

// Default route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// Multer: store files in memory buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// =========================================================
// 📌 CLIENT — Submit Inquiry
// =========================================================
app.post("/api/inquiries", upload.array("files"), async (req, res) => {
  const { full_name, email, contact_number, requirement, message } = req.body;

  if (!full_name || !email || !contact_number || !requirement || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields." });
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

// =========================================================
// 🛠 ADMIN — List Inquiries
// =========================================================
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

// Admin — download a file
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
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.OriginalName}"`
    );
    res.send(file.FileData);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

// =========================================================
// ✨ SERVICES — Read & Image Fetch
// =========================================================
app.get("/api/services", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT service_id, title, description, image, image_type, image_alt, sort_order, is_active
      FROM web_content_services
      WHERE is_active = 1
      ORDER BY sort_order
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error in /api/services:", err);
    res.status(500).json({
      message: "DB error in /api/services",
      error: err.code || err.message,
    });
  }
});

app.get("/api/services/:id/image", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT image, image_type
       FROM web_content_services
       WHERE service_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.sendStatus(404);

    res.setHeader("Content-Type", rows[0].image_type || "image/jpeg");
    res.send(rows[0].image);
  } catch (err) {
    console.error("Error in /api/services/:id/image:", err);
    res.status(500).json({
      message: "DB error in /api/services/:id/image",
      error: err.code || err.message,
    });
  }
});

// =========================================================
// 🏗 PROJECTS — Read & Image Fetch
// =========================================================
app.get("/api/projects", async (req, res) => {
  try {
    const [rows] = await pool.execute(`
      SELECT project_id, title, description, image, image_type, image_alt, sort_order, is_active
      FROM web_content_projects
      WHERE is_active = 1
      ORDER BY sort_order
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error in /api/projects:", err);
    res.status(500).json({
      message: "DB error in /api/projects",
      error: err.code || err.message,
    });
  }
});

app.get("/api/projects/:id/image", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT image, image_type
       FROM web_content_projects
       WHERE project_id = ?`,
      [req.params.id]
    );
    if (!rows.length) return res.sendStatus(404);

    res.setHeader("Content-Type", rows[0].image_type || "image/jpeg");
    res.send(rows[0].image);
  } catch (err) {
    console.error("Error in /api/projects/:id/image:", err);
    res.status(500).json({
      message: "DB error in /api/projects/:id/image",
      error: err.code || err.message,
    });
  }
});

// =========================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✔ Server running on port ${PORT}`);
});
