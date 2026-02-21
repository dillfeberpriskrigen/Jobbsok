import { db } from '$lib/server/db';
import { sql } from '$lib/server/db';

export async function GET() {
  const [row] = await db.select().from(sql`(SELECT 1 AS value)`);
  return new Response(JSON.stringify(row));
}
}