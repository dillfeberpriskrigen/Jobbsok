<script lang="ts">
  import { onMount } from "svelte";
  import LocationModal from "$lib/components/LocationSearchModal.svelte";

  type Region = { id: string; name: string };
  type Municipality = { id: string; name: string; regionId: string };
  type Location = { id: string; label: string; type: string };

  let regions: Region[] = [];
  let municipalities: Municipality[] = [];

  let showModal = false;

  let selectedLocations: Location[] = [];
  let activeRegions = new Set<string>();
  let activeMunicipalities = new Set<string>();
  let availableRegions = new Set<string>();
  let availableMunicipalities = new Set<string>();

  onMount(async () => {
    regions = await fetch("/api/data/regions").then(r => r.json());
    municipalities = await fetch("/api/data/municipalities").then(r => r.json());
  });

  function saveModal(event) {
    selectedLocations = [...event.detail];

    availableRegions = new Set(selectedLocations.filter(l => l.type === "region").map(l => l.id));
    availableMunicipalities = new Set(selectedLocations.filter(l => l.type === "municipality").map(l => l.id));

    activeRegions = new Set([...activeRegions].filter(id => availableRegions.has(id)));
    activeMunicipalities = new Set([...activeMunicipalities].filter(id => availableMunicipalities.has(id)));

    showModal = false;
  }

  function toggleActiveRegion(regionId: string) {
    if (activeRegions.has(regionId)) {
      activeRegions.delete(regionId);
    } else {
      activeRegions.add(regionId);
    }
    activeRegions = new Set(activeRegions);
  }

  function toggleActiveMunicipality(id: string) {
    if (activeMunicipalities.has(id)) activeMunicipalities.delete(id);
    else activeMunicipalities.add(id);
    activeMunicipalities = new Set(activeMunicipalities);
  }

  $: displayedLocations = [
    ...Array.from(availableRegions)
      .map(id => regions.find(r => r.id === id))
      .filter(Boolean)
      .map(r => ({ id: r.id, label: r.name, type: "region" })),

    ...Array.from(availableMunicipalities)
      .map(id => municipalities.find(m => m.id === id))
      .filter(Boolean)
      .map(m => ({ id: m.id, label: m.name, type: "municipality" }))
  ];
</script>

<h2>Search & Select Locations</h2>

<button on:click={() => showModal = true}>
Open Location Modal
</button>

<LocationModal
  {regions}
  {municipalities}
  {selectedLocations}
  open={showModal}
  on:save={saveModal}
  on:close={() => showModal = false}
/>