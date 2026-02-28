// src/routes/api/jobs/search/+server.ts
import { jobDb } from '$lib/server/db';
import { jobs } from '$lib/server/db/jobSchema.ts';
import { json } from '@sveltejs/kit';
import { and, or, inArray, sql } from 'drizzle-orm';

export async function POST({ request }) {
  try {
    // Read payload safely
    const payload = await request.json();
    console.log('[DEBUG][POST] Payload received:', payload);

    const regions = Array.isArray(payload.regions) ? payload.regions : [];
    const jobTitles = Array.isArray(payload.jobTitles) ? payload.jobTitles : [];
    const keyword = typeof payload.keyword === 'string' ? payload.keyword : '';

    // Clean & trim regions
    const cleanRegions = regions
      .filter(r => r != null)
      .map(r => r.toString().trim())
      .filter(Boolean);
    console.log('[DEBUG][POST] Cleaned Regions:', cleanRegions);

    // Clean & trim job titles
    const cleanTitles = jobTitles
      .filter(t => t != null)
      .map(t => t.toString().trim())
      .filter(Boolean);
    console.log('[DEBUG][POST] Cleaned Job Titles:', cleanTitles);

    // Trim keyword
    const trimmedKeyword = keyword.trim();
    console.log('[DEBUG][POST] Trimmed Keyword:', trimmedKeyword);

    // Build conditions
    const conditions = [];

    if (cleanRegions.length > 0) {
      conditions.push(inArray(jobs.region, cleanRegions));
    }

    const titleConditions = [];

    for (const t of cleanTitles) {
      const searchTerm = `%${t.toLowerCase()}%`;
      titleConditions.push(sql`LOWER(${jobs.headline}) LIKE ${searchTerm}`);
    }

    if (trimmedKeyword.length > 0) {
      const searchTerm = `%${trimmedKeyword.toLowerCase()}%`;
      titleConditions.push(sql`LOWER(${jobs.headline}) LIKE ${searchTerm}`);
    }

    if (titleConditions.length > 0) {
      conditions.push(or(...titleConditions));
    }

    // Build query
    let query = jobDb.select().from(jobs);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    query = query.orderBy(jobs.publication_date, 'desc');

    // Debug final SQL
    console.log('Drizzle Query SQL:', query.toSQL?.() || 'Cannot get SQL');

    const results = await query;
    console.log('[DEBUG][POST] Search results count:', results.length);

    return json(results);
  } catch (error) {
    console.error('[ERROR][POST] /api/jobs/search failed:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}