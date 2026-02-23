import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as jobSchema from './jobSchema.ts';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = mysql.createPool(env.DATABASE_URL);

export const db = drizzle(client, { jobSchema, mode: 'default' });
