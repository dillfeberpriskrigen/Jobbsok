import { jobDb } from '$lib/server/db';
import { jobs } from '$lib/server/db/jobSchema';
import { json, error } from '@sveltejs/kit';
import { inArray } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { jobIds } = body;

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return json([], { status: 200 });
    }

    const results = await jobDb.select().from(jobs)
      .where(inArray(jobs.id, jobIds))
      .orderBy(jobs.publication_date, 'desc');

    return json(results);
  } catch (err) {
    console.error('[ERROR][POST] /jobs/byIds', err);
    throw error(500, 'Failed to fetch jobs by IDs');
  }
};