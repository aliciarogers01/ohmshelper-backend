const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { Pool } = require("pg");
const cloudinary = require("cloudinary").v2;

const app = express();

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const PORT = process.env.PORT || 8080;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false }
});

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bands (
      id SERIAL PRIMARY KEY,
      band_name TEXT NOT NULL,
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      radio_show TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cloudinary_public_id TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE bands
    ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';
  `);

  console.log("Database is ready.");
}

function uploadBufferToCloudinary(buffer, folder = "ohms-helper/bands") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image"
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    stream.end(buffer);
  });
}

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "OHMS Helper backend is running"
  });
});

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "healthy",
      database: "connected",
      cloudinaryConfigured: Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      )
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      status: "unhealthy",
      error: "Health check failed"
    });
  }
});

app.get("/bands", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        band_name AS "bandName",
        city,
        state,
        radio_show AS "radioShow",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM bands
      ORDER BY LOWER(band_name) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting bands:", error);
    res.status(500).json({ error: "Failed to get bands" });
  }
});

app.get("/bands/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        band_name AS "bandName",
        city,
        state,
        radio_show AS "radioShow",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM bands
      WHERE id = $1;
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error getting band:", error);
    res.status(500).json({ error: "Failed to get band" });
  }
});

app.post("/bands", async (req, res) => {
  try {
    const { bandName, city, state, radioShow, imageUrl } = req.body;

    if (!bandName || bandName.trim() === "") {
      return res.status(400).json({ error: "Band name is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO bands (band_name, city, state, radio_show, image_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        band_name AS "bandName",
        city,
        state,
        radio_show AS "radioShow",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        bandName.trim(),
        city || "",
        state || "",
        radioShow || "",
        imageUrl || ""
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding band:", error);
    res.status(500).json({ error: "Failed to add band" });
  }
});

app.put("/bands/:id", async (req, res) => {
  try {
    const { bandName, city, state, radioShow, imageUrl } = req.body;

    const result = await pool.query(
      `
      UPDATE bands
      SET 
        band_name = COALESCE($1, band_name),
        city = COALESCE($2, city),
        state = COALESCE($3, state),
        radio_show = COALESCE($4, radio_show),
        image_url = COALESCE($5, image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING 
        id,
        band_name AS "bandName",
        city,
        state,
        radio_show AS "radioShow",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        bandName ?? null,
        city ?? null,
        state ?? null,
        radioShow ?? null,
        imageUrl ?? null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating band:", error);
    res.status(500).json({ error: "Failed to update band" });
  }
});

app.post("/bands/:id/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const bandCheck = await pool.query(
      "SELECT id FROM bands WHERE id = $1;",
      [req.params.id]
    );

    if (bandCheck.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer);

    const result = await pool.query(
      `
      UPDATE bands
      SET 
        image_url = $1,
        cloudinary_public_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING 
        id,
        band_name AS "bandName",
        city,
        state,
        radio_show AS "radioShow",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        cloudinaryResult.secure_url,
        cloudinaryResult.public_id,
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading band image:", error);
    res.status(500).json({ error: "Failed to upload band image" });
  }
});

app.delete("/bands/:id", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT cloudinary_public_id FROM bands WHERE id = $1;",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    const publicId = existing.rows[0].cloudinary_public_id;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn("Could not delete Cloudinary image:", cloudinaryError);
      }
    }

    await pool.query("DELETE FROM bands WHERE id = $1;", [req.params.id]);

    res.json({
      success: true,
      deletedId: Number(req.params.id)
    });
  } catch (error) {
    console.error("Error deleting band:", error);
    res.status(500).json({ error: "Failed to delete band" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

setupDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`OHMS Helper backend running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Database setup failed:", error);
    process.exit(1);
  });
