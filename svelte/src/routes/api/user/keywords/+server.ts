import { db } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { keywords } from '$lib/server/db/authSchema';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const result = await db.query.keywords.findMany({
    where: (k) => k.userId.equals(locals.user.id)
  });

  return json(result);
};

export const POST: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const { keyword, type } = await request.json();

  if (!['include', 'exclude'].includes(type)) {
    return error(400, 'Type must be "include" or "exclude"');
  }

  const result = await db.insert(keywords).values({
    id: crypto.randomUUID(),
    keyword,
    type,
    userId: locals.user.id
  });

  return json(result, { status: 201 });
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) {
    return error(401, 'Unauthorized');
  }

  const { keywordId } = await request.json();

  const keyword = await db.query.keywords.findFirst({
    where: (k) => k.id.equals(keywordId) && k.userId.equals(locals.user.id)
  });

  if (!keyword) {
    return error(404, 'Keyword not found or unauthorized');
  }

  await db.delete(keywords).where((k) => k.id.equals(keywordId));

  return json({ success: true });
};