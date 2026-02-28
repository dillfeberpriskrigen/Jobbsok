// +page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  try {
    const res = await fetch('/api/user/locations');

    if (!res.ok) {
      console.error('Failed to fetch locations, status:', res.status);
      return { locations: [] }; // fallback empty array
    }

    const locations = await res.json();

    // Ensure it's always an array
    return { locations: Array.isArray(locations) ? locations : [] };
  } catch (err) {
    console.error('Error fetching locations:', err);
    return { locations: [] }; // fallback empty array
  }
};