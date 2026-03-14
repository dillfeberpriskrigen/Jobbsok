import { authDb } from '$lib/server/db.js';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { subscriptions, municipalities, regions } from '$lib/server/db/authSchema.js';
import { and, eq, inArray } from 'drizzle-orm';
import crypto from 'crypto';

type SubscriptionRow = {
  id: string;
  title: string;
  userId: string;
  regionId: string | null;
  municipalityId: string | null;
  createdAt: Date;
};

type SubscriptionResponse = {
  id: string;
  title: string;
  locationId: string;
  locationType: 'region' | 'municipality';
  locationLabel: string;
  createdAt: Date;
};

function requireUserId(locals: App.Locals) {
  const userId = locals.user?.id;

  if (!userId) {
    throw error(401, 'Unauthorized');
  }

  return userId;
}

async function mapSubscriptions(rows: SubscriptionRow[]): Promise<SubscriptionResponse[]> {
  const regionIds = [...new Set(rows.map((row) => row.regionId).filter((value): value is string => Boolean(value)))];
  const municipalityIds = [...new Set(rows.map((row) => row.municipalityId).filter((value): value is string => Boolean(value)))];

  const regionRows = regionIds.length === 0
    ? []
    : await authDb.select({ id: regions.id, name: regions.name }).from(regions).where(inArray(regions.id, regionIds));
  const municipalityRows = municipalityIds.length === 0
    ? []
    : await authDb.select({ id: municipalities.id, name: municipalities.name }).from(municipalities).where(inArray(municipalities.id, municipalityIds));

  const regionLabels = new Map(regionRows.map((row) => [row.id, row.name]));
  const municipalityLabels = new Map(municipalityRows.map((row) => [row.id, row.name]));

  return rows.flatMap<SubscriptionResponse>((row) => {
    if (row.municipalityId) {
      const locationLabel = municipalityLabels.get(row.municipalityId);
      if (!locationLabel) return [];

      return [{
        id: row.id,
        title: row.title,
        locationId: row.municipalityId,
        locationType: 'municipality' as const,
        locationLabel,
        createdAt: row.createdAt
      }];
    }

    if (row.regionId) {
      const locationLabel = regionLabels.get(row.regionId);
      if (!locationLabel) return [];

      return [{
        id: row.id,
        title: row.title,
        locationId: row.regionId,
        locationType: 'region' as const,
        locationLabel,
        createdAt: row.createdAt
      }];
    }

    return [];
  });
}

export const GET: RequestHandler = async ({ locals }) => {
  const userId = requireUserId(locals);

  try {
    const rows = await authDb.query.subscriptions.findMany({
      where: eq(subscriptions.userId, userId)
    }) as SubscriptionRow[];

    return json(await mapSubscriptions(rows));
  } catch (err) {
    console.error('[GET] Failed to fetch subscriptions:', err);
    throw error(500, 'Failed to fetch subscriptions');
  }
};

export const POST: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  const body = await request.json();

  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const locationId = typeof body?.locationId === 'string' ? body.locationId : '';
  const locationType = body?.locationType;

  if (!title) throw error(400, 'title is required');
  if (!locationId) throw error(400, 'locationId is required');
  if (locationType !== 'region' && locationType !== 'municipality') {
    throw error(400, 'locationType must be region or municipality');
  }

  try {
    const existing = locationType === 'region'
      ? await authDb.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.title, title),
            eq(subscriptions.regionId, locationId)
          )
        })
      : await authDb.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.title, title),
            eq(subscriptions.municipalityId, locationId)
          )
        });

    if (existing) {
      const mapped = await mapSubscriptions([existing as SubscriptionRow]);
      return json(mapped[0], { status: 200 });
    }

    if (locationType === 'region') {
      const region = await authDb.query.regions.findFirst({
        where: eq(regions.id, locationId)
      });

      if (!region) throw error(404, 'Region not found');

      await authDb.insert(subscriptions).values({
        id: crypto.randomUUID(),
        title,
        userId,
        regionId: locationId,
        municipalityId: null
      });
    } else {
      const municipality = await authDb.query.municipalities.findFirst({
        where: eq(municipalities.id, locationId)
      });

      if (!municipality) throw error(404, 'Municipality not found');

      await authDb.insert(subscriptions).values({
        id: crypto.randomUUID(),
        title,
        userId,
        regionId: municipality.regionId,
        municipalityId: locationId
      });
    }

    const inserted = locationType === 'region'
      ? await authDb.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.title, title),
            eq(subscriptions.regionId, locationId)
          )
        })
      : await authDb.query.subscriptions.findFirst({
          where: and(
            eq(subscriptions.userId, userId),
            eq(subscriptions.title, title),
            eq(subscriptions.municipalityId, locationId)
          )
        });

    const mapped = await mapSubscriptions([inserted as SubscriptionRow]);
    return json(mapped[0], { status: 201 });
  } catch (err) {
    console.error('[POST] Failed to save subscription:', err);
    if (err && typeof err === 'object' && 'status' in err) throw err;
    throw error(500, 'Failed to save subscription');
  }
};

export const DELETE: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  const body = await request.json();
  const id = typeof body?.id === 'string' ? body.id : '';

  if (!id) throw error(400, 'id is required');

  try {
    const existing = await authDb.query.subscriptions.findFirst({
      where: and(eq(subscriptions.id, id), eq(subscriptions.userId, userId))
    });

    if (!existing) {
      throw error(404, 'Subscription not found or unauthorized');
    }

    await authDb.delete(subscriptions).where(eq(subscriptions.id, id));
    return json({ success: true });
  } catch (err) {
    console.error('[DELETE] Failed to delete subscription:', err);
    if (err && typeof err === 'object' && 'status' in err) throw err;
    throw error(500, 'Failed to delete subscription');
  }
};
