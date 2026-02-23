import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

export default defineConfig({
  schema: './src/lib/server/db/authSchema.ts', // your auth schema file
  dialect: 'mysql',
  dbCredentials: { url: process.env.AUTH_DATABASE_URL }, // <--- use auth DB
  verbose: true,
  strict: true
});
