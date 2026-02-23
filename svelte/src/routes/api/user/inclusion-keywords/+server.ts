// +server.ts
import { db } from '$lib/server/db';
import { inclusionKeywords } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { randomUUID } from 'crypto';

export async function POST({ request, locals }) {
  const { keyword } = await request.json();
  const userId = locals.user?.id;

  if (!userId) return json({ error: 'Not authenticated' }, { status: 401 });
  if (!keyword || !keyword.trim())
    return json({ error: 'Invalid keyword' }, { status: 400 });

  const newKeyword = {
    id: randomUUID(),
    userId,
    keyword: keyword.trim(),
    createdAt: new Date(),
  };

  await db.insert(inclusionKeywords).values(newKeyword);

  return json({ success: true, savedKeyword: newKeyword });
}