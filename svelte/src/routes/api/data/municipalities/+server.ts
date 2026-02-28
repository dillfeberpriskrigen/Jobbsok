// src/routes/api/municipalities/+server.ts

import { json } from '@sveltejs/kit';
import { authDb } from '$lib/server/db';
import { municipalities } from '$lib/server/db/authSchema.ts';

export async function GET() {
  console.log('[DEBUG][GET] /api/municipalities called');

  try {
    const data = await authDb.select().from(municipalities);

   // console.log('[DEBUG][GET] Municipalities fetched:', data);
    console.log('[DEBUG][GET] Municipalities count:', data.length);

    return json(data);
  } catch (error) {
    console.error('[ERROR][GET] /api/municipalities failed:', error);
    return json({ error: 'Failed to fetch municipalities' }, { status: 500 });
  }
}