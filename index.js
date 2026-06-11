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

  await pool.query(`ALTER TABLE bands ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE bands ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE bands ADD COLUMN IF NOT EXISTS radio_show TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE bands ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE bands ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE bands ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS artists (
      id SERIAL PRIMARY KEY,
      artist_name TEXT NOT NULL,
      role TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cloudinary_public_id TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE artists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS albums (
      id SERIAL PRIMARY KEY,
      album_title TEXT NOT NULL,
      band_name TEXT DEFAULT '',
      release_year TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cloudinary_public_id TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE albums ADD COLUMN IF NOT EXISTS band_name TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE albums ADD COLUMN IF NOT EXISTS release_year TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE albums ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE albums ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE albums ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS band_artists (
      id SERIAL PRIMARY KEY,
      band_id INTEGER NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
      artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      role TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (band_id, artist_id)
    );
  `);

  await pool.query(`ALTER TABLE band_artists ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS band_albums (
      id SERIAL PRIMARY KEY,
      band_id INTEGER NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
      album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (band_id, album_id)
    );
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS venues (
      id SERIAL PRIMARY KEY,
      venue_name TEXT NOT NULL,
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cloudinary_public_id TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE venues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS flyers (
      id SERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      event_date TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cloudinary_public_id TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE flyers ADD COLUMN IF NOT EXISTS event_date TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE flyers ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE flyers ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE flyers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS band_flyers (
      id SERIAL PRIMARY KEY,
      band_id INTEGER NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
      flyer_id INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (band_id, flyer_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS venue_flyers (
      id SERIAL PRIMARY KEY,
      venue_id INTEGER NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
      flyer_id INTEGER NOT NULL REFERENCES flyers(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (venue_id, flyer_id)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS songs (
      id SERIAL PRIMARY KEY,
      song_title TEXT NOT NULL,
      band_name TEXT DEFAULT '',
      album_title TEXT DEFAULT '',
      album_image_url TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS band_name TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_title TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_image_url TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS album_songs (
      id SERIAL PRIMARY KEY,
      album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (album_id, song_id)
    );
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

// ===== BANDS =====

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
      [bandName.trim(), city || "", state || "", radioShow || "", imageUrl || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding band:", error);
    res.status(500).json({ error: "Failed to add band" });
  }
});

app.post("/bands/import", async (req, res) => {
  const bands = req.body.bands;

  if (!Array.isArray(bands)) {
    return res.status(400).json({
      error: "Expected body format: { bands: [...] }"
    });
  }

  const cleanedBands = bands
    .map((band) => ({
      band_name: String(
        band.band_name ||
          band.band_Name ||
          band.bandName ||
          band.name ||
          ""
      ).trim(),
      city: String(band.city || "").trim(),
      state: String(band.state || "").trim()
    }))
    .filter((band) => band.band_name.length > 0);

  if (cleanedBands.length === 0) {
    return res.status(400).json({
      error: "No valid bands found in import."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let insertedCount = 0;

    for (const band of cleanedBands) {
      await client.query(
        `
        INSERT INTO bands (band_name, city, state)
        VALUES ($1, $2, $3);
        `,
        [band.band_name, band.city || "", band.state || ""]
      );

      insertedCount++;
    }

    await client.query("COMMIT");

    res.json({
      message: "Bands imported successfully.",
      insertedCount
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Band import error:", error);

    res.status(500).json({
      error: "Band import failed."
    });
  } finally {
    client.release();
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

    const cloudinaryResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "ohms-helper/bands"
    );

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
      [cloudinaryResult.secure_url, cloudinaryResult.public_id, req.params.id]
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
        console.warn("Could not delete Cloudinary band image:", cloudinaryError);
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

// ===== ARTISTS =====

app.get("/artists", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        artist_name AS "artistName",
        role,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM artists
      ORDER BY LOWER(artist_name) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting artists:", error);
    res.status(500).json({ error: "Failed to get artists" });
  }
});

app.post("/artists", async (req, res) => {
  try {
    const { artistName, role, city, state } = req.body;

    if (!artistName || artistName.trim() === "") {
      return res.status(400).json({ error: "Artist name is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO artists (artist_name, role, city, state)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        artist_name AS "artistName",
        role,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [artistName.trim(), role || "", city || "", state || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding artist:", error);
    res.status(500).json({ error: "Failed to add artist" });
  }
});

app.put("/artists/:id", async (req, res) => {
  try {
    const { artistName, role, city, state } = req.body;

    const result = await pool.query(
      `
      UPDATE artists
      SET
        artist_name = COALESCE($1, artist_name),
        role = COALESCE($2, role),
        city = COALESCE($3, city),
        state = COALESCE($4, state),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING
        id,
        artist_name AS "artistName",
        role,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [artistName ?? null, role ?? null, city ?? null, state ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating artist:", error);
    res.status(500).json({ error: "Failed to update artist" });
  }
});

