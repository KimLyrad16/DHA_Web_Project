// seed_content.js
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function run() {
    const pool = mysql.createPool({
        host: "localhost",
        port: 3306,
        user: "appuser",
        password: "0516name91daryL",
        database: "dha_fabrication_db",
    });

    const conn = await pool.getConnection();

    try {
        // ===== READ IMAGES FROM FILESYSTEM =====
        const svcCounter = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "service-counter.jpg")
        );
        const svcHood = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "service-hood.jpg")
        );
        const svcShelves = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "service-shelves.jpg")
        );

        const gal1 = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "gallery-1.jpg")
        );
        const gal2 = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "gallery-2.jpg")
        );
        const gal3 = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "gallery-3.jpg")
        );
        const gal4 = fs.readFileSync(
            path.join(__dirname, "pages", "assets", "images", "gallery-4.jpg")
        );

        // OPTIONAL: linisin muna para hindi ma-duplicate
        // await conn.execute("TRUNCATE TABLE web_content_services");
        // await conn.execute("TRUNCATE TABLE web_content_projects");

        // ===== INSERT SERVICES =====
        await conn.execute(
            `INSERT INTO web_content_services
                (title, description, image, image_type, image_alt, sort_order, is_active)
             VALUES
                (?, ?, ?, ?, ?, ?, 1),
                (?, ?, ?, ?, ?, ?, 1),
                (?, ?, ?, ?, ?, ?, 1)`,
            [
                "Worktables & Counters",
                "Custom-sized stainless steel worktables, sinks, and counters.",
                svcCounter,
                "image/jpeg",
                "Stainless worktables & counters",
                1,

                "Rangehood & Exhaust",
                "Custom fabrication of stainless rangehoods, ducting, and ventilation.",
                svcHood,
                "image/jpeg",
                "Stainless rangehood & exhaust",
                2,

                "Racks & Shelving",
                "Heavy-duty stainless steel rack and shelving solutions.",
                svcShelves,
                "image/jpeg",
                "Stainless racks & shelving",
                3,
            ]
        );

        console.log("✅ Inserted web_content_services with images.");

        // ===== INSERT PROJECTS =====
        await conn.execute(
            `INSERT INTO web_content_projects
                (title, description, image, image_type, image_alt, sort_order, is_active)
             VALUES
                (?, ?, ?, ?, ?, ?, 1),
                (?, ?, ?, ?, ?, ?, 1),
                (?, ?, ?, ?, ?, ?, 1),
                (?, ?, ?, ?, ?, ?, 1)`,
            [
                "Prep Table Fabrication",
                "Custom stainless prep table for commercial kitchens.",
                gal1,
                "image/jpeg",
                "Stainless prep table",
                1,

                "Restaurant Kitchen Line",
                "Complete stainless kitchen line setup.",
                gal2,
                "image/jpeg",
                "Restaurant kitchen line",
                2,

                "Rangehood & Exhaust System",
                "Custom industrial exhaust and ventilation solution.",
                gal3,
                "image/jpeg",
                "Rangehood & exhaust",
                3,

                "Stainless Storage Racks",
                "Durable stainless shelving solutions.",
                gal4,
                "image/jpeg",
                "Storage racks",
                4,
            ]
        );

        console.log("✅ Inserted web_content_projects with images.");
    } catch (err) {
        console.error("❌ Error seeding content:", err);
    } finally {
        conn.release();
        await pool.end();
    }
}

run();
