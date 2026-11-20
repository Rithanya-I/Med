import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_URL;

const sqlHost = process.env.SQL_HOST || process.env.SUPABASE_DB_HOST;
const sqlDbName = process.env.SQL_DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres';
const user =
  process.env.SQL_ADMIN_USER ||
  process.env.SQL_USER ||
  process.env.SUPABASE_DB_USER ||
  'postgres';
const password =
  process.env.SQL_ADMIN_PASSWORD ||
  process.env.SQL_PASSWORD ||
  process.env.SUPABASE_DB_PASSWORD ||
  '';
const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;

const dbCredentials = connectionString
  ? { url: connectionString, ssl: { rejectUnauthorized: false } }
  : {
      host: sqlHost || 'localhost',
      port: Number.isFinite(port) ? port : 5432,
      user: user,
      password: password,
      database: sqlDbName,
      ssl: { rejectUnauthorized: false },
    };

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  dbCredentials,
  verbose: true,
});
