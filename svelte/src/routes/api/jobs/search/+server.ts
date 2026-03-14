// src/routes/api/jobs/search/+server.ts
import { jobDb } from '$lib/server/db.js';
import { jobs } from '$lib/server/db/jobSchema.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { and, desc, inArray, or, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Read payload safely
    const payload = await request.json();
    console.log('[DEBUG][POST] Payload received:', payload);

    const regions: unknown[] = Array.isArray(payload.regions) ? payload.regions : [];
    const municipalities: unknown[] = Array.isArray(payload.municipalities) ? payload.municipalities : [];
    const jobTitles: unknown[] = Array.isArray(payload.jobTitles) ? payload.jobTitles : [];
    const keyword = typeof payload.keyword === 'string' ? payload.keyword : '';

    // Clean & trim regions
    const cleanRegions = regions
      .filter((region): region is string | number => region != null)
      .map((region) => region.toString().trim())
      .filter(Boolean);
    console.log('[DEBUG][POST] Cleaned Regions:', cleanRegions);

    const cleanMunicipalities = municipalities
      .filter((municipality): municipality is string | number => municipality != null)
      .map((municipality) => municipality.toString().trim())
      .filter(Boolean);
    console.log('[DEBUG][POST] Cleaned Municipalities:', cleanMunicipalities);

    // Clean & trim job titles
    const cleanTitles = jobTitles
      .filter((title): title is string | number => title != null)
      .map((title) => title.toString().trim())
      .filter(Boolean);
    console.log('[DEBUG][POST] Cleaned Job Titles:', cleanTitles);

    // Trim keyword
    const trimmedKeyword = keyword.trim();
    console.log('[DEBUG][POST] Trimmed Keyword:', trimmedKeyword);

    // Build conditions
    const conditions = [];

    const locationConditions = [];
    if (cleanRegions.length > 0) {
      locationConditions.push(inArray(jobs.region, cleanRegions));
    }

    if (cleanMunicipalities.length > 0) {
      locationConditions.push(inArray(jobs.municipality, cleanMunicipalities));
    }

    if (locationConditions.length === 1) {
      conditions.push(locationConditions[0]);
    } else if (locationConditions.length > 1) {
      conditions.push(or(...locationConditions));
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
    const whereClause = conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);
    const query = whereClause
      ? jobDb.select().from(jobs).where(whereClause).orderBy(desc(jobs.publication_date))
      : jobDb.select().from(jobs).orderBy(desc(jobs.publication_date));

    // Debug final SQL
    console.log('Drizzle Query SQL:', query.toSQL?.() || 'Cannot get SQL');

    const results = await query;
    console.log('[DEBUG][POST] Search results count:', results.length);

    return json(results);
  } catch (error) {
    console.error('[ERROR][POST] /api/jobs/search failed:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
};
