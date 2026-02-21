import { db } from '$lib/server/db'

export async function GET() {
  const jobs = await db.query.jobs.findMany()
  return Response.json(jobs)
}