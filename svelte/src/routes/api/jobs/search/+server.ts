import { db } from '$lib/server/db';
import { jobs } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { and, or, inArray, sql } from 'drizzle-orm';

export async function POST({ request }) {
  const { regions = [], jobTitles = [], keyword = "" } = await request.json();

  const conditions = [];

  const cleanRegions = regions.map(r => r.trim()).filter(Boolean);
  if (cleanRegions.length > 0) {
    conditions.push(inArray(jobs.region, cleanRegions));
  }

  const titleConditions = [];

  for (const t of jobTitles.map(j => j.trim()).filter(Boolean)) {
    const searchTerm = `%${t.toLowerCase()}%`;
    titleConditions.push(sql`LOWER(${jobs.headline}) LIKE ${searchTerm}`);
  }

  const trimmedKeyword = keyword.trim();
  if (trimmedKeyword.length > 0) {
    const searchTerm = `%${trimmedKeyword.toLowerCase()}%`;
    titleConditions.push(sql`LOWER(${jobs.headline}) LIKE ${searchTerm}`);
  }

  if (titleConditions.length > 0) {
    conditions.push(or(...titleConditions));
  }

  let query = db.select().from(jobs);

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy(jobs.publication_date, 'desc');

  console.log('Drizzle Query SQL:', query.toSQL?.() || 'Cannot get SQL');
  console.log('Regions:', regions);
  console.log('Job titles:', jobTitles);
  console.log('Keyword:', keyword);

  const results = await query;

  return json(results);
}