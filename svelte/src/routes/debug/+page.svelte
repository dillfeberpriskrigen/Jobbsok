<script lang="ts">
  import { onMount } from "svelte";
  import LocationModal from "$lib/components/LocationSearchModal.svelte";

  type Region = { id: string; name: string };
  type Municipality = { id: string; name: string; regionId: string };
  type Location = { id: string; label: string; type: string };
  type GroupedLocations = {
    region: Location;
    municipalities: Location[];
  };
  const isDefined = <T>(value: T | null | undefined): value is T => value != null;

  let regions = $state<Region[]>([]);
  let municipalities = $state<Municipality[]>([]);

  let showModal = $state(false);

  let selectedLocations = $state<Location[]>([]);
  let activeRegions = $state(new Set<string>());
  let activeMunicipalities = $state(new Set<string>());
  let availableRegions = $state(new Set<string>());
  let availableMunicipalities = $state(new Set<string>());
  let locationError = $state("");

  onMount(async () => {
    const [regionsResponse, municipalitiesResponse, savedLocationsResponse] = await Promise.all([
      fetch("/api/data/regions"),
      fetch("/api/data/municipalities"),
      fetch("/api/user/locations")
    ]);

    regions = await regionsResponse.json();
    municipalities = await municipalitiesResponse.json();

    if (savedLocationsResponse.ok) {
      applySelectedLocations(await savedLocationsResponse.json());
    } else if (savedLocationsResponse.status !== 401) {
      locationError = "Failed to load saved locations.";
    }
  });

  function applySelectedLocations(locations: Location[]) {
    selectedLocations = [...locations];
    availableRegions = new Set(selectedLocations.filter((location) => location.type === "region").map((location) => location.id));
    availableMunicipalities = new Set(selectedLocations.filter((location) => location.type === "municipality").map((location) => location.id));
    activeRegions = new Set([...activeRegions].filter((id) => availableRegions.has(id)));
    activeMunicipalities = new Set([...activeMunicipalities].filter((id) => availableMunicipalities.has(id)));
  }

  async function saveModal(locations: Location[]) {
    locationError = "";

    const response = await fetch("/api/user/locations", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ locations })
    });

    if (!response.ok) {
      locationError = response.status === 401
        ? "You must be signed in to save locations."
        : "Failed to save locations.";
      return;
    }

    applySelectedLocations(await response.json());
    showModal = false;
  }

  function getAvailableMunicipalitiesForRegion(regionId: string) {
    return municipalities.filter(
      (municipality) => municipality.regionId === regionId && availableMunicipalities.has(municipality.id)
    );
  }

  function toggleActiveRegion(regionId: string) {
    const regionMunicipalities = getAvailableMunicipalitiesForRegion(regionId);
    const nextActiveRegions = new Set(activeRegions);
    const nextActiveMunicipalities = new Set(activeMunicipalities);

    if (nextActiveRegions.has(regionId)) {
      nextActiveRegions.delete(regionId);
      for (const municipality of regionMunicipalities) {
        nextActiveMunicipalities.delete(municipality.id);
      }
    } else {
      nextActiveRegions.add(regionId);
      for (const municipality of regionMunicipalities) {
        nextActiveMunicipalities.add(municipality.id);
      }
    }

    activeRegions = nextActiveRegions;
    activeMunicipalities = nextActiveMunicipalities;
  }

  function toggleActiveMunicipality(municipalityId: string) {
    const municipality = municipalities.find((candidate) => candidate.id === municipalityId);

    if (!municipality) {
      return;
    }

    const regionMunicipalities = getAvailableMunicipalitiesForRegion(municipality.regionId);
    const nextActiveRegions = new Set(activeRegions);
    const nextActiveMunicipalities = new Set(activeMunicipalities);

    if (nextActiveMunicipalities.has(municipalityId)) {
      nextActiveMunicipalities.delete(municipalityId);
      nextActiveRegions.delete(municipality.regionId);
    } else {
      nextActiveMunicipalities.add(municipalityId);

      const allMunicipalitiesActive = regionMunicipalities.every((candidate) =>
        nextActiveMunicipalities.has(candidate.id)
      );

      if (allMunicipalitiesActive && availableRegions.has(municipality.regionId)) {
        nextActiveRegions.add(municipality.regionId);
      }
    }

    activeRegions = nextActiveRegions;
    activeMunicipalities = nextActiveMunicipalities;
  }

  function isLocationActive(location: Location) {
    return location.type === "region"
      ? activeRegions.has(location.id)
      : activeMunicipalities.has(location.id);
  }

  const groupedLocations = $derived<GroupedLocations[]>(
    Array.from(availableRegions)
      .map((regionId) => {
        const region = regions.find((candidate) => candidate.id === regionId);

        if (!region) {
          return null;
        }

        return {
          region: { id: region.id, label: region.name, type: "region" },
          municipalities: getAvailableMunicipalitiesForRegion(regionId).map((municipality) => ({
            id: municipality.id,
            label: municipality.name,
            type: "municipality"
          }))
        };
      })
      .filter(isDefined)
  );
</script>

<h2>Search & Select Locations</h2>

<button onclick={() => showModal = true}>
Open Location Modal
</button>

{#if locationError}
  <p class="error-message">{locationError}</p>
{/if}

{#if groupedLocations.length > 0}
  <div class="selected-locations">
    {#each groupedLocations as group}
      <section class="location-group">
        <button
          type="button"
          class="location-chip region {isLocationActive(group.region) ? 'active' : ''}"
          onclick={() => toggleActiveRegion(group.region.id)}
          aria-pressed={isLocationActive(group.region)}
        >
          {group.region.label}
        </button>

        {#if group.municipalities.length > 0}
          <div class="municipality-list">
            {#each group.municipalities as municipality}
              <button
                type="button"
                class="location-chip municipality {isLocationActive(municipality) ? 'active' : ''}"
                onclick={() => toggleActiveMunicipality(municipality.id)}
                aria-pressed={isLocationActive(municipality)}
              >
                {municipality.label}
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  </div>
{:else}
  <p>No locations selected yet.</p>
{/if}

<LocationModal
  {regions}
  {municipalities}
  {selectedLocations}
  open={showModal}
  onSave={saveModal}
  onClose={() => showModal = false}
/>

<style>
  .selected-locations {
    display: grid;
    gap: 1rem;
    margin-top: 1rem;
  }

  .error-message {
    color: #b91c1c;
    margin-top: 0.75rem;
  }

  .location-group {
    padding: 1rem;
    border-radius: 1rem;
    background: #7b7b72;
    border: 1px solid #020a15;
  }

  .municipality-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .location-chip {
    border: 0;
    border-radius: 999px;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
    font: inherit;
    transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  }

  .location-chip:hover {
    transform: translateY(-1px);
  }

  .location-chip.region {
    background: #d1fae5;
    color: #065f46;
  }

  .location-chip.region.active {
    background: #059669;
    color: #ffffff;
  }

  .location-chip.municipality {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .location-chip.municipality.active {
    background: #2563eb;
    color: #ffffff;
  }
</style>
