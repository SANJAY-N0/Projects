import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Setup directories
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAPS_DIR = path.join(PUBLIC_DIR, 'floor-plans');
const GRAPHS_DIR = path.join(PUBLIC_DIR, 'graphs');

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(MAPS_DIR)) fs.mkdirSync(MAPS_DIR, { recursive: true });
if (!fs.existsSync(GRAPHS_DIR)) fs.mkdirSync(GRAPHS_DIR, { recursive: true });

// Setup multer storage for SVG files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, MAPS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original filename or sanitize
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, sanitized);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.svg') {
      return cb(new Error('Only SVG floor plans are allowed!'));
    }
    cb(null, true);
  }
});

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// API: List all SVG files in the floor-plans directory
app.get('/api/maps', (req, res) => {
  try {
    const files = fs.readdirSync(MAPS_DIR);
    const svgFiles = files
      .filter(file => file.endsWith('.svg'))
      .map(file => ({
        name: file,
        displayName: file.replace('.svg', '').replace(/[-_]/g, ' '),
        url: `/floor-plans/${file}`
      }));
    res.json(svgFiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read floor plans directory' });
  }
});

// API: Upload a new floor plan SVG
app.post('/api/upload', upload.single('floorPlan'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file is not an SVG' });
  }
  res.json({
    message: 'Floor plan uploaded successfully',
    filename: req.file.filename,
    url: `/floor-plans/${req.file.filename}`
  });
});

// API: Save navigation graph for a map
app.post('/api/graphs/:mapName', (req, res) => {
  const { mapName } = req.params;
  const graphData = req.body;

  if (!mapName || !graphData) {
    return res.status(400).json({ error: 'Missing map name or graph data' });
  }

  // Clean filename to prevent path traversal
  const safeMapName = mapName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filePath = path.join(GRAPHS_DIR, `${safeMapName}.json`);

  try {
    fs.writeFileSync(filePath, JSON.stringify(graphData, null, 2), 'utf8');
    res.json({ message: `Graph configuration saved successfully for ${safeMapName}` });
  } catch (error) {
    console.error('Save graph error:', error);
    res.status(500).json({ error: 'Failed to save graph configuration' });
  }
});

// API: Load navigation graph for a map
app.get('/api/graphs/:mapName', (req, res) => {
  const { mapName } = req.params;
  const safeMapName = mapName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filePath = path.join(GRAPHS_DIR, `${safeMapName}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No graph configuration found for this map' });
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(rawData));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load graph configuration' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 k-Map Runner started at http://localhost:${PORT}`);
  console.log(`📂 Place your SVG files in: ${MAPS_DIR}\n`);
});
