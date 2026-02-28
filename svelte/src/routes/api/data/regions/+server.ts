// src/routes/api/regions/+server.ts

import { json } from '@sveltejs/kit';
import { authDb } from '$lib/server/db';
import { regions } from '$lib/server/db/authSchema.ts';

export async function GET() {
  console.log('[DEBUG][GET] /api/data/regions called');

  try {
    const data = await authDb.select().from(regions);

   // console.log('[DEBUG][GET] Regions fetched:', data);
    console.log('[DEBUG][GET] Regions count:', data.length);

    return json(data);
  } catch (error) {
    console.error('[ERROR][GET] /api/regions failed:', error);
    return json({ error: 'Failed to fetch regions' }, { status: 500 });
  }
}