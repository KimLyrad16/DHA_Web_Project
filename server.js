// server.js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const multer = require("multer");
const path = require("path");

const app = express();

const mysql = require("mysql2/promise");

// Default values for local development
const localConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "QwDKDOlwdwiNYAvgmDyYYvOavTqDAwMK",
  database: "dha_fabrication_db"
};

// Railway → ENV Variables override local config
const config = {
  host: process.env.MYSQLHOST || localConfig.host,
  port: process.env.MYSQLPORT || localConfig.port,
  user: process.env.MYSQLUSER || localConfig.user,
  password: process.env.MYSQLPASSWORD || localConfig.password,
  database: process.env.MYSQLDATABASE || localConfig.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create database pool
const pool = mysql.createPool(config);
module.exports = pool;





app.use(cors());
app.use(express.json());

// Serve static files from /pages folder
const staticPath = path.join(__dirname, "pages");
console.log("Serving static from:", staticPath);
app.use(express.static(staticPath));

// Default route → load index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// For file uploads (store in memory, then save to MySQL BLOB)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB max per file
    }
});


// ================== PUBLIC API: CLIENT INQUIRY FORM ==================
// Frontend sends multipart/form-data: full_name, email, contact_number, requirement, message, files[]
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

        // 1) Insert into web_content_inquiries
        const [result] = await conn.execute(
            `INSERT INTO web_content_inquiries
             (full_name, email, contact_number, requirement, message)
             VALUES (?, ?, ?, ?, ?)`,
            [full_name, email, contact_number, requirement, message]
        );

        const inquiryId = result.insertId;
        console.log("✅ New inquiry saved with ID:", inquiryId);

        // 2) Insert attached files (if any) into web_content_inquiry_file
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const originalName = file.originalname;
                const contentType = file.mimetype;
                const ext = path.extname(originalName).toLowerCase();
                const fileSize = file.size;
                const fileData = file.buffer; // ok ito dahil memoryStorage ka

                await conn.execute(
                    `INSERT INTO web_content_inquiry_file
                     (InquiryID, OriginalName, ContentType, FileExt, FileSizeBytes, FileData)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [inquiryId, originalName, contentType, ext, fileSize, fileData]
                );
            }
        }

        await conn.commit();

        res.json({
            success: true,
            message: "Inquiry saved successfully.",
            inquiry_id: inquiryId,
        });
    } catch (err) {
        await conn.rollback();
        console.error("Error saving inquiry:", err);
        res
            .status(500)
            .json({ success: false, message: "Server error while saving inquiry." });
    } finally {
        conn.release();
    }
});



// ================== OPTIONAL PUBLIC APIS (Services / Projects) ==================
app.get("/api/services", async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT service_id, title, description, image_alt, sort_order, is_active
             FROM web_content_services
             WHERE is_active = 1
             ORDER BY sort_order, title`
        );
        res.json(rows);
    } catch (err) {
        console.error("Error loading services:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// Serve service image (BLOB) by ID
app.get("/api/services/:id/image", async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await pool.execute(
            `SELECT image, image_type
             FROM web_content_services
             WHERE service_id = ? AND is_active = 1`,
            [id]
        );

        if (!rows.length || !rows[0].image) {
            return res.status(404).send("Service image not found.");
        }

        const row = rows[0];
        res.setHeader("Content-Type", row.image_type || "image/jpeg");
        res.send(row.image);
    } catch (err) {
        console.error("Error loading service image:", err);
        res.status(500).send("Server error.");
    }
});

// Serve project image (BLOB) by ID
app.get("/api/projects/:id/image", async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await pool.execute(
            `SELECT image, image_type
             FROM web_content_projects
             WHERE project_id = ? AND is_active = 1`,
            [id]
        );

        if (!rows.length || !rows[0].image) {
            return res.status(404).send("Project image not found.");
        }

        const row = rows[0];
        res.setHeader("Content-Type", row.image_type || "image/jpeg");
        res.send(row.image);
    } catch (err) {
        console.error("Error loading project image:", err);
        res.status(500).send("Server error.");
    }
});



