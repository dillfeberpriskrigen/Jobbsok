import { db, sql } from '$lib/server/db';
import { jobs } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const { regionCodes = [], jobTitles = [] } = await request.json();

  let query = db.select().from(jobs);

  // Filter by region
  if (regionCodes.length > 0) {
    query = query.where(jobs.region.in(regionCodes));
  }

  // Filter by job titles (case-insensitive)
  if (jobTitles.length > 0) {
    // Build OR conditions manually
    const titleConditions = jobTitles.map(
      title => sql`${jobs.headline} LIKE ${'%' + title + '%'}`
    );
    query = query.where(sql.join(titleConditions, ' OR '));
  }

  // Order newest first
  query = query.orderBy(sql`${jobs.publication_date} DESC`);

  const results = await query;

  return json(results);
}