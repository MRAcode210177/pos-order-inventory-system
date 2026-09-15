import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import postgres from 'postgres';
import * as schema from './schema.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

let dbInstance: any = null;
let rawClient: any = null;

const INIT_ENUM_SQL = `CREATE TYPE order_status AS ENUM ('PENDING', 'RESERVED', 'PAID', 'COMPLETED', 'CANCELLED', 'EXPIRED');`;

const INIT_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(64) NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(64) DEFAULT 'General',
  image_url VARCHAR(512),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status order_status NOT NULL DEFAULT 'PENDING',
  total_cents INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price_cents INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  transaction_id VARCHAR(128),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

async function applySchema(client: any, isPglite = false) {
  try {
    if (isPglite) {
      await client.exec(INIT_ENUM_SQL);
    } else {
      await client.unsafe(INIT_ENUM_SQL);
    }
  } catch (e) {
    // Ignore duplicate type error if enum already exists
  }

  try {
    if (isPglite) {
      await client.exec(INIT_TABLES_SQL);
    } else {
      await client.unsafe(INIT_TABLES_SQL);
    }
  } catch (e: any) {
    console.warn('Schema verification notice:', e?.message || e);
  }
}

export async function initDb() {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.includes('localhost:5432/pos_db_placeholder')) {
    try {
      console.log('Connecting to PostgreSQL database via DATABASE_URL...');

      const isInternalRailway = databaseUrl.includes('railway.internal');
      const sslMode = isInternalRailway ? false : 'prefer';

      const client = postgres(databaseUrl, {
        max: 20,
        ssl: sslMode,
        connect_timeout: 10,
        idle_timeout: 30,
      });

      // 1. Verify TCP/IP connection to PostgreSQL server
      await client`SELECT 1`;
      console.log('✅ PostgreSQL TCP Connection established successfully.');

      rawClient = client;

      // 2. Ensure schema tables & types exist
      await applySchema(client, false);

      dbInstance = drizzlePostgres(client, { schema });
      console.log('🚀 Connected to PostgreSQL database successfully.');
      return dbInstance;
    } catch (err: any) {
      console.error('❌ PostgreSQL Connection Error:', err?.stack || err?.message || err);
      if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
        throw new Error(`Failed to connect to production PostgreSQL database: ${err?.message || err}`);
      }
      console.warn('Falling back to embedded PGlite engine for local development fallback...');
    }
  }

  // Persistent embedded PostgreSQL engine (PGlite)
  const baseDir = process.cwd().includes('apps/backend') || process.cwd().includes('apps\\backend')
    ? process.cwd()
    : path.resolve(process.cwd(), 'apps/backend');
  const dataDir = path.resolve(baseDir, '.data/pglite');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log(`Using persistent PostgreSQL engine (PGlite at ${dataDir})...`);
  const pglite = new PGlite(dataDir);
  rawClient = pglite;
  await applySchema(pglite, true);
  dbInstance = drizzlePglite(pglite, { schema });
  console.log('Persistent PostgreSQL initialized with schema.');
  return dbInstance;
}

// Lazy proxy for db to allow top-level imports before initDb() finishes
export const db: any = new Proxy(
  {},
  {
    get(_target, prop) {
      if (!dbInstance) {
        throw new Error('Database not initialized. Please call await initDb() before accessing db.');
      }
      return dbInstance[prop];
    },
  }
);

export { schema };
