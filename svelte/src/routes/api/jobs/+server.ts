import { jobDb } from '$lib/server/jobdb'

export async function GET() {
  const jobs = await jobDb.query.jobs.findMany()
  return Response.json(jobs)
}