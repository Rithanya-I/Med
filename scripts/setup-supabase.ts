import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { getDbConfig, isDbConfigured } from '../src/db/index.ts';
import { seedDatabase } from '../src/db/seed.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runSetup() {
  console.log('\n==========================================================');
  console.log('   MediSlot AI — Supabase Setup & Verification Wizard     ');
  console.log('==========================================================\n');

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || '';

  console.log('1. Checking Environment Variables...');
  const isUrlValid = Boolean(supabaseUrl && !supabaseUrl.includes('your-project-ref'));
  const isAnonValid = Boolean(anonKey && !anonKey.includes('your-anon-key'));
  const isServiceValid = Boolean(serviceKey && !serviceKey.includes('your-service-role-secret-key'));
  const isDbUrlValid = Boolean(dbUrl && !dbUrl.includes('your-project-ref') && !dbUrl.includes('YOUR_PASSWORD'));

  console.log(`   - SUPABASE_URL:             ${isUrlValid ? '✓ Configured (' + supabaseUrl + ')' : '✗ Missing or placeholder'}`);
  console.log(`   - SUPABASE_ANON_KEY:        ${isAnonValid ? '✓ Configured' : '✗ Missing or placeholder'}`);
  console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${isServiceValid ? '✓ Configured' : '⚠ Missing (optional, used for backend admin)'}`);
  console.log(`   - DATABASE_URL:             ${isDbUrlValid ? '✓ Configured' : '✗ Missing or placeholder'}`);

  if (!isUrlValid || !isAnonValid || !isDbUrlValid) {
    console.log('\n----------------------------------------------------------');
    console.log('⚠ ACTION REQUIRED: Update your .env file with your Supabase credentials:');
    console.log('  1. Open your Supabase Dashboard: https://supabase.com/dashboard');
    console.log('  2. In Project Settings -> API:');
    console.log('     Copy Project URL and anon public key');
    console.log('  3. In Project Settings -> Database -> Connection string:');
    console.log('     Copy the URI (Transaction pooler on port 6543 recommended)');
    console.log('  4. Paste into c:\\Users\\Rithanya.I\\Med\\.env');
    console.log('----------------------------------------------------------\n');
  }

  // 2. Test Supabase API Client
  if (isUrlValid && (isAnonValid || isServiceValid)) {
    console.log('2. Testing Supabase JS Client API...');
    try {
      const clientKey = isServiceValid ? serviceKey : anonKey;
      const client = createClient(supabaseUrl, clientKey, {
        auth: { persistSession: false },
      });
      const { data, error } = await client.auth.getSession();
      if (error && error.message && !error.message.includes('session')) {
        console.warn(`   ⚠ Supabase API note: ${error.message}`);
      } else {
        console.log('   ✓ Supabase REST/Auth API connection successful.');
      }
    } catch (err: any) {
      console.warn(`   ⚠ Supabase client warning: ${err?.message || err}`);
    }
  } else {
    console.log('2. Skipping Supabase JS Client API test (credentials not ready).');
  }

  // 3. PostgreSQL Database Connection & Auto-Migration
  console.log('\n3. Testing PostgreSQL Connection & Applying Schema...');
  if (isDbUrlValid || isDbConfigured) {
    try {
      const pool = new Pool(getDbConfig());
      const testRes = await pool.query('SELECT NOW() AS connected_at');
      console.log(`   ✓ Connected to PostgreSQL database at ${testRes.rows[0].connected_at}`);

      // Read and execute supabase/schema.sql
      const schemaPath = path.join(rootDir, 'supabase', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        console.log('   → Applying supabase/schema.sql (tables, indexes, RLS policies)...');
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await pool.query(schemaSql);
        console.log('   ✓ Schema applied successfully (users, doctors, specialties, appointments, favorites, medibot_messages).');
      }

      // 4. Seed Database
      console.log('\n4. Verifying & Seeding Initial Data...');
      await seedDatabase();
      console.log('   ✓ Initial medical specialties & verified doctors are populated.');

      await pool.end();
    } catch (dbErr: any) {
      console.error(`   ✗ PostgreSQL error: ${dbErr?.message || dbErr}`);
      console.log('\nTip: Ensure your DATABASE_URL password is correct and pooler port is 6543 (or direct port 5432).');
    }
  } else {
    console.log('   ✗ Database credentials not found in .env. Skipping schema execution.');
  }

  console.log('\n==========================================================');
  console.log('Setup check finished. Start the app with: npm run dev');
  console.log('==========================================================\n');
}

runSetup().catch((err) => {
  console.error('Setup failed with error:', err);
  process.exit(1);
});