app.post("/artists/:id/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const artistCheck = await pool.query(
      "SELECT id FROM artists WHERE id = $1;",
      [req.params.id]
    );

    if (artistCheck.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "ohms-helper/artists"
    );

    const result = await pool.query(
      `
      UPDATE artists
      SET
        image_url = $1,
        cloudinary_public_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        artist_name AS "artistName",
        role,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [cloudinaryResult.secure_url, cloudinaryResult.public_id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading artist image:", error);
    res.status(500).json({ error: "Failed to upload artist image" });
  }
});

app.delete("/artists/:id", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT cloudinary_public_id FROM artists WHERE id = $1;",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const publicId = existing.rows[0].cloudinary_public_id;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn("Could not delete Cloudinary artist image:", cloudinaryError);
      }
    }

    await pool.query("DELETE FROM artists WHERE id = $1;", [req.params.id]);

    res.json({
      success: true,
      deletedId: Number(req.params.id)
    });
  } catch (error) {
    console.error("Error deleting artist:", error);
    res.status(500).json({ error: "Failed to delete artist" });
  }
});

app.get("/bands/:id/artists", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        artists.id,
        artists.artist_name AS "artistName",
        artists.role AS "defaultRole",
        artists.city,
        artists.state,
        artists.image_url AS "imageUrl",
        artists.cloudinary_public_id AS "cloudinaryPublicId",
        band_artists.role,
        band_artists.created_at AS "linkedAt"
      FROM band_artists
      JOIN artists ON band_artists.artist_id = artists.id
      WHERE band_artists.band_id = $1
      ORDER BY LOWER(artists.artist_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting band artists:", error);
    res.status(500).json({ error: "Failed to get band artists" });
  }
});

app.post("/artists/:id/bands", async (req, res) => {
  try {
    const { bandName, city, role } = req.body;

    if (!bandName || bandName.trim() === "") {
      return res.status(400).json({ error: "Band name is required" });
    }

    const artistCheck = await pool.query(
      "SELECT id, artist_name FROM artists WHERE id = $1;",
      [req.params.id]
    );

    if (artistCheck.rows.length === 0) {
      return res.status(404).json({ error: "Artist not found" });
    }

    const existingBand = await pool.query(
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
      WHERE LOWER(TRIM(band_name)) = LOWER(TRIM($1))
      LIMIT 1;
      `,
      [bandName.trim()]
    );

    let band = existingBand.rows[0];

    if (!band) {
      const bandResult = await pool.query(
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
        [bandName.trim(), city || "", "", "", ""]
      );

      band = bandResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO band_artists (band_id, artist_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (band_id, artist_id)
      DO UPDATE SET role = EXCLUDED.role;
      `,
      [band.id, req.params.id, role || ""]
    );

    res.status(201).json({
      ...band,
      role: role || ""
    });
  } catch (error) {
    console.error("Error linking band to artist:", error);
    res.status(500).json({ error: "Failed to link band to artist" });
  }
});

app.post("/bands/:id/artists", async (req, res) => {
  try {
    const { artistName, role, city, state } = req.body;

    if (!artistName || artistName.trim() === "") {
      return res.status(400).json({ error: "Artist name is required" });
    }

    const bandCheck = await pool.query(
      "SELECT id FROM bands WHERE id = $1;",
      [req.params.id]
    );

    if (bandCheck.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    const existingArtist = await pool.query(
      `
      SELECT
        id,
        artist_name AS "artistName",
        role,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM artists
      WHERE LOWER(TRIM(artist_name)) = LOWER(TRIM($1))
      LIMIT 1;
      `,
      [artistName.trim()]
    );

    let artist = existingArtist.rows[0];

    if (!artist) {
      const artistResult = await pool.query(
        `
        INSERT INTO artists (artist_name, role, city, state)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          artist_name AS "artistName",
          role,
          city,
          state,
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [artistName.trim(), role || "", city || "", state || ""]
      );

      artist = artistResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO band_artists (band_id, artist_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (band_id, artist_id)
      DO UPDATE SET role = EXCLUDED.role;
      `,
      [req.params.id, artist.id, role || artist.role || ""]
    );

    res.status(201).json({
      ...artist,
      role: role || artist.role || ""
    });
  } catch (error) {
    console.error("Error adding band artist:", error);
    res.status(500).json({ error: "Failed to add band artist" });
  }
});

// ===== ALBUMS =====

app.get("/albums", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        albums.id,
        albums.album_title AS "albumTitle",
        COALESCE(
          (
            SELECT bands.band_name
            FROM band_albums
            JOIN bands ON band_albums.band_id = bands.id
            WHERE band_albums.album_id = albums.id
            LIMIT 1
          ),
          albums.band_name,
          ''
        ) AS "bandName",
        albums.release_year AS "releaseYear",
        albums.image_url AS "imageUrl",
        albums.cloudinary_public_id AS "cloudinaryPublicId",
        albums.created_at AS "createdAt",
        albums.updated_at AS "updatedAt"
      FROM albums
      ORDER BY LOWER(albums.album_title) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting albums:", error);
    res.status(500).json({ error: "Failed to get albums" });
  }
});

app.get("/artists/:id/bands", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        bands.id,
        bands.band_name AS "bandName",
        bands.city,
        bands.state,
        bands.radio_show AS "radioShow",
        bands.image_url AS "imageUrl",
        bands.cloudinary_public_id AS "cloudinaryPublicId",
        band_artists.role,
        band_artists.created_at AS "linkedAt"
      FROM band_artists
      JOIN bands ON band_artists.band_id = bands.id
      WHERE band_artists.artist_id = $1
      ORDER BY LOWER(bands.band_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting artist bands:", error);
    res.status(500).json({ error: "Failed to get artist bands" });
  }
});

app.post("/albums", async (req, res) => {
  try {
    const { albumTitle, bandName, releaseYear } = req.body;

    if (!albumTitle || albumTitle.trim() === "") {
      return res.status(400).json({ error: "Album title is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO albums (album_title, band_name, release_year)
      VALUES ($1, $2, $3)
      RETURNING
        id,
        album_title AS "albumTitle",
        band_name AS "bandName",
        release_year AS "releaseYear",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [albumTitle.trim(), bandName || "", releaseYear || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding album:", error);
    res.status(500).json({ error: "Failed to add album" });
  }
});

app.put("/albums/:id", async (req, res) => {
  try {
    const { albumTitle, bandName, releaseYear } = req.body;

    const result = await pool.query(
      `
      UPDATE albums
      SET
        album_title = COALESCE($1, album_title),
        band_name = COALESCE($2, band_name),
        release_year = COALESCE($3, release_year),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING
        id,
        album_title AS "albumTitle",
        band_name AS "bandName",
        release_year AS "releaseYear",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [albumTitle ?? null, bandName ?? null, releaseYear ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating album:", error);
    res.status(500).json({ error: "Failed to update album" });
  }
});

