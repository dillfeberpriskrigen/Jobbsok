import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';
import * as schema from '$lib/server/db/authSchema'; // your renamed schema

if (!env.AUTH_DATABASE_URL) {
  throw new Error('AUTH_DATABASE_URL is not set');
}

const pool = mysql.createPool(env.AUTH_DATABASE_URL);

export const authDb = drizzle(pool, {
  schema,
  mode: 'default', // required when passing schema
});

console.log('Auth DB initialized with tables:', Object.keys(schema));