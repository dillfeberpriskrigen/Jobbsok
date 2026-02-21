
// src/lib/server/db/schema.ts
import { mysqlTable, varchar, text, longtext, datetime, date, timestamp } from 'drizzle-orm/mysql-core';

export const jobs = mysqlTable('jobs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  headline: text('headline'),
  employer_name: text('employer_name'),
  municipality: text('municipality'),
  region: text('region'),
  webpage_url: text('webpage_url'),
  publication_date: datetime('publication_date'),
  application_deadline: date('application_deadline'),
  description: longtext('description'),
  fetched_at: timestamp('fetched_at').defaultNow(), // maps to CURRENT_TIMESTAMP
});