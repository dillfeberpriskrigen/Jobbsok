import { jobDb } from '$lib/server/db';
import { occupationNames } from '$lib/server/db/jobSchema';
import { json } from '@sveltejs/kit';
import { asc, isNotNull, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '200'), 500);

  try {
    const rows = query
      ? await jobDb
          .select({
            id: occupationNames.id,
            label: occupationNames.label
          })
          .from(occupationNames)
          .where(
            sql`LOWER(${occupationNames.label}) LIKE ${`%${query.toLowerCase()}%`}`
          )
          .orderBy(asc(occupationNames.label))
          .limit(limit)
      : await jobDb
          .select({
            id: occupationNames.id,
            label: occupationNames.label
          })
          .from(occupationNames)
          .where(isNotNull(occupationNames.label))
          .orderBy(asc(occupationNames.label))
          .limit(limit);

    const titles = [...new Set(rows.map((row) => row.label?.trim()).filter(Boolean))];
    return json(titles);
  } catch (err) {
    console.error('[ERROR][GET] /api/jobs/titles failed', err);
    return json({ error: 'Failed to fetch job titles' }, { status: 500 });
  }
};