app.post("/albums/:id/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const albumCheck = await pool.query(
      "SELECT id FROM albums WHERE id = $1;",
      [req.params.id]
    );

    if (albumCheck.rows.length === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "ohms-helper/albums"
    );

    const result = await pool.query(
      `
      UPDATE albums
      SET
        image_url = $1,
        cloudinary_public_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        album_title AS "albumTitle",
        band_name AS "bandName",
        release_year AS "releaseYear",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [cloudinaryResult.secure_url, cloudinaryResult.public_id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading album image:", error);
    res.status(500).json({ error: "Failed to upload album image" });
  }
});

app.delete("/albums/:id", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT cloudinary_public_id FROM albums WHERE id = $1;",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    const publicId = existing.rows[0].cloudinary_public_id;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn("Could not delete Cloudinary album image:", cloudinaryError);
      }
    }

    await pool.query("DELETE FROM band_albums WHERE album_id = $1;", [req.params.id]);
    await pool.query("DELETE FROM albums WHERE id = $1;", [req.params.id]);

    res.json({
      success: true,
      deletedId: Number(req.params.id)
    });
  } catch (error) {
    console.error("Error deleting album:", error);
    res.status(500).json({ error: "Failed to delete album" });
  }
});

app.get("/albums/:id/bands", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        bands.id,
        bands.band_name AS "bandName",
        bands.city,
        bands.state,
        bands.radio_show AS "radioShow",
        bands.image_url AS "imageUrl",
        bands.cloudinary_public_id AS "cloudinaryPublicId",
        band_albums.created_at AS "linkedAt"
      FROM band_albums
      JOIN bands ON band_albums.band_id = bands.id
      WHERE band_albums.album_id = $1
      ORDER BY LOWER(bands.band_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting album bands:", error);
    res.status(500).json({ error: "Failed to get album bands" });
  }
});

app.post("/albums/:id/bands", async (req, res) => {
  try {
    const { bandName, city } = req.body;

    if (!bandName || bandName.trim() === "") {
      return res.status(400).json({ error: "Band name is required" });
    }

    const albumCheck = await pool.query(
      "SELECT id, album_title FROM albums WHERE id = $1;",
      [req.params.id]
    );

    if (albumCheck.rows.length === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    const existingBand = await pool.query(
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
      WHERE LOWER(TRIM(band_name)) = LOWER(TRIM($1))
      LIMIT 1;
      `,
      [bandName.trim()]
    );

    let band = existingBand.rows[0];

    if (!band) {
      const bandResult = await pool.query(
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
        [bandName.trim(), city || "", "", "", ""]
      );

      band = bandResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO band_albums (band_id, album_id)
      VALUES ($1, $2)
      ON CONFLICT (band_id, album_id)
      DO NOTHING;
      `,
      [band.id, req.params.id]
    );

    res.status(201).json(band);
  } catch (error) {
    console.error("Error linking band to album:", error);
    res.status(500).json({ error: "Failed to link band to album" });
  }
});

app.get("/bands/:id/albums", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        albums.id,
        albums.album_title AS "albumTitle",
        COALESCE(bands.band_name, albums.band_name, '') AS "bandName",
        albums.release_year AS "releaseYear",
        albums.image_url AS "imageUrl",
        albums.cloudinary_public_id AS "cloudinaryPublicId",
        band_albums.created_at AS "linkedAt"
      FROM band_albums
      JOIN albums ON band_albums.album_id = albums.id
      JOIN bands ON band_albums.band_id = bands.id
      WHERE band_albums.band_id = $1
      ORDER BY LOWER(albums.album_title) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting band albums:", error);
    res.status(500).json({ error: "Failed to get band albums" });
  }
});

app.post("/bands/:id/albums", async (req, res) => {
  try {
    const { albumTitle, bandName, releaseYear } = req.body;

    if (!albumTitle || albumTitle.trim() === "") {
      return res.status(400).json({ error: "Album title is required" });
    }

    const bandCheck = await pool.query(
      "SELECT id, band_name FROM bands WHERE id = $1;",
      [req.params.id]
    );

    if (bandCheck.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    const selectedBandName = bandCheck.rows[0].band_name || bandName || "";

    const existingAlbum = await pool.query(
      `
      SELECT
        id,
        album_title AS "albumTitle",
        band_name AS "bandName",
        release_year AS "releaseYear",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM albums
      WHERE LOWER(TRIM(album_title)) = LOWER(TRIM($1))
        AND LOWER(TRIM(COALESCE(band_name, ''))) = LOWER(TRIM($2))
      LIMIT 1;
      `,
      [albumTitle.trim(), selectedBandName]
    );

    let album = existingAlbum.rows[0];

    if (!album) {
      const albumResult = await pool.query(
        `
        INSERT INTO albums (album_title, band_name, release_year)
        VALUES ($1, $2, $3)
        RETURNING
          id,
          album_title AS "albumTitle",
          band_name AS "bandName",
          release_year AS "releaseYear",
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [albumTitle.trim(), selectedBandName, releaseYear || ""]
      );

      album = albumResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO band_albums (band_id, album_id)
      VALUES ($1, $2)
      ON CONFLICT (band_id, album_id)
      DO NOTHING;
      `,
      [req.params.id, album.id]
    );

    res.status(201).json({
      ...album,
      bandName: selectedBandName
    });
  } catch (error) {
    console.error("Error adding band album:", error);
    res.status(500).json({ error: "Failed to add band album" });
  }
});

// ===== VENUES =====

app.get("/venues", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        venue_name AS "venueName",
        address,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM venues
      ORDER BY LOWER(venue_name) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting venues:", error);
    res.status(500).json({ error: "Failed to get venues" });
  }
});

app.post("/venues", async (req, res) => {
  try {
    const { venueName, address, city, state } = req.body;

    if (!venueName || venueName.trim() === "") {
      return res.status(400).json({ error: "Venue name is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO venues (venue_name, address, city, state)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        venue_name AS "venueName",
        address,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [venueName.trim(), address || "", city || "", state || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding venue:", error);
    res.status(500).json({ error: "Failed to add venue" });
  }
});

app.put("/venues/:id", async (req, res) => {
  try {
    const { venueName, address, city, state } = req.body;

    const result = await pool.query(
      `
      UPDATE venues
      SET
        venue_name = COALESCE($1, venue_name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        state = COALESCE($4, state),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING
        id,
        venue_name AS "venueName",
        address,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [venueName ?? null, address ?? null, city ?? null, state ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating venue:", error);
    res.status(500).json({ error: "Failed to update venue" });
  }
});