app.get("/api/projects", async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT project_id, title, description, image_alt, sort_order, is_active
             FROM web_content_projects
             WHERE is_active = 1
             ORDER BY sort_order, title`
        );
        res.json(rows);
    } catch (err) {
        console.error("Error loading projects:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// Serve service image (BLOB) by ID
app.get("/api/services/:id/image", async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await pool.execute(
            `SELECT image, image_type
             FROM web_content_services
             WHERE service_id = ? AND is_active = 1`,
            [id]
        );

        if (!rows.length || !rows[0].image) {
            return res.status(404).send("Service image not found.");
        }

        const row = rows[0];
        res.setHeader("Content-Type", row.image_type || "image/jpeg");
        res.send(row.image);
    } catch (err) {
        console.error("Error loading service image:", err);
        res.status(500).send("Server error.");
    }
});

// Serve project image (BLOB) by ID
app.get("/api/projects/:id/image", async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await pool.execute(
            `SELECT image, image_type
             FROM web_content_projects
             WHERE project_id = ? AND is_active = 1`,
            [id]
        );

        if (!rows.length || !rows[0].image) {
            return res.status(404).send("Project image not found.");
        }

        const row = rows[0];
        res.setHeader("Content-Type", row.image_type || "image/jpeg");
        res.send(row.image);
    } catch (err) {
        console.error("Error loading project image:", err);
        res.status(500).send("Server error.");
    }
});



// ================== ADMIN API: INQUIRY LIST + FILES ==================

// List all inquiries (for dashboard-inquiries.html)
app.get("/api/admin/inquiries", async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT inquiry_id,
                    full_name,
                    email,
                    contact_number,
                    requirement,
                    status,
                    created_at
             FROM web_content_inquiries
             ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error("Error loading inquiries:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// Get files for one inquiry
app.get("/api/admin/inquiries/:id/files", async (req, res) => {
    const inquiryId = req.params.id;
    try {
        const [rows] = await pool.execute(
            `SELECT FileID,
                    OriginalName,
                    FileExt,
                    FileSizeBytes,
                    CreatedAt
             FROM web_content_inquiry_file
             WHERE InquiryID = ?
             ORDER BY CreatedAt DESC, FileID DESC`,
            [inquiryId]
        );
        res.json(rows);
    } catch (err) {
        console.error("Error loading inquiry files:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// Change status (new/read/closed)
app.patch("/api/admin/inquiries/:id/status", async (req, res) => {
    const inquiryId = req.params.id;
    const { status } = req.body;

    if (!["new", "read", "closed"].includes(status)) {
        return res.status(400).json({ message: "Invalid status." });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE web_content_inquiries
             SET status = ?
             WHERE inquiry_id = ?`,
            [status, inquiryId]
        );

        res.json({ success: true, affected: result.affectedRows });
    } catch (err) {
        console.error("Error updating inquiry status:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// Delete inquiry (cascade delete files)
app.delete("/api/admin/inquiries/:id", async (req, res) => {
    const inquiryId = req.params.id;
    try {
        const [result] = await pool.execute(
            `DELETE FROM web_content_inquiries
             WHERE inquiry_id = ?`,
            [inquiryId]
        );
        res.json({ success: true, affected: result.affectedRows });
    } catch (err) {
        console.error("Error deleting inquiry:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// Download file by FileID
app.get("/api/admin/inquiries/file/:fileId", async (req, res) => {
    const fileId = req.params.fileId;
    try {
        const [rows] = await pool.execute(
            `SELECT OriginalName, ContentType, FileData
             FROM web_content_inquiry_file
             WHERE FileID = ?`,
            [fileId]
        );

        if (rows.length === 0) {
            return res.status(404).send("File not found.");
        }

        const file = rows[0];
        res.setHeader("Content-Type", file.ContentType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.OriginalName}"`);
        res.send(file.FileData);
    } catch (err) {
        console.error("Error downloading file:", err);
        res.status(500).send("Server error.");
    }
});

// ---------- START SERVER ----------
// ---------- START SERVER ----------
app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on http://0.0.0.0:3000");
});






