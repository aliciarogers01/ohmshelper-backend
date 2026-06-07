const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3000;

// Temporary in-memory band list.
// Later this can be replaced with a real database.
let bands = [
  {
    id: 1,
    bandName: "FEDS",
    city: "Cleveland",
    state: "OH",
    radioShow: "",
    imageUrl: ""
  },
  {
    id: 2,
    bandName: "First Offense",
    city: "Cleveland",
    state: "OH",
    radioShow: "",
    imageUrl: ""
  }
];

// Health check for Railway
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "OHMS band backend is running"
  });
});

// Another health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy"
  });
});

// Get all bands
app.get("/bands", (req, res) => {
  res.json(bands);
});

// Get one band by ID
app.get("/bands/:id", (req, res) => {
  const id = Number(req.params.id);
  const band = bands.find((b) => b.id === id);

  if (!band) {
    return res.status(404).json({
      error: "Band not found"
    });
  }

  res.json(band);
});

// Add a new band
app.post("/bands", (req, res) => {
  const { bandName, city, state, radioShow, imageUrl } = req.body;

  if (!bandName || bandName.trim() === "") {
    return res.status(400).json({
      error: "Band name is required"
    });
  }

  const newBand = {
    id: Date.now(),
    bandName: bandName.trim(),
    city: city || "",
    state: state || "",
    radioShow: radioShow || "",
    imageUrl: imageUrl || ""
  };

  bands.push(newBand);

  bands.sort((a, b) =>
    a.bandName.localeCompare(b.bandName, undefined, { sensitivity: "base" })
  );

  res.status(201).json(newBand);
});

// Update an existing band
app.put("/bands/:id", (req, res) => {
  const id = Number(req.params.id);
  const bandIndex = bands.findIndex((b) => b.id === id);

  if (bandIndex === -1) {
    return res.status(404).json({
      error: "Band not found"
    });
  }

  const existingBand = bands[bandIndex];

  const updatedBand = {
    ...existingBand,
    bandName: req.body.bandName ?? existingBand.bandName,
    city: req.body.city ?? existingBand.city,
    state: req.body.state ?? existingBand.state,
    radioShow: req.body.radioShow ?? existingBand.radioShow,
    imageUrl: req.body.imageUrl ?? existingBand.imageUrl
  };

  bands[bandIndex] = updatedBand;

  bands.sort((a, b) =>
    a.bandName.localeCompare(b.bandName, undefined, { sensitivity: "base" })
  );

  res.json(updatedBand);
});

// Delete a band
app.delete("/bands/:id", (req, res) => {
  const id = Number(req.params.id);
  const startingCount = bands.length;

  bands = bands.filter((b) => b.id !== id);

  if (bands.length === startingCount) {
    return res.status(404).json({
      error: "Band not found"
    });
  }

  res.json({
    success: true,
    deletedId: id
  });
});

// Catch bad routes instead of crashing
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`OHMS band backend running on port ${PORT}`);
});
