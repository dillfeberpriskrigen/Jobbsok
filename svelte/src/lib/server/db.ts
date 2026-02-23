// src/lib/server/db.ts
import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';
import mysql from 'mysql2/promise';
import * as schema from './db/schema';
import * as authSchema from './db/authSchema'; 
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// MySQL connection pool
const client = mysql.createPool(env.DATABASE_URL);

// Drizzle client - combine both schemas
export const db = drizzle(client, { 
  schema: {
    ...schema,
    ...authSchema
  },
  mode: 'default'
});
export { sql };
