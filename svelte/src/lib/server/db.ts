// src/lib/server/db.ts
import { sql } from 'drizzle-orm';

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as jobSchema from './db/jobSchema';
import * as authSchema from './db/authSchema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
if (!env.AUTH_DATABASE_URL) throw new Error('AUTH_DATABASE_URL is not set');

// Job DB pool
const jobClient = mysql.createPool(env.DATABASE_URL);
export const jobDb = drizzle(jobClient, { schema: jobSchema, mode:'default' });

// Auth DB pool
const authClient = mysql.createPool(env.AUTH_DATABASE_URL);
export const authDb = drizzle(authClient, { schema: authSchema, mode:'default' });

export { sql };