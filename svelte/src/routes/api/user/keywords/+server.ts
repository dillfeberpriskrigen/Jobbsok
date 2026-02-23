import { authDb } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { keywords } from '$lib/server/db/authSchema';
import { eq } from 'drizzle-orm';

// ---------------------------
// GET all keywords for the logged-in user
// ---------------------------
export const GET: RequestHandler = async ({ locals }) => {
  console.log('[DEBUG][GET] /api/user/keywords called');

  if (!locals.user) {
    console.log('[DEBUG][GET] Unauthorized access attempt');
    throw error(401, 'Unauthorized');
  }

  try {
    const result = await authDb.query.keywords.findMany({
      where: eq(keywords.userId, locals.user.id),
    });

    console.log('[DEBUG][GET] Fetched keywords:', result);
    return json(result);
  } catch (err) {
    console.error('[DEBUG][GET] Error fetching keywords:', err);
    throw error(500, 'Failed to fetch keywords');
  }
};

// ---------------------------
// POST a new keyword
// ---------------------------
export const POST: RequestHandler = async ({ locals, request }) => {
  console.log('[DEBUG][POST] /api/user/keywords called');

  if (!locals.user) {
    console.log('[DEBUG][POST] Unauthorized access attempt');
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { keyword, type } = body;
  console.log('[DEBUG][POST] Request body:', body);

  if (!keyword || typeof keyword !== 'string') throw error(400, 'Keyword is required');
  if (!['include', 'exclude'].includes(type)) throw error(400, 'Type must be "include" or "exclude"');

  try {
    const newId = crypto.randomUUID();

    // Insert the keyword (MySQL-compatible)
    await authDb.insert(keywords).values({
      id: newId,
      keyword,
      type,
      userId: locals.user.id,
    });

    console.log('[DEBUG][POST] Keyword inserted, fetching row...');

    // Fetch the inserted row
    const inserted = await authDb.query.keywords.findFirst({
      where: eq(keywords.id, newId),
    });

    console.log('[DEBUG][POST] Inserted keyword:', inserted);
    return json(inserted, { status: 201 });
  } catch (err) {
    console.error('[DEBUG][POST] Error creating keyword:', err);
    throw error(500, 'Failed to create keyword');
  }
};

// ---------------------------
// DELETE a keyword by ID
// ---------------------------
export const DELETE: RequestHandler = async ({ locals, request }) => {
  console.log('[DEBUG][DELETE] /api/user/keywords called');

  if (!locals.user) {
    console.log('[DEBUG][DELETE] Unauthorized access attempt');
    throw error(401, 'Unauthorized');
  }

  const body = await request.json();
  const { keywordId } = body;
  console.log('[DEBUG][DELETE] Request body:', body);

  if (!keywordId || typeof keywordId !== 'string') throw error(400, 'keywordId is required');

  try {
    // Delete only if it belongs to the logged-in user
    const result = await authDb.delete(keywords)
      .where(eq(keywords.id, keywordId), eq(keywords.userId, locals.user.id));

    console.log('[DEBUG][DELETE] Rows affected:', result.rowsAffected);

    if (result.rowsAffected === 0) throw error(404, 'Keyword not found or unauthorized');

    console.log('[DEBUG][DELETE] Successfully deleted keyword:', keywordId);
    return json({ success: true });
  } catch (err) {
    console.error('[DEBUG][DELETE] Error deleting keyword:', err);
    if (err.status) throw err;
    throw error(500, 'Failed to delete keyword');
  }
};