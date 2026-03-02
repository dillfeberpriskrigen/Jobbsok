<script lang="ts">
  import type { LocationSelection, MunicipalityOption, RegionOption } from "$lib/types/location";

  type FilteredRegion = RegionOption & { municipalities: MunicipalityOption[] };

  interface Props {
    regions?: RegionOption[];
    municipalities?: MunicipalityOption[];
    selectedLocations?: LocationSelection[];
    open?: boolean;
    onSave?: (locations: LocationSelection[]) => void;
    onClose?: () => void;
  }

  let {
    regions = [],
    municipalities = [],
    selectedLocations = [],
    open = false,
    onSave = () => {},
    onClose = () => {}
  }: Props = $props();

  let search = $state("");
  let tempSelection: LocationSelection[] = $state([]);

  $effect(() => {
    if (open) {
      console.log("[DEBUG] Modal opened, copying selectedLocations to tempSelection:", selectedLocations);
      tempSelection = [...selectedLocations];
    }
  });

  $effect(() => {
    if (!open) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
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

  function toggleRegion(region: RegionOption) {
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

  function toggleMunicipality(muni: MunicipalityOption) {
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
    onSave(tempSelection);
  }

  function close() {
    console.log("[DEBUG] Closing modal");
    onClose();
  }

  let filteredRegions = $derived.by<FilteredRegion[]>(() =>
    regions.flatMap((region) => {
      const regionMatch = region.name.toLowerCase().includes(search.toLowerCase());
      const muniMatch = getMunicipalities(region.id).filter((municipality) =>
        municipality.name.toLowerCase().includes(search.toLowerCase())
      );

      console.log(`[DEBUG] Filtering region: ${region.name}, regionMatch: ${regionMatch}, muniMatch:`, muniMatch);

      if (!regionMatch && muniMatch.length === 0) {
        return [];
      }

      return [{
        ...region,
        municipalities: muniMatch.length > 0 && !regionMatch ? muniMatch : getMunicipalities(region.id)
      }];
    })
  );

</script>

{#if open}
<div
  class="modal-bg"
  role="button"
  tabindex="0"
  aria-label="Close location selection modal"
  onclick={(event) => event.target === event.currentTarget && close()}
  onkeydown={(event) => (event.key === "Enter" || event.key === " ") && close()}
>
  <div class="modal">

    <button type="button" class="close-btn" aria-label="Close modal" onclick={close}>×</button>

    <div class="modal-intro">
      <p class="eyebrow">Location Picker</p>
      <h2>Select Locations</h2>
    </div>

    <input type="text" placeholder="Search..." bind:value={search} />

    {#each filteredRegions as region}

      <div class="region-container">

        <button
          type="button"
          class="region-chip {isRegionSelected(region.id) ? 'selected' : ''}"
          onclick={() => toggleRegion(region)}
        >
          {region.name}
        </button>

        <div class="municipalities">

          {#each region.municipalities as muni}

            <button
              type="button"
              class="municipality-chip {isMunicipalitySelected(muni.id) ? 'selected' : ''}"
              onclick={() => toggleMunicipality(muni)}
            >
              {muni.name}
            </button>

          {/each}

        </div>

      </div>

    {/each}

    <div class="footerbuttons">
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
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  z-index: 40;
}

.modal {
  max-width: 700px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: var(--radius-container);
  padding: 1.25rem;
  position: relative;
  background: var(--color-surface-800);
  border: 1px solid var(--color-surface-600);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
  color: var(--base-font-color);
}

.modal-intro {
  margin-bottom: 0.9rem;
}

.modal-intro h2,
.modal-intro p {
  margin: 0;
}

.eyebrow {
  color: var(--color-warning-400);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  margin-bottom: 0.2rem;
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.2em;
  border: 0;
  background: transparent;
  color: var(--color-primary-300);
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
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  font-size: 0.9em;
  cursor: pointer;
  user-select: none;
  transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
  border: 1px solid transparent;
  font: inherit;
}

.municipality-chip {
  background: var(--color-surface-700);
  color: var(--color-primary-300);
  border-color: var(--color-surface-600);
}

.municipality-chip.selected {
  background: var(--color-tertiary-500);
  color: var(--color-tertiary-contrast-500);
  border-color: transparent;
}

.region-chip {
  background: var(--color-surface-600);
  font-weight: 700;
  color: var(--base-font-color);
  border-color: var(--color-surface-500);
}

.region-chip.selected {
  background: var(--color-secondary-500);
  color: var(--color-secondary-contrast-500);
  border-color: transparent;
}

.footerbuttons{
  position: sticky;
  bottom: -1.25rem;
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 1rem 0 0.25rem;
  background: linear-gradient(
    180deg,
    rgba(60, 56, 54, 0) 0%,
    var(--color-surface-800) 35%
  );
  border-top: 1px solid var(--color-surface-600);
}
.footsave{
  padding: 0.7rem 1.1rem;
  background: var(--color-secondary-500);
  color: var(--color-secondary-contrast-500);
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
}
.footclose{
  padding: 0.7rem 1.1rem;
  background: var(--color-surface-700);
  color: var(--base-font-color);
  border: 1px solid var(--color-surface-600);
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
}
input {
  padding: 0.75rem 0.9rem;
  font-size: 1em;
  width:100%;
  margin-bottom: 1rem;
  border-radius: 0.9rem;
  border: 1px solid var(--color-surface-600);
  background: var(--color-surface-900);
  color: var(--base-font-color);
}

input::placeholder {
  color: var(--color-primary-500);
}

@media (hover: hover) and (pointer: fine) {
  .municipality-chip,
  .region-chip,
  .footsave,
  .footclose,
  .close-btn {
    transition: background 0.14s ease 100ms, color 0.14s ease 100ms, border-color 0.14s ease 100ms, filter 0.14s ease 100ms;
  }

  .region-chip:hover {
    background: var(--color-surface-500);
  }

  .municipality-chip:hover {
    background: var(--color-surface-600);
  }

  .footsave:hover,
  .footclose:hover,
  .close-btn:hover {
    filter: brightness(1.06);
  }
}
</style>
