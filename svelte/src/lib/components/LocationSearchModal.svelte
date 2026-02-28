<script lang="ts">
  import { run, createBubbler, stopPropagation } from 'svelte/legacy';

  const bubble = createBubbler();
  import { createEventDispatcher } from "svelte";

  type Region = { id: string; name: string };
  type Municipality = { id: string; name: string; regionId: string };
  type Location = { id: string; label: string; type: string };

  interface Props {
    regions?: Region[];
    municipalities?: Municipality[];
    selectedLocations?: Location[];
    open?: boolean;
  }

  let {
    regions = [],
    municipalities = [],
    selectedLocations = [],
    open = false
  }: Props = $props();

  const dispatch = createEventDispatcher();

  let search = $state("");
  let tempSelection: Location[] = $state([]);

  // Reactive assignment for tempSelection when modal opens
  run(() => {
    if (open) {
      console.log("[DEBUG] Modal opened, copying selectedLocations to tempSelection:", selectedLocations);
      tempSelection = [...selectedLocations];
    }
  });

  function getMunicipalities(regionId: string) {
    const result = municipalities.filter(m => m.regionId === regionId);
    console.log(`[DEBUG] getMunicipalities(${regionId}) ->`, result);
    return result;
  }

  function isRegionSelected(regionId: string) {
    const selected = tempSelection.some(loc => loc.type === "region" && loc.id === regionId);
    console.log(`[DEBUG] isRegionSelected(${regionId}) ->`, selected);
    return selected;
  }

  function isMunicipalitySelected(muniId: string) {
    const selected = tempSelection.some(loc => loc.type === "municipality" && loc.id === muniId);
    console.log(`[DEBUG] isMunicipalitySelected(${muniId}) ->`, selected);
    return selected;
  }

  function toggleRegion(region: Region) {
    console.log("[DEBUG] toggleRegion called for:", region);
    const munis = getMunicipalities(region.id);

    if (isRegionSelected(region.id)) {
      console.log("[DEBUG] Region is already selected, removing region and its municipalities");
      tempSelection = tempSelection.filter(
        loc => loc.id !== region.id && !munis.some(m => m.id === loc.id)
      );
    } else {
      console.log("[DEBUG] Region not selected, adding region and its municipalities");
      tempSelection = [
        ...tempSelection,
        { id: region.id, label: region.name, type: "region" },
        ...munis.map(m => ({ id: m.id, label: m.name, type: "municipality" }))
      ];
    }
    console.log("[DEBUG] tempSelection after toggleRegion:", tempSelection);
  }

  function toggleMunicipality(muni: Municipality) {
    console.log("[DEBUG] toggleMunicipality called for:", muni);

    if (isMunicipalitySelected(muni.id)) {
      console.log("[DEBUG] Municipality already selected, removing it");
      tempSelection = tempSelection.filter(loc => loc.id !== muni.id);

      const regionMuni = getMunicipalities(muni.regionId);
      const remaining = regionMuni.filter(m => tempSelection.some(loc => loc.id === m.id));

      if (remaining.length === 0) {
        console.log("[DEBUG] No municipalities left selected for region, removing region:", muni.regionId);
        tempSelection = tempSelection.filter(loc => loc.id !== muni.regionId);
      }
    } else {
      console.log("[DEBUG] Municipality not selected, adding it");
      tempSelection = [...tempSelection, { id: muni.id, label: muni.name, type: "municipality" }];

      const regionMuni = getMunicipalities(muni.regionId);

      const allSelected = regionMuni.every(
        m => tempSelection.some(loc => loc.id === m.id) || m.id === muni.id
      );

      if (allSelected && !isRegionSelected(muni.regionId)) {
        console.log("[DEBUG] All municipalities selected, adding region:", muni.regionId);
        tempSelection = [
          ...tempSelection,
          {
            id: muni.regionId,
            label: regions.find(r => r.id === muni.regionId)?.name || "",
            type: "region"
          }
        ];
      }
    }
    console.log("[DEBUG] tempSelection after toggleMunicipality:", tempSelection);
  }

  function save() {
    console.log("[DEBUG] Saving selection:", tempSelection);
    dispatch("save", tempSelection);
  }

  function close() {
    console.log("[DEBUG] Closing modal");
    dispatch("close");
  }

  let filteredRegions = $derived(regions
    .map(r => {
      const regionMatch = r.name.toLowerCase().includes(search.toLowerCase());
      const muniMatch = getMunicipalities(r.id).filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase())
      );

      console.log(`[DEBUG] Filtering region: ${r.name}, regionMatch: ${regionMatch}, muniMatch:`, muniMatch);

      if (regionMatch || muniMatch.length > 0) {
        return {
          ...r,
          municipalities:
            muniMatch.length > 0 && !regionMatch ? muniMatch : getMunicipalities(r.id)
        };
      }

      return null;
    })
    .filter(Boolean));

</script>

{#if open}
<div class="modal-bg" onclick={close}>
  <div class="modal" onclick={stopPropagation(bubble('click'))}>

    <div class="close-btn" onclick={close}>×</div>

    <h2>Select Locations</h2>

    <input type="text" placeholder="Search..." bind:value={search} />

    {#each filteredRegions as region}

      <div class="region-container">

        <div
          class="region-chip {isRegionSelected(region.id) ? 'selected' : ''}"
          onclick={() => toggleRegion(region)}
        >
          {region.name}
        </div>

        <div class="municipalities">

          {#each region.municipalities as muni}

            <div
              class="municipality-chip {isMunicipalitySelected(muni.id) ? 'selected' : ''}"
              onclick={() => toggleMunicipality(muni)}
            >
              {muni.name}
            </div>

          {/each}

        </div>

      </div>

    {/each}

    <div class="footerbuttons" style="margin-top: 12px; display: flex; gap: 8px;">
      <button class="footsave" onclick={save}>Save</button>
      <button class="footclose" onclick={close}>Cancel</button>
    </div>

  </div>
</div>
{/if}


<style>
.modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal {
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 8px;
  padding: 16px;
  position: relative;
  background: rgb(1,0,0);
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.2em;
}

.region-container {
  margin-bottom: 16px;
}

.municipalities {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.municipality-chip,
.region-chip {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.9em;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.municipality-chip {
  background:#01071d;
  color:white;
}

.municipality-chip.selected {
  background:#4f46e5;
}

.region-chip {
  background:#153f2a;
  font-weight:bold;
  color:white;
}

.region-chip.selected {
  background:#059669;
}

.footerbuttons{position: fixed;
  bottom:20%;
  display: flex;
}
.footsave{
  padding: 50px 100px;
  background:#059669;
}
.footclose{
  padding: 50px 100px;
  background:#cb230c;
}
input {
  padding:6px 8px;
  font-size:1em;
  width:100%;
  margin-bottom:12px;
}
</style>