import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Serve static files from dist
app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true,
}));

// SPA fallback - all non-file routes serve index.html
// Use middleware instead of wildcard route for Express 5 compatibility
app.use((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  fs.createReadStream(indexPath).pipe(res);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 少儿识字乐园 running at http://0.0.0.0:${PORT}`);
});