app.post("/venues/:id/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const venueCheck = await pool.query(
      "SELECT id FROM venues WHERE id = $1;",
      [req.params.id]
    );

    if (venueCheck.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "ohms-helper/venues"
    );

    const result = await pool.query(
      `
      UPDATE venues
      SET
        image_url = $1,
        cloudinary_public_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        venue_name AS "venueName",
        address,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [cloudinaryResult.secure_url, cloudinaryResult.public_id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading venue image:", error);
    res.status(500).json({ error: "Failed to upload venue image" });
  }
});

app.delete("/venues/:id", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT cloudinary_public_id FROM venues WHERE id = $1;",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const publicId = existing.rows[0].cloudinary_public_id;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn("Could not delete Cloudinary venue image:", cloudinaryError);
      }
    }

    await pool.query("DELETE FROM venue_flyers WHERE venue_id = $1;", [req.params.id]);
    await pool.query("DELETE FROM venues WHERE id = $1;", [req.params.id]);

    res.json({
      success: true,
      deletedId: Number(req.params.id)
    });
  } catch (error) {
    console.error("Error deleting venue:", error);
    res.status(500).json({ error: "Failed to delete venue" });
  }
});

// ===== FLYERS =====

app.get("/flyers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        flyers.id,
        flyers.event_name AS "eventName",
        flyers.event_date AS "eventDate",
        flyers.image_url AS "imageUrl",
        flyers.cloudinary_public_id AS "cloudinaryPublicId",
        (
          SELECT venues.venue_name
          FROM venue_flyers
          JOIN venues ON venue_flyers.venue_id = venues.id
          WHERE venue_flyers.flyer_id = flyers.id
          LIMIT 1
        ) AS "venueName",
        flyers.created_at AS "createdAt",
        flyers.updated_at AS "updatedAt"
      FROM flyers
      ORDER BY flyers.event_date DESC NULLS LAST, LOWER(flyers.event_name) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting flyers:", error);
    res.status(500).json({ error: "Failed to get flyers" });
  }
});

app.post("/flyers", async (req, res) => {
  try {
    const { eventName, eventDate } = req.body;

    if (!eventName || eventName.trim() === "") {
      return res.status(400).json({ error: "Event name is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO flyers (event_name, event_date)
      VALUES ($1, $2)
      RETURNING
        id,
        event_name AS "eventName",
        event_date AS "eventDate",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [eventName.trim(), eventDate || ""]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding flyer:", error);
    res.status(500).json({ error: "Failed to add flyer" });
  }
});

app.put("/flyers/:id", async (req, res) => {
  try {
    const { eventName, eventDate } = req.body;

    const result = await pool.query(
      `
      UPDATE flyers
      SET
        event_name = COALESCE($1, event_name),
        event_date = COALESCE($2, event_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        event_name AS "eventName",
        event_date AS "eventDate",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [eventName ?? null, eventDate ?? null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Flyer not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating flyer:", error);
    res.status(500).json({ error: "Failed to update flyer" });
  }
});

