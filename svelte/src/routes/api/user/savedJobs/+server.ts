// src/routes/api/user/savedJobs/+server.ts
import { authDb } from '$lib/server/db';
import { savedJobs } from '$lib/server/db/authSchema';
import { json, error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import type { RequestHandler } from '@sveltejs/kit';
import crypto from 'crypto';

// ---------------------------
// GET all saved jobs for user
// ---------------------------
export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || !locals.user.id) {
    throw error(401, 'Unauthorized');
  }

  try {
    const results = await authDb.query.savedJobs.findMany({
      where: eq(savedJobs.userId, locals.user.id),
    });
    return json(results);
  } catch (err) {
    console.error('[ERROR][GET] /savedJobs failed', err);
    throw error(500, 'Failed to fetch saved jobs');
  }
};

// ---------------------------
// POST a saved job
// ---------------------------
export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || !locals.user.id) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { jobId } = body;

  if (!jobId || typeof jobId !== 'string') {
    throw error(400, 'jobId is required');
  }

  try {
    // Avoid duplicate saves
    const existing = await authDb.query.savedJobs.findFirst({
      where: and(eq(savedJobs.jobId, jobId), eq(savedJobs.userId, locals.user.id))
    });

    if (existing) return json(existing, { status: 200 });

    const newId = crypto.randomUUID();
    await authDb.insert(savedJobs).values({
      id: newId,
      jobId,
      userId: locals.user.id
    });

    const inserted = await authDb.query.savedJobs.findFirst({
      where: eq(savedJobs.id, newId)
    });

    return json(inserted, { status: 201 });
  } catch (err) {
    console.error('[ERROR][POST] /savedJobs failed', err);
    throw error(500, 'Failed to save job');
  }
};

// ---------------------------
// DELETE a saved job
// ---------------------------
export const DELETE: RequestHandler = async ({ locals, request }) => {
  if (!locals.user || !locals.user.id) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { jobId } = body;

  if (!jobId || typeof jobId !== 'string') {
    throw error(400, 'jobId is required');
  }

  try {
    const result = await authDb.delete(savedJobs).where(
      and(eq(savedJobs.jobId, jobId), eq(savedJobs.userId, locals.user.id))
    );

    if (result.rowsAffected === 0) {
      throw error(404, 'Job not found or unauthorized');
    }

    return json({ success: true });
  } catch (err) {
    console.error('[ERROR][DELETE] /savedJobs failed', err);
    throw error(500, 'Failed to delete saved job');
  }
};
