import { jobDb } from '$lib/server/db.js';
import { jobs } from '$lib/server/db/jobSchema.js';
import { json, error } from '@sveltejs/kit';
import { desc, inArray } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const rawJobIds: unknown[] = Array.isArray(body?.jobIds) ? body.jobIds : [];
    const jobIds = Array.isArray(body?.jobIds)
      ? rawJobIds.filter((jobId: unknown): jobId is string => typeof jobId === 'string' && jobId.length > 0)
      : [];

    if (jobIds.length === 0) {
      return json([], { status: 200 });
    }

    const results = await jobDb.select().from(jobs)
      .where(inArray(jobs.id, jobIds))
      .orderBy(desc(jobs.publication_date));

    return json(results);
  } catch (err) {
    console.error('[ERROR][POST] /jobs/byIds', err);
    throw error(500, 'Failed to fetch jobs by IDs');
  }
};