app.post("/flyers/:id/image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const flyerCheck = await pool.query(
      "SELECT id FROM flyers WHERE id = $1;",
      [req.params.id]
    );

    if (flyerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Flyer not found" });
    }

    const cloudinaryResult = await uploadBufferToCloudinary(
      req.file.buffer,
      "ohms-helper/flyers"
    );

    const result = await pool.query(
      `
      UPDATE flyers
      SET
        image_url = $1,
        cloudinary_public_id = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING
        id,
        event_name AS "eventName",
        event_date AS "eventDate",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [cloudinaryResult.secure_url, cloudinaryResult.public_id, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error uploading flyer image:", error);
    res.status(500).json({ error: "Failed to upload flyer image" });
  }
});

app.delete("/flyers/:id", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT cloudinary_public_id FROM flyers WHERE id = $1;",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Flyer not found" });
    }

    const publicId = existing.rows[0].cloudinary_public_id;

    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (cloudinaryError) {
        console.warn("Could not delete Cloudinary flyer image:", cloudinaryError);
      }
    }

    await pool.query("DELETE FROM band_flyers WHERE flyer_id = $1;", [req.params.id]);
    await pool.query("DELETE FROM venue_flyers WHERE flyer_id = $1;", [req.params.id]);
    await pool.query("DELETE FROM flyers WHERE id = $1;", [req.params.id]);

    res.json({
      success: true,
      deletedId: Number(req.params.id)
    });
  } catch (error) {
    console.error("Error deleting flyer:", error);
    res.status(500).json({ error: "Failed to delete flyer" });
  }
});

// ===== BAND / FLYER LINKS =====

app.get("/bands/:id/flyers", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        flyers.id,
        flyers.event_name AS "eventName",
        flyers.event_date AS "eventDate",
        flyers.image_url AS "imageUrl",
        flyers.cloudinary_public_id AS "cloudinaryPublicId",
        (
          SELECT venues.venue_name
          FROM venue_flyers
          JOIN venues ON venue_flyers.venue_id = venues.id
          WHERE venue_flyers.flyer_id = flyers.id
          LIMIT 1
        ) AS "venueName",
        band_flyers.created_at AS "linkedAt"
      FROM band_flyers
      JOIN flyers ON band_flyers.flyer_id = flyers.id
      WHERE band_flyers.band_id = $1
      ORDER BY flyers.event_date DESC NULLS LAST, LOWER(flyers.event_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting band flyers:", error);
    res.status(500).json({ error: "Failed to get band flyers" });
  }
});

app.post("/bands/:id/flyers", async (req, res) => {
  try {
    const { eventName, eventDate } = req.body;

    if (!eventName || eventName.trim() === "") {
      return res.status(400).json({ error: "Event name is required" });
    }

    const bandCheck = await pool.query(
      "SELECT id FROM bands WHERE id = $1;",
      [req.params.id]
    );

    if (bandCheck.rows.length === 0) {
      return res.status(404).json({ error: "Band not found" });
    }

    const existingFlyer = await pool.query(
      `
      SELECT
        id,
        event_name AS "eventName",
        event_date AS "eventDate",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM flyers
      WHERE LOWER(TRIM(event_name)) = LOWER(TRIM($1))
        AND COALESCE(event_date, '') = COALESCE($2, '')
      LIMIT 1;
      `,
      [eventName.trim(), eventDate || ""]
    );

    let flyer = existingFlyer.rows[0];

    if (!flyer) {
      const flyerResult = await pool.query(
        `
        INSERT INTO flyers (event_name, event_date)
        VALUES ($1, $2)
        RETURNING
          id,
          event_name AS "eventName",
          event_date AS "eventDate",
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [eventName.trim(), eventDate || ""]
      );

      flyer = flyerResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO band_flyers (band_id, flyer_id)
      VALUES ($1, $2)
      ON CONFLICT (band_id, flyer_id)
      DO NOTHING;
      `,
      [req.params.id, flyer.id]
    );

    res.status(201).json(flyer);
  } catch (error) {
    console.error("Error linking flyer to band:", error);
    res.status(500).json({ error: "Failed to link flyer to band" });
  }
});

app.get("/flyers/:id/bands", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        bands.id,
        bands.band_name AS "bandName",
        bands.city,
        bands.state,
        bands.image_url AS "imageUrl",
        bands.cloudinary_public_id AS "cloudinaryPublicId",
        band_flyers.created_at AS "linkedAt"
      FROM band_flyers
      JOIN bands ON band_flyers.band_id = bands.id
      WHERE band_flyers.flyer_id = $1
      ORDER BY LOWER(bands.band_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting flyer bands:", error);
    res.status(500).json({ error: "Failed to get flyer bands" });
  }
});

app.post("/flyers/:id/bands", async (req, res) => {
  try {
    const { bandName, city, state } = req.body;

    if (!bandName || bandName.trim() === "") {
      return res.status(400).json({ error: "Band name is required" });
    }

    const flyerCheck = await pool.query(
      "SELECT id FROM flyers WHERE id = $1;",
      [req.params.id]
    );

    if (flyerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Flyer not found" });
    }

    const existingBand = await pool.query(
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
      WHERE LOWER(TRIM(band_name)) = LOWER(TRIM($1))
      LIMIT 1;
      `,
      [bandName.trim()]
    );

    let band = existingBand.rows[0];

    if (!band) {
      const bandResult = await pool.query(
        `
        INSERT INTO bands (band_name, city, state)
        VALUES ($1, $2, $3)
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
        [bandName.trim(), city || "", state || ""]
      );

      band = bandResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO band_flyers (band_id, flyer_id)
      VALUES ($1, $2)
      ON CONFLICT (band_id, flyer_id)
      DO NOTHING;
      `,
      [band.id, req.params.id]
    );

    res.status(201).json(band);
  } catch (error) {
    console.error("Error linking band to flyer:", error);
    res.status(500).json({ error: "Failed to link band to flyer" });
  }
});

