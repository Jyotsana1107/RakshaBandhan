const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { put, list } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, 'data', 'store.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const isVercel = Boolean(process.env.VERCEL);
const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const useBlobStorage = isVercel || hasBlobToken;

function ensureStorageConfigured() {
  if (isVercel && !hasBlobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured in Vercel');
  }
}

function sendStorageError(res) {
  res.status(503).json({ error: 'Vercel Blob storage is not configured. Add BLOB_READ_WRITE_TOKEN and redeploy.' });
}

if (!useBlobStorage) {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
}

async function readStore() {
  if (useBlobStorage) {
    ensureStorageConfigured();
    const result = await list({ prefix: 'data/store.json', limit: 1 });
    if (!result.blobs.length) return {};
    const response = await fetch(result.blobs[0].url);
    if (!response.ok) throw new Error('Could not read gift data');
    return response.json();
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

async function writeStore(store) {
  if (useBlobStorage) {
    ensureStorageConfigured();
    await put('data/store.json', JSON.stringify(store, null, 2), {
      access: 'public',
      addRandomSuffix: false
    });
    return;
  }

  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

// Short, unambiguous id (no 0/O/1/l confusion), checked for collisions
function generateId(store) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let id;
  do {
    id = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join('');
  } while (store[id]);
  return id;
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(UPLOADS_DIR, req.generatedId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomInt(1e6)}${ext}`);
  }
});

const upload = multer({
  storage: useBlobStorage ? multer.memoryStorage() : diskStorage,
  limits: { fileSize: 2 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Assign the id before multer writes files, so photos land in the right folder
app.use('/api/create', (req, res, next) => {
  readStore()
    .then(store => {
      req.generatedId = generateId(store);
      next();
    })
    .catch(err => {
      if (err.message.includes('BLOB_READ_WRITE_TOKEN')) return sendStorageError(res);
      next(err);
    });
});

app.post('/api/create', upload.array('photos', 6), async (req, res) => {
  try {
    const store = await readStore();
    const id = req.generatedId;
    const b = req.body;

    if (!b.senderName || !b.siblingName || !b.message) {
      return res.status(400).json({ error: 'Name, sibling name, and a message are required.' });
    }

    const photos = useBlobStorage
      ? await Promise.all((req.files || []).map(async file => {
        const extension = path.extname(file.originalname) || '.jpg';
        const blob = await put(`uploads/${id}/${Date.now()}-${crypto.randomInt(1e6)}${extension}`, file.buffer, {
          access: 'public'
        });
        return blob.url;
      }))
      : (req.files || []).map(file => `/uploads/${id}/${file.filename}`);

    store[id] = {
      id,
      senderName: b.senderName.trim(),
      siblingName: b.siblingName.trim(),
      relationship: (b.relationship || '').trim(),
      nickname: (b.nickname || '').trim(),
      message: b.message.trim(),
      memory: (b.memory || '').trim(),
      funnyLine: (b.funnyLine || '').trim(),
      photos,
      createdAt: new Date().toISOString()
    };

    await writeStore(store);
    res.json({ id, url: `/rakhi/${id}` });
  } catch (err) {
    console.error(err);
    if (err.message.includes('BLOB_READ_WRITE_TOKEN')) return sendStorageError(res);
    res.status(500).json({ error: 'Something went wrong creating your surprise.' });
  }
});

app.get('/api/rakhi/:id', (req, res) => {
  readStore()
    .then(store => {
      const entry = store[req.params.id];
      if (!entry) return res.status(404).json({ error: 'not found' });
      res.json(entry);
    })
    .catch(err => {
      if (err.message.includes('BLOB_READ_WRITE_TOKEN')) return sendStorageError(res);
      res.status(500).json({ error: 'Could not read gift data' });
    });
});

app.get('/rakhi/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'rakhi.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Each photo must be smaller than 2MB.' });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(413).json({ error: 'Please choose no more than 6 photos.' });
  }
  res.status(500).json({ error: 'The server could not process this request.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Rakhi gift running at http://localhost:${PORT}`);
  });
}

module.exports = app;
