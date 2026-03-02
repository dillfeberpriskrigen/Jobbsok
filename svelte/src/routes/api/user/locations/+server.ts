import { authDb } from '$lib/server/db';
import { locations, municipalities, regions } from '$lib/server/db/authSchema';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { eq, inArray } from 'drizzle-orm';
import crypto from 'crypto';

type LocationInput = {
  id: string;
  type: 'region' | 'municipality';
  label?: string;
};

type LocationResponse = {
  id: string;
  label: string;
  type: 'region' | 'municipality';
};

type SavedLocationRow = {
  municipalityId: string;
};

type SelectedMunicipality = {
  id: string;
  name: string;
  regionId: string;
};

type SelectedRegion = {
  id: string;
  name: string;
};

function requireUserId(locals: App.Locals) {
  const userId = locals.user?.id;

  if (!userId) {
    throw error(401, 'Unauthorized');
  }

  return userId;
}

async function buildLocationResponse(userId: string): Promise<LocationResponse[]> {
  const savedRows = await authDb.query.locations.findMany({
    where: eq(locations.userId, userId)
  }) as SavedLocationRow[];

  const municipalityIds = [...new Set(savedRows.map((row) => row.municipalityId))];

  if (municipalityIds.length === 0) {
    return [];
  }

  const selectedMunicipalities = await authDb
    .select({
      id: municipalities.id,
      name: municipalities.name,
      regionId: municipalities.regionId
    })
    .from(municipalities)
    .where(inArray(municipalities.id, municipalityIds)) as SelectedMunicipality[];

  const regionIds = [...new Set(selectedMunicipalities.map((municipality) => municipality.regionId))];

  const selectedRegions = regionIds.length === 0
    ? []
    : await authDb
        .select({
          id: regions.id,
          name: regions.name
        })
        .from(regions)
        .where(inArray(regions.id, regionIds)) as SelectedRegion[];

  return [
    ...selectedRegions.map((region) => ({
      id: region.id,
      label: region.name,
      type: 'region' as const
    })),
    ...selectedMunicipalities.map((municipality) => ({
      id: municipality.id,
      label: municipality.name,
      type: 'municipality' as const
    }))
  ];
}

async function normalizeSelections(input: LocationInput[]) {
  const regionIds = [...new Set(input.filter((item) => item.type === 'region').map((item) => item.id))];
  const municipalityIds = [...new Set(input.filter((item) => item.type === 'municipality').map((item) => item.id))];

  const municipalitiesFromRegions = regionIds.length === 0
    ? []
    : await authDb
        .select({
          id: municipalities.id,
          regionId: municipalities.regionId
        })
        .from(municipalities)
        .where(inArray(municipalities.regionId, regionIds));

  const municipalitiesFromSelections = municipalityIds.length === 0
    ? []
    : await authDb
        .select({
          id: municipalities.id,
          regionId: municipalities.regionId
        })
        .from(municipalities)
        .where(inArray(municipalities.id, municipalityIds));

  const normalizedMunicipalities = new Map<string, { id: string; regionId: string }>();

  for (const municipality of [...municipalitiesFromRegions, ...municipalitiesFromSelections]) {
    normalizedMunicipalities.set(municipality.id, municipality);
  }

  return [...normalizedMunicipalities.values()];
}

export const GET: RequestHandler = async ({ locals }) => {
  const userId = requireUserId(locals);

  try {
    return json(await buildLocationResponse(userId));
  } catch (err) {
    console.error('[GET] Failed to fetch locations:', err);
    throw error(500, 'Failed to fetch locations');
  }
};

export const PUT: RequestHandler = async ({ locals, request }) => {
  const userId = requireUserId(locals);
  const body = await request.json();
  const input = body?.locations;

  if (!Array.isArray(input)) {
    throw error(400, 'locations must be an array');
  }

  const normalizedInput = input.filter(
    (item): item is LocationInput =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      (item.type === 'region' || item.type === 'municipality')
  );

  if (normalizedInput.length !== input.length) {
    throw error(400, 'Invalid location payload');
  }

  try {
    const normalizedMunicipalities = await normalizeSelections(normalizedInput);

    await authDb.transaction(async (tx: typeof authDb) => {
      await tx.delete(locations).where(eq(locations.userId, userId));

      if (normalizedMunicipalities.length === 0) {
        return;
      }

      await tx.insert(locations).values(
        normalizedMunicipalities.map((municipality) => ({
          id: crypto.randomUUID(),
          regionId: municipality.regionId,
          municipalityId: municipality.id,
          userId
        }))
      );
    });

    return json(await buildLocationResponse(userId));
  } catch (err) {
    console.error('[PUT] Failed to save locations:', err);
    throw error(500, 'Failed to save locations');
  }
};