// ===== VENUE / FLYER LINKS =====

app.get("/venues/:id/flyers", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        flyers.id,
        flyers.event_name AS "eventName",
        flyers.event_date AS "eventDate",
        flyers.image_url AS "imageUrl",
        flyers.cloudinary_public_id AS "cloudinaryPublicId",
        venue_flyers.created_at AS "linkedAt"
      FROM venue_flyers
      JOIN flyers ON venue_flyers.flyer_id = flyers.id
      WHERE venue_flyers.venue_id = $1
      ORDER BY flyers.event_date DESC NULLS LAST, LOWER(flyers.event_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting venue flyers:", error);
    res.status(500).json({ error: "Failed to get venue flyers" });
  }
});

app.post("/venues/:id/flyers", async (req, res) => {
  try {
    const { eventName, eventDate } = req.body;

    if (!eventName || eventName.trim() === "") {
      return res.status(400).json({ error: "Event name is required" });
    }

    const venueCheck = await pool.query(
      "SELECT id FROM venues WHERE id = $1;",
      [req.params.id]
    );

    if (venueCheck.rows.length === 0) {
      return res.status(404).json({ error: "Venue not found" });
    }

    const existingFlyer = await pool.query(
      `
      SELECT
        id,
        event_name AS "eventName",
        event_date AS "eventDate",
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM flyers
      WHERE LOWER(TRIM(event_name)) = LOWER(TRIM($1))
        AND COALESCE(event_date, '') = COALESCE($2, '')
      LIMIT 1;
      `,
      [eventName.trim(), eventDate || ""]
    );

    let flyer = existingFlyer.rows[0];

    if (!flyer) {
      const flyerResult = await pool.query(
        `
        INSERT INTO flyers (event_name, event_date)
        VALUES ($1, $2)
        RETURNING
          id,
          event_name AS "eventName",
          event_date AS "eventDate",
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [eventName.trim(), eventDate || ""]
      );

      flyer = flyerResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO venue_flyers (venue_id, flyer_id)
      VALUES ($1, $2)
      ON CONFLICT (venue_id, flyer_id)
      DO NOTHING;
      `,
      [req.params.id, flyer.id]
    );

    res.status(201).json(flyer);
  } catch (error) {
    console.error("Error linking flyer to venue:", error);
    res.status(500).json({ error: "Failed to link flyer to venue" });
  }
});

app.get("/flyers/:id/venues", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        venues.id,
        venues.venue_name AS "venueName",
        venues.address,
        venues.city,
        venues.state,
        venues.image_url AS "imageUrl",
        venues.cloudinary_public_id AS "cloudinaryPublicId",
        venue_flyers.created_at AS "linkedAt"
      FROM venue_flyers
      JOIN venues ON venue_flyers.venue_id = venues.id
      WHERE venue_flyers.flyer_id = $1
      ORDER BY LOWER(venues.venue_name) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting flyer venues:", error);
    res.status(500).json({ error: "Failed to get flyer venues" });
  }
});

