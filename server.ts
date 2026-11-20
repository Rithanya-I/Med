import app from './src/server/app.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createPool, isDbConfigured } from './src/db/index.ts';
import { seedDatabase } from './src/db/seed.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function autoMigrateDatabase() {
  if (!isDbConfigured) return;
  try {
    const pool = createPool();
    const schemaPath = path.resolve(__dirname, 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(sql);
      console.log('✓ Supabase PostgreSQL schema auto-verified and applied.');
    }
    await seedDatabase();
  } catch (err: any) {
    console.warn('[Supabase Setup] Auto-migration notice:', err?.message || err);
  }
}

async function startServer() {
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(expressStatic(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await autoMigrateDatabase();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MediSlot AI server listening on http://localhost:${PORT}`);
  });
}

// In local production, import express.static
import express from 'express';
const expressStatic = express.static;

startServer();
