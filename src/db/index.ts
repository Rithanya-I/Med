import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig } from 'pg';
import * as schema from './schema.ts';
import dotenv from 'dotenv';

dotenv.config();

declare global {
  var _postgresPool: Pool | undefined;
}

export const getDbConfig = (): PoolConfig => {
  // Support standard Supabase / PostgreSQL connection strings:
  // e.g. postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres (pooled)
  // or   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres (direct)
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SUPABASE_DB_URL ||
    process.env.POSTGRES_URL;

  // Supabase PostgreSQL connections require SSL.
  const sslOption =
    process.env.DB_SSL === 'false' || process.env.SQL_SSL === 'false'
      ? false
      : { rejectUnauthorized: false };

  if (connectionString) {
    return {
      connectionString,
      ssl: sslOption,
      max: 10,
      connectionTimeoutMillis: 15000,
    };
  }

  // Fallback to separate connection variables
  const port = process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432;

  return {
    host: process.env.SQL_HOST || process.env.SUPABASE_DB_HOST || 'localhost',
    port: Number.isFinite(port) ? port : 5432,
    user: process.env.SQL_USER || process.env.SUPABASE_DB_USER || 'postgres',
    password: process.env.SQL_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
    database: process.env.SQL_DB_NAME || process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: sslOption,
    max: 10,
    connectionTimeoutMillis: 15000,
  };
};

const rawDbUrl =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  process.env.POSTGRES_URL ||
  '';

export const isDbConfigured = Boolean(
  rawDbUrl &&
    !rawDbUrl.includes('your-project-ref') &&
    !rawDbUrl.includes('YOUR_PASSWORD') &&
    !rawDbUrl.includes('[YOUR-PASSWORD]') &&
    !rawDbUrl.includes('your-password')
) || Boolean(
  process.env.SQL_HOST &&
    process.env.SQL_HOST !== 'localhost' &&
    !process.env.SQL_HOST.includes('your-project-ref') &&
    process.env.SQL_PASSWORD &&
    process.env.SQL_PASSWORD !== 'your-db-password'
);

export const createPool = () => {
  if (!global._postgresPool) {
    if (isDbConfigured) {
      global._postgresPool = new Pool(getDbConfig());

      global._postgresPool.on('error', (err) => {
        console.error('Unexpected error on idle SQL pool client:', err?.message || err);
      });
    } else {
      // Unconfigured fallback pool
      global._postgresPool = new Pool({
        host: 'localhost',
        connectionTimeoutMillis: 1000,
      });
      global._postgresPool.on('error', () => {
        // Suppress idle errors when unconfigured
      });
    }
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
