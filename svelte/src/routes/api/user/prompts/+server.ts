import { authDb } from '$lib/server/db.js';
import { prompts } from '$lib/server/db/authSchema.js';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import crypto from 'crypto';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user?.id) {
    throw error(401, 'Unauthorized');
  }

  try {
    const result = await authDb.query.prompts.findMany({
      where: eq(prompts.userId, locals.user.id),
      orderBy: [asc(prompts.kind), asc(prompts.label)]
    });

    return json(result);
  } catch (err) {
    console.error('[ERROR][GET] /api/user/prompts failed', err);
    throw error(500, 'Failed to fetch prompts');
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { label, kind, content } = body ?? {};

  if (!label || typeof label !== 'string') throw error(400, 'label is required');
  if (!kind || typeof kind !== 'string') throw error(400, 'kind is required');
  if (!content || typeof content !== 'string') throw error(400, 'content is required');

  try {
    const id = crypto.randomUUID();
    await authDb.insert(prompts).values({
      id,
      label: label.trim(),
      kind: kind.trim(),
      content,
      userId: locals.user.id
    });

    const inserted = await authDb.query.prompts.findFirst({
      where: and(eq(prompts.id, id), eq(prompts.userId, locals.user.id))
    });

    return json(inserted, { status: 201 });
  } catch (err) {
    console.error('[ERROR][POST] /api/user/prompts failed', err);
    throw error(500, 'Failed to create prompt');
  }
};

export const PUT: RequestHandler = async ({ locals, request }) => {
  if (!locals.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { id, label, kind, content } = body ?? {};

  if (!id || typeof id !== 'string') throw error(400, 'id is required');
  if (!label || typeof label !== 'string') throw error(400, 'label is required');
  if (!kind || typeof kind !== 'string') throw error(400, 'kind is required');
  if (!content || typeof content !== 'string') throw error(400, 'content is required');

  try {
    const existing = await authDb.query.prompts.findFirst({
      where: and(eq(prompts.id, id), eq(prompts.userId, locals.user.id))
    });

    if (!existing) {
      throw error(404, 'Prompt not found or unauthorized');
    }

    await authDb
      .update(prompts)
      .set({
        label: label.trim(),
        kind: kind.trim(),
        content,
        updatedAt: new Date()
      })
      .where(and(eq(prompts.id, id), eq(prompts.userId, locals.user.id)));

    const updated = await authDb.query.prompts.findFirst({
      where: and(eq(prompts.id, id), eq(prompts.userId, locals.user.id))
    });

    return json(updated);
  } catch (err) {
    console.error('[ERROR][PUT] /api/user/prompts failed', err);
    if (err && typeof err === 'object' && 'status' in err) throw err;
    throw error(500, 'Failed to update prompt');
  }
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
  if (!locals.user?.id) {
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { id } = body ?? {};

  if (!id || typeof id !== 'string') throw error(400, 'id is required');

  try {
    const existing = await authDb.query.prompts.findFirst({
      where: and(eq(prompts.id, id), eq(prompts.userId, locals.user.id))
    });

    if (!existing) {
      throw error(404, 'Prompt not found or unauthorized');
    }

    await authDb
      .delete(prompts)
      .where(eq(prompts.id, id));

    return json({ success: true });
  } catch (err) {
    console.error('[ERROR][DELETE] /api/user/prompts failed', err);
    if (err && typeof err === 'object' && 'status' in err) throw err;
    throw error(500, 'Failed to delete prompt');
  }
};