app.post("/flyers/:id/venues", async (req, res) => {
  try {
    const { venueName, address, city, state } = req.body;

    if (!venueName || venueName.trim() === "") {
      return res.status(400).json({ error: "Venue name is required" });
    }

    const flyerCheck = await pool.query(
      "SELECT id FROM flyers WHERE id = $1;",
      [req.params.id]
    );

    if (flyerCheck.rows.length === 0) {
      return res.status(404).json({ error: "Flyer not found" });
    }

    const existingVenue = await pool.query(
      `
      SELECT
        id,
        venue_name AS "venueName",
        address,
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM venues
      WHERE LOWER(TRIM(venue_name)) = LOWER(TRIM($1))
      LIMIT 1;
      `,
      [venueName.trim()]
    );

    let venue = existingVenue.rows[0];

    if (!venue) {
      const venueResult = await pool.query(
        `
        INSERT INTO venues (venue_name, address, city, state)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          venue_name AS "venueName",
          address,
          city,
          state,
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [venueName.trim(), address || "", city || "", state || ""]
      );

      venue = venueResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO venue_flyers (venue_id, flyer_id)
      VALUES ($1, $2)
      ON CONFLICT (venue_id, flyer_id)
      DO NOTHING;
      `,
      [venue.id, req.params.id]
    );

    res.status(201).json(venue);
  } catch (error) {
    console.error("Error linking venue to flyer:", error);
    res.status(500).json({ error: "Failed to link venue to flyer" });
  }
});

// ===== SONGS =====

app.get("/songs", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        songs.id,
        songs.song_title AS "songTitle",
        songs.band_name AS "bandName",
        songs.album_title AS "albumTitle",
        songs.album_image_url AS "albumImageUrl",
        songs.created_at AS "createdAt",
        songs.updated_at AS "updatedAt"
      FROM songs
      ORDER BY LOWER(songs.song_title) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting songs:", error);
    res.status(500).json({ error: "Failed to get songs" });
  }
});

