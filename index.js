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

  await pool.query(`
    ALTER TABLE artists
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE artists
    ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE artists
    ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE artists
    ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE artists
    ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE artists
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS albums (
      id SERIAL PRIMARY KEY,
      album_title TEXT NOT NULL,
      release_year TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      cloudinary_public_id TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE albums
    ADD COLUMN IF NOT EXISTS release_year TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE albums
    ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE albums
    ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT DEFAULT '';
  `);

  await pool.query(`
    ALTER TABLE albums
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

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

  await pool.query(`
    ALTER TABLE band_artists
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT '';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS band_albums (
      id SERIAL PRIMARY KEY,
      band_id INTEGER NOT NULL REFERENCES bands(id) ON DELETE CASCADE,
      album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (band_id, album_id)
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

/*
  One-time CSV import route.

  Expected JSON from PowerShell:

  {
    "bands": [
      {
        "band_name": "666 Pack",
        "city": "CLE",
        "state": ""
      }
    ]
  }

  This route does NOT require image_url.
  Photos will be added later through /bands/:id/image.
*/
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
        INSERT INTO bands
          (band_name, city, state)
        VALUES
          ($1, $2, $3);
        `,
        [
          band.band_name,
          band.city || "",
          band.state || ""
        ]
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
      [
        artistName.trim(),
        role || "",
        city || "",
        state || ""
      ]
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
      [
        artistName ?? null,
        role ?? null,
        city ?? null,
        state ?? null,
        req.params.id
      ]
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
        city,
        state,
        image_url AS "imageUrl",
        cloudinary_public_id AS "cloudinaryPublicId",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM artists
      WHERE LOWER(artist_name) = LOWER($1)
      LIMIT 1;
      `,
      [artistName.trim()]
    );

    let artist = existingArtist.rows[0];

    if (!artist) {
      const artistResult = await pool.query(
        `
        INSERT INTO artists (artist_name, city, state)
        VALUES ($1, $2, $3)
        RETURNING
          id,
          artist_name AS "artistName",
          city,
          state,
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [
          artistName.trim(),
          city || "",
          state || ""
        ]
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
      [
        req.params.id,
        artist.id,
        role || ""
      ]
    );

    res.status(201).json({
      ...artist,
      role: role || ""
    });
  } catch (error) {
    console.error("Error adding band artist:", error);
    res.status(500).json({ error: "Failed to add band artist" });
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
        city,
        state,
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
    console.error("Error uploading artist image:", error);
    res.status(500).json({ error: "Failed to upload artist image" });
  }
});

// ===== ALBUMS =====

app.get("/albums", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        albums.id,
        albums.album_title AS "albumTitle",
        albums.release_year AS "releaseYear",
        albums.image_url AS "imageUrl",
        albums.cloudinary_public_id AS "cloudinaryPublicId",
        bands.band_name AS "bandName",
        albums.created_at AS "createdAt",
        albums.updated_at AS "updatedAt"
      FROM albums
      LEFT JOIN band_albums ON albums.id = band_albums.album_id
      LEFT JOIN bands ON band_albums.band_id = bands.id
      ORDER BY LOWER(albums.album_title) ASC;
    `);

    res.json(result.rows);
  } catch (error) {
    console.error("Error getting albums:", error);
    res.status(500).json({ error: "Failed to get albums" });
  }
});

app.get("/bands/:id/albums", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        albums.id,
        albums.album_title AS "albumTitle",
        albums.release_year AS "releaseYear",
        albums.image_url AS "imageUrl",
        albums.cloudinary_public_id AS "cloudinaryPublicId",
        bands.band_name AS "bandName",
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
    const { albumTitle, releaseYear } = req.body;

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

    const existingAlbum = await pool.query(
      `
      SELECT
        albums.id,
        albums.album_title AS "albumTitle",
        albums.release_year AS "releaseYear",
        albums.image_url AS "imageUrl",
        albums.cloudinary_public_id AS "cloudinaryPublicId",
        albums.created_at AS "createdAt",
        albums.updated_at AS "updatedAt"
      FROM albums
      JOIN band_albums ON albums.id = band_albums.album_id
      WHERE band_albums.band_id = $1
        AND LOWER(albums.album_title) = LOWER($2)
      LIMIT 1;
      `,
      [req.params.id, albumTitle.trim()]
    );

    let album = existingAlbum.rows[0];

    if (!album) {
      const albumResult = await pool.query(
        `
        INSERT INTO albums (album_title, release_year)
        VALUES ($1, $2)
        RETURNING
          id,
          album_title AS "albumTitle",
          release_year AS "releaseYear",
          image_url AS "imageUrl",
          cloudinary_public_id AS "cloudinaryPublicId",
          created_at AS "createdAt",
          updated_at AS "updatedAt";
        `,
        [albumTitle.trim(), releaseYear || ""]
      );

      album = albumResult.rows[0];

      await pool.query(
        `
        INSERT INTO band_albums (band_id, album_id)
        VALUES ($1, $2)
        ON CONFLICT (band_id, album_id)
        DO NOTHING;
        `,
        [req.params.id, album.id]
      );
    }

    res.status(201).json({
      ...album,
      bandName: bandCheck.rows[0].band_name
    });
  } catch (error) {
    console.error("Error adding band album:", error);
    res.status(500).json({ error: "Failed to add band album" });
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
