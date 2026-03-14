<script lang="ts">
  import { onMount } from "svelte";
  import JobDetailModal from "$lib/components/JobDetailModal.svelte";
  import JobSelectionModal from "$lib/components/JobSelectionModal.svelte";
  import LocationModal from "$lib/components/LocationSearchModal.svelte";
  import type { Job } from "$lib/server/db/jobTypes.js";
  import type { LocationSelection, MunicipalityOption, RegionOption } from "$lib/types/location.js";
  import type { UserPrompt } from "$lib/types/prompt.js";

  type GroupedLocations = {
    region: LocationSelection;
    municipalities: LocationSelection[];
  };
  type Keyword = {
    id: string;
    keyword: string;
    type?: string | null;
    userId: string;
  };
  type SearchJob = Job & {
    _selected?: boolean;
    application_deadline_simple?: string;
  };
  const isDefined = <T>(value: T | null | undefined): value is T => value != null;
  const byLabel = (left: string, right: string) => left.localeCompare(right);
  const subscriptionLocationStorageKey = 'jobbsok:selected-subscription-locations';
  const subscriptionTitleStorageKey = 'jobbsok:selected-subscription-titles';

  let regions = $state<RegionOption[]>([]);
  let municipalities = $state<MunicipalityOption[]>([]);

  let showModal = $state(false);
  let showJobModal = $state(false);

  let selectedLocations = $state<LocationSelection[]>([]);
  let activeRegions = $state(new Set<string>());
  let activeMunicipalities = $state(new Set<string>());
  let availableRegions = $state(new Set<string>());
  let availableMunicipalities = $state(new Set<string>());
  let locationError = $state("");
  let jobTitleOptions = $state<string[]>([]);
  let selectedJobTitles = $state<string[]>([]);
  let searchKeyword = $state("");
  let filteredResults = $state<SearchJob[]>([]);
  let reviewList = $state<SearchJob[]>([]);
  let selectedJobDetail = $state<SearchJob | null>(null);
  let savedPrompts = $state<UserPrompt[]>([]);
  let showDetails = $state(false);
  let keywordsError = $state("");
  let searchError = $state("");
  let reviewError = $state("");
  let savedIncludeKeywords = $state<Keyword[]>([]);
  let isSearching = $state(false);
  let lastSearchTitles = $state<string[]>([]);
  let lastSearchPlaces = $state<string[]>([]);

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

    await Promise.all([
      loadKeywords(),
      loadPrompts(),
      loadSavedJobs()
    ]);
  });

  $effect(() => {
    if (showJobModal && jobTitleOptions.length === 0) {
      void loadJobTitleOptions();
    }
  });

  function applySelectedLocations(locations: LocationSelection[]) {
    selectedLocations = [...locations];
    availableRegions = new Set(selectedLocations.filter((location) => location.type === "region").map((location) => location.id));
    availableMunicipalities = new Set(selectedLocations.filter((location) => location.type === "municipality").map((location) => location.id));
    activeRegions = new Set(availableRegions);
    activeMunicipalities = new Set(availableMunicipalities);
  }

  async function saveModal(locations: LocationSelection[]) {
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

  async function loadKeywords() {
    keywordsError = "";

    const response = await fetch("/api/user/keywords");
    if (!response.ok) {
      keywordsError = response.status === 401
        ? "You must be signed in to load keywords."
        : "Failed to load keywords.";
      return;
    }

    const data = await response.json() as Keyword[];
    savedIncludeKeywords = data
      .filter((keyword) => keyword.type === "include" && keyword.keyword.trim().length > 0)
      .map((keyword) => ({ ...keyword, keyword: keyword.keyword.trim() }))
      .sort((left, right) => byLabel(left.keyword, right.keyword));

    const includeKeywords = savedIncludeKeywords
      .map((keyword) => keyword.keyword)
      .filter(Boolean);

    selectedJobTitles = includeKeywords;
  }

  async function loadJobTitleOptions() {
    keywordsError = "";

    const response = await fetch("/api/jobs/titles");
    if (!response.ok) {
      keywordsError = "Failed to load job title suggestions.";
      return;
    }

    const titles = await response.json() as string[];
    jobTitleOptions = titles;
  }

  async function addKeyword(keywordInput: string, type: "include" | "exclude") {
    const keyword = keywordInput.trim();
    if (!keyword) {
      return null;
    }

    keywordsError = "";

    const response = await fetch("/api/user/keywords", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ keyword, type })
    });

    if (!response.ok) {
      keywordsError = response.status === 401
        ? "You must be signed in to save keywords."
        : "Failed to save keyword.";
      return null;
    }

    const inserted = await response.json() as Keyword;
    if (inserted.type === "include" && !jobTitleOptions.includes(inserted.keyword)) {
      jobTitleOptions = [...jobTitleOptions, inserted.keyword].sort(byLabel);
      savedIncludeKeywords = [...savedIncludeKeywords, { ...inserted, keyword: inserted.keyword.trim() }]
        .sort((left, right) => byLabel(left.keyword, right.keyword));
    }

    return inserted.type === "include" ? inserted.keyword : keyword;
  }

  async function removeKeyword(keywordId: string) {
    keywordsError = "";

    const keywordToRemove = savedIncludeKeywords.find((keyword) => keyword.id === keywordId);
    if (!keywordToRemove) {
      return;
    }

    const response = await fetch("/api/user/keywords", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ keywordId })
    });

    if (!response.ok) {
      keywordsError = response.status === 401
        ? "You must be signed in to remove keywords."
        : "Failed to remove keyword.";
      return;
    }

    savedIncludeKeywords = savedIncludeKeywords.filter((keyword) => keyword.id !== keywordId);
    selectedJobTitles = selectedJobTitles.filter((title) => title !== keywordToRemove.keyword);
    jobTitleOptions = jobTitleOptions.filter((title) => title !== keywordToRemove.keyword);
  }

  async function saveJobSelection(titles: string[]) {
    keywordsError = "";

    const normalizedTitles = [...new Set(titles.map((title) => title.trim()).filter(Boolean))].sort(byLabel);
    const savedTitleSet = new Set(savedIncludeKeywords.map((keyword) => keyword.keyword));
    const missingTitles = normalizedTitles.filter((title) => !savedTitleSet.has(title));
    const removedKeywords = savedIncludeKeywords.filter((keyword) => !normalizedTitles.includes(keyword.keyword));

    for (const keyword of removedKeywords) {
      await removeKeyword(keyword.id);

      if (keywordsError) {
        return;
      }
    }

    for (const title of missingTitles) {
      const inserted = await addKeyword(title, "include");

      if (!inserted) {
        keywordsError = keywordsError || "Failed to save one or more selected titles.";
        return;
      }
    }

    selectedJobTitles = normalizedTitles;
    showJobModal = false;
    await refreshJobSelectionState();
  }

  async function refreshJobSelectionState() {
    await Promise.all([
      loadKeywords(),
      loadJobTitleOptions()
    ]);
  }

  async function closeJobModal() {
    showJobModal = false;
    await refreshJobSelectionState();
  }

  function toggleJobTitle(title: string) {
    if (selectedJobTitles.includes(title)) {
      selectedJobTitles = selectedJobTitles.filter((selectedTitle) => selectedTitle !== title);
      return;
    }

    selectedJobTitles = [...selectedJobTitles, title].sort(byLabel);
  }

  function toggleReview(job: SearchJob) {
    void saveOrRemoveReview(job);
  }

  function showJobDetail(job: SearchJob) {
    selectedJobDetail = job;
    showDetails = true;
  }

  function closeDetail() {
    selectedJobDetail = null;
    showDetails = false;
  }

  async function loadPrompts() {
    const response = await fetch("/api/user/prompts");

    if (!response.ok) {
      if (response.status !== 401) {
        reviewError = "Failed to load saved prompts.";
      }
      savedPrompts = [];
      return;
    }

    const data = await response.json() as UserPrompt[];
    savedPrompts = Array.isArray(data) ? data : [];
  }

  function copyPrompt(payload: string) {
    navigator.clipboard.writeText(payload);
  }

  async function searchJobs() {
    searchError = "";
    isSearching = true;

    const activeRegionNames = Array.from(activeRegions)
      .map((regionId) => regionById.get(regionId)?.name)
      .filter(isDefined);
    const activeMunicipalityNames = Array.from(activeMunicipalities)
      .map((municipalityId) => municipalityById.get(municipalityId)?.name)
      .filter(isDefined);
    const activePlaceLabels = [...new Set([...activeRegionNames, ...activeMunicipalityNames])];
    const activeTitles = [...selectedJobTitles];

    lastSearchPlaces = activePlaceLabels;
    lastSearchTitles = activeTitles;

    const payload = {
      regions: activeRegionNames,
      municipalities: activeMunicipalityNames,
      jobTitles: activeTitles,
      keyword: searchKeyword
    };

    try {
      const response = await fetch("/api/jobs/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        searchError = "Failed to search jobs.";
        return;
      }

      const data = await response.json() as SearchJob[];
      filteredResults = data.map((job) => ({
        ...job,
        _selected: savedJobIds.has(job.id),
        application_deadline_simple: job.application_deadline_simple || ""
      }));
    } finally {
      isSearching = false;
    }
  }

  async function loadSavedJobs() {
    reviewError = "";

    const savedResponse = await fetch("/api/user/savedJobs");
    if (!savedResponse.ok) {
      if (savedResponse.status !== 401) {
        reviewError = "Failed to load saved jobs.";
      }
      return;
    }

    const savedRows = await savedResponse.json() as Array<{ jobId: string }>;
    const jobIds = savedRows.map((row) => row.jobId).filter(Boolean);

  if (jobIds.length === 0) {
      reviewList = [];
      return;
    }

    const jobsResponse = await fetch("/api/jobs/JobById", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ jobIds })
    });

    if (!jobsResponse.ok) {
      reviewError = "Failed to load saved job details.";
      return;
    }

    const jobs = await jobsResponse.json() as SearchJob[];
    reviewList = jobs.map((job) => ({
      ...job,
      application_deadline_simple: job.application_deadline_simple || ""
    }));
  }

  async function saveOrRemoveReview(job: SearchJob) {
    reviewError = "";
    const alreadySaved = reviewList.some((saved) => saved.id === job.id);

    const response = await fetch("/api/user/savedJobs", {
      method: alreadySaved ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ jobId: job.id })
    });

    if (!response.ok) {
      reviewError = response.status === 401
        ? "You must be signed in to save jobs."
        : "Failed to update saved jobs.";
      return;
    }

    if (alreadySaved) {
      reviewList = reviewList.filter((saved) => saved.id !== job.id);
    } else {
      reviewList = [...reviewList, job];
    }

    filteredResults = filteredResults.map((result) => ({
      ...result,
      _selected: reviewList.some((saved) => saved.id === result.id) || (!alreadySaved && result.id === job.id)
    }));
  }

  function getAvailableMunicipalitiesForRegion(regionId: string) {
    return (municipalitiesByRegionId.get(regionId) ?? []).filter(
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
    const municipality = municipalityById.get(municipalityId);

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

  function isLocationActive(location: LocationSelection) {
    return location.type === "region"
      ? activeRegions.has(location.id)
      : activeMunicipalities.has(location.id);
  }

  const regionById = $derived.by(() => new Map(regions.map((region) => [region.id, region])));
  const municipalityById = $derived.by(() => new Map(municipalities.map((municipality) => [municipality.id, municipality])));
  const municipalitiesByRegionId = $derived.by(() => {
    const next = new Map<string, MunicipalityOption[]>();

    for (const municipality of municipalities) {
      const bucket = next.get(municipality.regionId);
      if (bucket) {
        bucket.push(municipality);
      } else {
        next.set(municipality.regionId, [municipality]);
      }
    }

    return next;
  });
  const savedJobIds = $derived.by(() => new Set(reviewList.map((job) => job.id)));

  const groupedLocations = $derived<GroupedLocations[]>(
    Array.from(availableRegions)
      .map((regionId) => {
        const region = regionById.get(regionId);

        if (!region) {
          return null;
        }

        return {
          region: { id: region.id, label: region.name, type: "region" as const },
          municipalities: (municipalitiesByRegionId.get(regionId) ?? [])
            .filter((municipality) => availableMunicipalities.has(municipality.id))
            .map((municipality) => ({
            id: municipality.id,
            label: municipality.name,
            type: "municipality" as const
          }))
        };
      })
      .filter(isDefined)
  );

  const activeLocationLabels = $derived<LocationSelection[]>([
    ...Array.from(activeRegions)
      .map((id) => regionById.get(id))
      .filter(isDefined)
      .map((region) => ({ id: region.id, label: region.name, type: "region" as const })),
    ...Array.from(activeMunicipalities)
      .map((id) => municipalityById.get(id))
      .filter(isDefined)
      .map((municipality) => ({ id: municipality.id, label: municipality.name, type: "municipality" as const }))
  ]);

  $effect(() => {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(subscriptionLocationStorageKey, JSON.stringify(activeLocationLabels));
    localStorage.setItem(subscriptionTitleStorageKey, JSON.stringify(selectedJobTitles));
  });
</script>

<section class="debug-page">
  <div class="page-intro">
    <p class="eyebrow">Search Workspace</p>
    <h2>Geografisk plats</h2>
    <p class="page-copy">Välj var du vill söka jobb någonstan.</p>
  </div>

  <button class="open-modal-button" onclick={() => showModal = true}>
  Välj kommun/region! 
  </button>

  {#if locationError}
    <p class="error-message">{locationError}</p>
  {/if}
  {#if reviewError}
    <p class="error-message">{reviewError}</p>
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
    <p class="empty-state">Du har ännu inte valt några platser.</p>
  {/if}

  <section class="tool-panel">
    <div class="section-heading">
      <h3>Jobb titlar</h3>
      <p>Välj titlarna du vill söka på.</p>
    </div>

    <button type="button" class="action-button" onclick={() => showJobModal = true}>Välj jobbtitlar här.</button>

    {#if keywordsError}
      <p class="error-message">{keywordsError}</p>
    {/if}

    {#if savedIncludeKeywords.length > 0}
      <div class="keyword-list">
        {#each savedIncludeKeywords as keyword (keyword.id)}
          <button
            type="button"
            class="keyword-chip {selectedJobTitles.includes(keyword.keyword) ? 'active' : ''}"
            onclick={() => toggleJobTitle(keyword.keyword)}
            aria-pressed={selectedJobTitles.includes(keyword.keyword)}
          >
            {keyword.keyword}
          </button>
        {/each}
      </div>
    {:else}
      <p class="empty-state">Ännu inga sparade titlar.</p>
    {/if}
  </section>

  <section class="tool-panel">
    <div class="section-heading">
      <h3>Sök!</h3>
      <p>Sök de valda kombinationerna</p>
    </div>

    <div class="search-controls">
      <input bind:value={searchKeyword} placeholder="Optional headline keyword" />
    </div>

    {#if searchError}
      <p class="error-message">{searchError}</p>
    {/if}

    {#if isSearching}
      <p class="status-message">Söker...</p>
    {/if}

    {#if activeLocationLabels.length > 0}
      <div class="active-location-list">
        {#each activeLocationLabels as location}
          <span class="active-location-chip">{location.label}</span>
        {/each}
      </div>
    {/if}

    <button type="button" class="search-cta" onclick={searchJobs} disabled={isSearching}>
      {isSearching ? "Söker..." : "Sök!"}
    </button>
  </section>

  <section class="tool-panel">
    <div class="section-heading">
      <h3>Sökresultat</h3>
      <p>Spara de jobb som är intressanta!</p>
    </div>

    {#if filteredResults.length > 0}
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Spara</th>
              <th>Jobb</th>
              <th>Arbetsgivare</th>
              <th>Kommun</th>
              <th>Ansökningsdeadline</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredResults as job}
              <tr>
                <td>
                  <button
                    type="button"
                    class="table-action {savedJobIds.has(job.id) ? 'active' : ''}"
                    onclick={() => toggleReview(job)}
                  >
                    {savedJobIds.has(job.id) ? "Saved" : "Save"}
                  </button>
                </td>
                <td><a href={job.webpage_url ?? "#"} target="_blank" rel="noreferrer">{job.headline}</a></td>
                <td>{job.employer_name}</td>
                <td>{job.municipality}</td>
                <td>{job.application_deadline_simple ?? job.application_deadline ?? ""}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else if !isSearching && lastSearchTitles.length > 0}
      <p class="empty-state">
        Inga resultat pa
        {#if lastSearchTitles.length > 0}
          &nbsp;[{lastSearchTitles.join(", ")}]
        {/if}
        {#if lastSearchPlaces.length > 0}
          &nbsp;i [{lastSearchPlaces.join(", ")}]
        {/if}
      </p>
    {:else}
      <p class="empty-state">Annu inga sokresultat.</p>
    {/if}
  </section>

</section>

<LocationModal
  {regions}
  {municipalities}
  {selectedLocations}
  open={showModal}
  onSave={saveModal}
  onClose={() => showModal = false}
/>

<JobSelectionModal
  open={showJobModal}
  availableTitles={jobTitleOptions}
  selectedTitles={selectedJobTitles}
  keywordError={keywordsError}
  onSave={saveJobSelection}
  onClose={closeJobModal}
  onAddKeyword={addKeyword}
/>

{#if showDetails && selectedJobDetail}
  <JobDetailModal
    job={selectedJobDetail}
    prompts={savedPrompts}
    onclose={closeDetail}
    oncopy={copyPrompt}
  />
{/if}

<style>
  .debug-page {
    display: grid;
    gap: 1rem;
    padding: 1.25rem;
    border-radius: var(--radius-container);
    background: var(--color-surface-800);
    border: 1px solid var(--color-surface-600);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
  }

  .page-intro {
    display: grid;
    gap: 0.35rem;
  }

  .page-intro h2,
  .page-intro p {
    margin: 0;
  }

  .eyebrow {
    color: var(--color-warning-400);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .page-copy {
    color: var(--color-primary-300);
    max-width: 42rem;
  }

  .open-modal-button {
    width: fit-content;
    border: 1px solid color-mix(in srgb, var(--color-secondary-300) 24%, transparent);
    border-radius: 999px;
    background: var(--color-secondary-500);
    color: var(--color-secondary-contrast-500);
    padding: 0.7rem 1.15rem;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.14s ease, filter 0.14s ease, border-color 0.14s ease;
  }

  .selected-locations {
    display: grid;
    gap: 1rem;
  }

  .tool-panel {
    display: grid;
    gap: 0.9rem;
    padding: 1rem;
    border-radius: calc(var(--radius-container) * 0.9);
    background: var(--color-surface-700);
    border: 1px solid var(--color-surface-600);
  }

  .section-heading {
    display: grid;
    gap: 0.2rem;
  }

  .section-heading h3,
  .section-heading p {
    margin: 0;
  }

  .section-heading p {
    color: var(--color-primary-400);
  }

  .error-message {
    margin: 0;
    color: var(--color-error-400);
  }

  .status-message {
    margin: 0;
    color: var(--color-secondary-300);
  }

  .empty-state {
    margin: 0;
    color: var(--color-primary-400);
  }

  .location-group {
    padding: 1rem;
    border-radius: calc(var(--radius-container) * 0.9);
    background: var(--color-surface-700);
    border: 1px solid var(--color-surface-600);
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
    transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
  }

  .location-chip.region {
    background: var(--color-surface-600);
    color: var(--base-font-color);
    border: 1px solid var(--color-surface-500);
  }

  .location-chip.region.active {
    background: var(--color-secondary-500);
    color: var(--color-secondary-contrast-500);
  }

  .location-chip.municipality {
    background: var(--color-surface-700);
    color: var(--color-primary-300);
    border: 1px solid var(--color-surface-600);
  }

  .location-chip.municipality.active {
    background: var(--color-tertiary-500);
    color: var(--color-tertiary-contrast-500);
  }

  .search-controls {
    display: grid;
    gap: 0.75rem;
  }

  .search-controls input {
    width: 100%;
    padding: 0.75rem 0.9rem;
    border-radius: 0.85rem;
    border: 1px solid var(--color-surface-600);
    background: var(--color-surface-900);
    color: var(--base-font-color);
    font: inherit;
  }

  .search-cta {
    justify-self: center;
    min-width: 10rem;
    min-height: 10rem;
    padding: 1.4rem;
    border-radius: 999px;
    border: 1px solid var(--color-tertiary-500);
    background: var(--color-tertiary-500);
    color: var(--color-tertiary-contrast-500);
    font: inherit;
    font-size: 1.25rem;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
  }

  .search-cta:disabled {
    opacity: 0.75;
    cursor: wait;
  }

  .keyword-list,
  .active-location-list {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .action-button,
  .keyword-chip,
  .table-action,
  .active-location-chip {
    padding: 0.7rem 1rem;
    border-radius: 999px;
    font: inherit;
  }

  .action-button,
  .table-action {
    border: 1px solid var(--color-surface-500);
    background: var(--color-secondary-500);
    color: var(--color-secondary-contrast-500);
    cursor: pointer;
    font-weight: 700;
  }

  .keyword-chip {
    border: 1px solid var(--color-surface-500);
    background: var(--color-surface-600);
    color: var(--base-font-color);
    cursor: pointer;
  }

  .keyword-chip.active {
    background: var(--color-warning-500);
    color: var(--color-warning-contrast-500);
    border-color: transparent;
  }

  .active-location-chip {
    background: var(--color-surface-800);
    color: var(--color-primary-300);
    border: 1px solid var(--color-surface-600);
  }

  .table-shell {
    overflow-x: auto;
    border-radius: 1rem;
    border: 1px solid var(--color-surface-600);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    background: var(--color-surface-800);
  }

  th,
  td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-surface-700);
  }

  th {
    color: var(--color-primary-300);
    font-size: 0.9rem;
  }

  td a {
    color: var(--color-tertiary-300);
  }

  .table-action.active {
    background: var(--color-secondary-500);
  }

  @media (hover: hover) and (pointer: fine) {
    .open-modal-button {
      transition: background 0.14s ease 100ms, filter 0.14s ease 100ms, border-color 0.14s ease 100ms;
    }

    .open-modal-button:hover {
      filter: brightness(1.05);
    }

    .location-chip {
      transition: background 0.14s ease 100ms, color 0.14s ease 100ms, border-color 0.14s ease 100ms;
    }

    .location-chip.region:hover {
      background: var(--color-surface-500);
    }

    .location-chip.municipality:hover {
      background: var(--color-surface-600);
    }

    .action-button:hover,
    .table-action:hover,
    .search-cta:hover {
      filter: brightness(1.05);
    }
  }
</style>