app.post("/songs", async (req, res) => {
  try {
    const { songTitle, bandName, albumTitle, albumImageUrl } = req.body;

    if (!songTitle || songTitle.trim() === "") {
      return res.status(400).json({ error: "Song title is required" });
    }

    const result = await pool.query(
      `
      INSERT INTO songs (song_title, band_name, album_title, album_image_url)
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        song_title AS "songTitle",
        band_name AS "bandName",
        album_title AS "albumTitle",
        album_image_url AS "albumImageUrl",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        songTitle.trim(),
        bandName || "",
        albumTitle || "",
        albumImageUrl || ""
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding song:", error);
    res.status(500).json({ error: "Failed to add song" });
  }
});

app.put("/songs/:id", async (req, res) => {
  try {
    const { songTitle, bandName, albumTitle, albumImageUrl } = req.body;

    const result = await pool.query(
      `
      UPDATE songs
      SET
        song_title = COALESCE($1, song_title),
        band_name = COALESCE($2, band_name),
        album_title = COALESCE($3, album_title),
        album_image_url = COALESCE($4, album_image_url),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING
        id,
        song_title AS "songTitle",
        band_name AS "bandName",
        album_title AS "albumTitle",
        album_image_url AS "albumImageUrl",
        created_at AS "createdAt",
        updated_at AS "updatedAt";
      `,
      [
        songTitle ?? null,
        bandName ?? null,
        albumTitle ?? null,
        albumImageUrl ?? null,
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Song not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating song:", error);
    res.status(500).json({ error: "Failed to update song" });
  }
});

app.delete("/songs/:id", async (req, res) => {
  try {
    const existing = await pool.query(
      "SELECT id FROM songs WHERE id = $1;",
      [req.params.id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Song not found" });
    }

    await pool.query("DELETE FROM album_songs WHERE song_id = $1;", [req.params.id]);
    await pool.query("DELETE FROM songs WHERE id = $1;", [req.params.id]);

    res.json({
      success: true,
      deletedId: Number(req.params.id)
    });
  } catch (error) {
    console.error("Error deleting song:", error);
    res.status(500).json({ error: "Failed to delete song" });
  }
});

// ===== ALBUM / SONG LINKS =====

app.get("/albums/:id/songs", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        songs.id,
        songs.song_title AS "songTitle",
        COALESCE(songs.band_name, albums.band_name, '') AS "bandName",
        COALESCE(songs.album_title, albums.album_title, '') AS "albumTitle",
        COALESCE(songs.album_image_url, albums.image_url, '') AS "albumImageUrl",
        album_songs.created_at AS "linkedAt"
      FROM album_songs
      JOIN songs ON album_songs.song_id = songs.id
      JOIN albums ON album_songs.album_id = albums.id
      WHERE album_songs.album_id = $1
      ORDER BY LOWER(songs.song_title) ASC;
      `,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting album songs:", error);
    res.status(500).json({ error: "Failed to get album songs" });
  }
});

app.post("/albums/:id/songs", async (req, res) => {
  try {
    const { songTitle } = req.body;

    if (!songTitle || songTitle.trim() === "") {
      return res.status(400).json({ error: "Song title is required" });
    }

    const albumCheck = await pool.query(
      `
      SELECT
        id,
        album_title AS "albumTitle",
        band_name AS "bandName",
        image_url AS "albumImageUrl"
      FROM albums
      WHERE id = $1;
      `,
      [req.params.id]
    );

    if (albumCheck.rows.length === 0) {
      return res.status(404).json({ error: "Album not found" });
    }

    const album = albumCheck.rows[0];

    const existingSong = await pool.query(
      `
      SELECT
        id,
        song_title AS "songTitle",
        band_name AS "bandName",
        album_title AS "albumTitle",
        album_image_url AS "albumImageUrl",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM songs
      WHERE LOWER(TRIM(song_title)) = LOWER(TRIM($1))
        AND LOWER(TRIM(COALESCE(album_title, ''))) = LOWER(TRIM($2))
        AND LOWER(TRIM(COALESCE(band_name, ''))) = LOWER(TRIM($3))
      LIMIT 1;
      `,
      [
        songTitle.trim(),
        album.albumTitle || "",
        album.bandName || ""
      ]
    );

    let song = existingSong.rows[0];

    if (!song) {
      const songResult = await pool.query(
        `
        INSERT INTO songs (song_title, band_name, album_title, album_image_url)
        VALUES ($1, $2, $3, $4)
        RETURNING
          id,
          song_title AS "songTitle",
          band_name AS "bandName",
          album_title AS "albumTitle",
          album_image_url AS "albumImageUrl",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [
          songTitle.trim(),
          album.bandName || "",
          album.albumTitle || "",
          album.albumImageUrl || ""
        ]
      );

      song = songResult.rows[0];
    }

    await pool.query(
      `
      INSERT INTO album_songs (album_id, song_id)
      VALUES ($1, $2)
      ON CONFLICT (album_id, song_id)
      DO NOTHING;
      `,
      [req.params.id, song.id]
    );

    res.status(201).json(song);
  } catch (error) {
    console.error("Error linking song to album:", error);
    res.status(500).json({ error: "Failed to link song to album" });
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
