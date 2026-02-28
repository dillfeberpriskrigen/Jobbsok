// src/routes/api/user/locations.ts
import { authDb } from '$lib/server/db';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { locations } from '$lib/server/db/authSchema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * GET /api/user/locations
 * Returns all saved locations for the logged-in user
 */
export const GET: RequestHandler = async ({ locals }) => {
  console.log('[DEBUG][GET] /api/user/locations called');

  if (!locals.user) throw error(401, 'Unauthorized');

  try {
    const result = await authDb.query.locations.findMany({
      where: eq(locations.userId, locals.user.id),
    });

    console.log('[DEBUG][GET] Fetched locations:', result);
    return json(result);
  } catch (err) {
    console.error('[DEBUG][GET] Error fetching locations:', err);
    throw error(500, 'Failed to fetch locations');
  }
};

/**
 * POST /api/user/locations
 * Adds a new location for the logged-in user
 * Acceptable inputs: regionId and/or municipalityId
 */
export const POST: RequestHandler = async ({ locals, request }) => {
  console.log('[DEBUG][POST] /api/user/locations called');

  if (!locals.user) throw error(401, 'Unauthorized');

  const body = await request.json();
  const { regionId, municipalityId } = body;
  console.log('[DEBUG][POST] Request body:', body);

  if (!regionId && !municipalityId) {
    throw error(400, 'Either regionId or municipalityId is required');
  }

  try {
    const newId = crypto.randomUUID();

    await authDb.insert(locations).values({
      id: newId,
      regionId: regionId ?? '',
      municipalityId: municipalityId ?? '',
      userId: locals.user.id,
    });

    // Fetch the inserted row
    const inserted = await authDb.query.locations.findFirst({
      where: eq(locations.id, newId),
    });

    console.log('[DEBUG][POST] Inserted location:', inserted);
    return json(inserted, { status: 201 });
  } catch (err) {
    console.error('[DEBUG][POST] Error creating location:', err);
    throw error(500, 'Failed to create location');
  }
};

/**
 * DELETE /api/user/locations
 * Deletes a location by ID for the logged-in user
 */
export const DELETE: RequestHandler = async ({ locals, request }) => {
  console.log('[DEBUG][DELETE] /api/user/locations called');

  if (!locals.user) throw error(401, 'Unauthorized');

  const body = await request.json();
  const { locationId } = body;
  console.log('[DEBUG][DELETE] Request body:', body);

  if (!locationId) throw error(400, 'locationId is required');

  try {
    const result = await authDb.delete(locations)
      .where(eq(locations.id, locationId), eq(locations.userId, locals.user.id));

    if (result.rowsAffected === 0) throw error(404, 'Location not found or unauthorized');

    console.log('[DEBUG][DELETE] Successfully deleted location:', locationId);
    return json({ success: true });
  } catch (err) {
    console.error('[DEBUG][DELETE] Error deleting location:', err);
    if (err.status) throw err;
    throw error(500, 'Failed to delete location');
  }
};