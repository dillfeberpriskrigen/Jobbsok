<script lang=ts>
import SettingsModal from "$lib/components/SettingsModal.svelte";
import JobDetailModal from "$lib/components/JobDetailModal.svelte";
import LocationModal from "$lib/components/LocationSearchModal.svelte";
import { onMount } from "svelte";
import type { jobs } from "$lib/server/db/jobSchema"
// Deklarationer
type keyword = {
  id: string;
  keyword: string;
  type?: string;
  userId: string;
};
  let { data } = $props();

  type Region = { id: string; name: string };
  type Municipality = { id: string; name: string; regionId: string };
  type Location = { id: string; label: string; type: string };
let regions = $state<Region[]>([]);
let municipalities = $state<Municipality[]>([]);
let selectedLocations: Location[] = $state([]);

  let showLocationModal = $state(false);

 let activeRegions = $state(new Set<string>());
let activeMunicipalities = $state(new Set<string>());
let availableRegions = $state(new Set<string>());
let availableMunicipalities = $state(new Set<string>());
	let jobTitlesList = $state([]);
  let newKeyword = $state('');
  let newType = $state('include');

	// -----------------------------
	// State
	// -----------------------------
	let selectedRegions = $state<Region[]>([]); //Den här borde nu vara den lista som kommer från modalen eller.. läsas från local?
	let selectedJobTitles = $state<string[]>([]); //Tror det här borde vara type job.id? 

	let filteredResults = $state<jobs[]>([]);
  let reviewList = $state<jobs[]>([]);

	let searchKeyword = $state("");


	let selectedJobDetail = $state(null);
	let aiPrompt = $state("");

  let showSettings = $state(false);
  let showDetails = $state(false);

  let selectedKeywords = $state<keyword[]>([]);   // which keywords are active for filtering

  let regionsList = $state([]);
  let municipalitiesList = $state([]); // ska användas


  
  function saveModal(event) {
    selectedLocations = [...event.detail];
  $: console.log("[DEBUG] selectedLocations:", selectedLocations);
    availableRegions = new Set(selectedLocations.filter(l => l.type === "region").map(l => l.id));
    availableMunicipalities = new Set(selectedLocations.filter(l => l.type === "municipality").map(l => l.id));

    activeRegions = new Set([...activeRegions].filter(id => availableRegions.has(id)));
    activeMunicipalities = new Set([...activeMunicipalities].filter(id => availableMunicipalities.has(id)));

    showLocationModal = false;
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

const displayedLocations = $derived<Location[]>([
  ...Array.from(availableRegions)
    .map(id => regions.find(r => r.id === id))
    .filter((r): r is Region => Boolean(r))
    .map(r => ({ id: r.id, label: r.name, type: "region" })),

  ...Array.from(availableMunicipalities)
    .map(id => municipalities.find(m => m.id === id))
    .filter((m): m is Municipality => Boolean(m))
    .map(m => ({ id: m.id, label: m.name, type: "municipality" }))
]);
const activeDisplayedLocations = $derived<Location[]>(() => [
  ...Array.from(activeRegions)
    .map(id => regions.find(r => r.id === id))
    .filter((r): r is Region => Boolean(r))
    .map(r => ({ id: r.id, label: r.name, type: "region" })),

  ...Array.from(activeMunicipalities)
    .map(id => municipalities.find(m => m.id === id))
    .filter((m): m is Municipality => Boolean(m))
    .map(m => ({ id: m.id, label: m.name, type: "municipality" }))
]);
  async function performSearch() {
    const payload = {
      regions: [...selectedRegions, ...selectedMunicipalities], //Todo: Kolla hur modalen returnerar valda kommuner
      jobTitles: [],
      keyword: searchKeyword
    };

  console.log("[DEBUG] Performing search with payload:", payload);

  try {
    const res = await fetch("/api/jobs/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Search request failed");

    const data = await res.json();
    filteredResults = data.map(job => ({
      ...job,
      _selected: false,
      application_deadline_simple: job.application_deadline_simple || "",
    }));
    console.log("[DEBUG] Search results:", filteredResults);
  } catch (err) {
    console.error("[ERROR] Search failed:", err);
  }
}
//async function loadLocations() { // används det här till någonting längre? Nej men det ska användas! Ta inte bort vi sparar inte locations än
//  try {
//    const resRegions = await fetch("/api/data/regions");
//    const regionsData = await resRegions.json();
//    regionsList = regionsData.map(r => r.name);
//    const resMunicipalities = await fetch("/api/data/municipalities");
//    municipalitiesList = await resMunicipalities.json();

//    const resSaved = await fetch("/api/user/locations");
//    selectedLocations = await resSaved.json();
//  } catch (err) {
//    console.error("[DEBUG] Error loading locations:", err);
//  }
//}

//onMount(loadLocations);

  function closeDetail() {
    showDetails = false;
    selectedJobDetail = null;
  }
  async function loadKeywords() {
    console.log('[DEBUG][Frontend] Loading keywords...');
    try {
      const res = await fetch('/api/user/keywords');
      if (!res.ok) throw new Error('Failed to fetch keywords');
      const data = await res.json();
      console.log('[DEBUG][Frontend] Fetched keywords:', data);

      const includeKeywords = data.filter(k => k.type === 'include');
      jobTitlesList = includeKeywords.map(k => k.keyword.trim());
    } catch (err) {
      console.error('[DEBUG][Frontend] Error loading keywords:', err);
    }
  }

async function saveSelectedKeywords() {
  if (selectedKeywords.length === 0) return;

  // Convert selectedKeywords objects into string array
  const selectedKeywordTexts = selectedKeywords.map(k => k.keyword.trim());

  // Add new keywords to jobTitlesList (string[])
  const newKeywords = selectedKeywordTexts.filter(kw => !jobTitlesList.includes(kw));
  if (newKeywords.length > 0) {
    jobTitlesList = [...jobTitlesList, ...newKeywords];
  }

  // Add to selectedJobTitles (string[])
  const newSelectedTitles = selectedKeywordTexts.filter(kw => !selectedJobTitles.includes(kw));
  if (newSelectedTitles.length > 0) {
    selectedJobTitles = [...selectedJobTitles, ...newSelectedTitles];
  }

  // Save the selectedKeywords objects to the backend
  try {
    const res = await fetch('/api/user/selected-keywords', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: selectedKeywords }) // still sending objects
    });

    if (!res.ok) throw new Error('Failed to save selected keywords');

    const result = await res.json();
    console.log('[DEBUG][Frontend] Saved selected keywords:', result);
  } catch (err) {
    console.error('[DEBUG][Frontend] Error saving selected keywords:', err);
  }

  // Reset input and selection
  searchKeyword = "";
  selectedKeywords = [];
}
    async function addKeyword() {
    if (!newKeyword.trim()) return;

    console.log('[DEBUG][Frontend] Adding keyword:', newKeyword, 'type:', newType);

    try {
      const res = await fetch('/api/user/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: newKeyword, type: newType }) // ✅ send "keyword"
      });

      if (!res.ok) throw new Error('Failed to add keyword');

      const inserted = await res.json();
      console.log('[DEBUG][Frontend] Keyword inserted:', inserted);

      // Only add "include" keywords to jobTitlesList
      if (inserted.type === 'include') {
        jobTitlesList = [...jobTitlesList, inserted.keyword];
      }

      newKeyword = ''; // clear input
    } catch (err) {
      console.error('[DEBUG][Frontend] Error adding keyword:', err);
    }
  }

  async function deleteKeyword(keywordObj) { //Tror fortfarande används bara inte är implementerad i ux
    console.log('[DEBUG][Frontend] Deleting keyword:', keywordObj);

    try {
      const res = await fetch('/api/user/keywords', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywordId: keywordObj.id })
      });

      if (!res.ok) throw new Error('Failed to delete keyword');

      const result = await res.json();
      console.log('[DEBUG][Frontend] Delete result:', result);

      // Remove from local list
      jobTitlesList = jobTitlesList.filter(k => k !== keywordObj.keyword);
    } catch (err) {
      console.error('[DEBUG][Frontend] Error deleting keyword:', err);
    }
  }


//Key handling TODO: Organisera dina funktioner
     


function copyPrompt() {
    navigator.clipboard.writeText(aiPrompt);
  }



  // Toggle job titles
  function toggleJob(title) {
    if (selectedJobTitles.includes(title)) {
      selectedJobTitles = selectedJobTitles.filter(t => t !== title);
    } else {
      selectedJobTitles = [...selectedJobTitles, title];
    }
  }

  // Toggle regions
  function toggleRegion(region: Region) {
  console.log("[DEBUG] toggleRegion called with:", region);
  if (selectedRegions.includes(region)) {
    selectedRegions = selectedRegions.filter(r => r !== region);
  } else {
    selectedRegions = [...selectedRegions, region];
  }
}

function showJobDetail(job: jobs) {
  selectedJobDetail = job; // only now the modal shows
  showDetails = true;
}




async function searchStoredJobs() { // Min nuvarande sök
    if (selectedJobTitles.length === 0) return;

    const params = {
      regions: selectedRegions,
      jobTitles: selectedJobTitles,
      keyword: searchKeyword
    };

    try {
      const res = await fetch("api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });

      const data = await res.json();

      filteredResults = data.map(job => ({
        ...job,
        _selected: false,
        application_deadline_simple: job.application_deadline_simple || ""
      }));
    } catch (err) {
      console.error("Failed to search stored jobs:", err);
    }
  }
function toggleAllRegions() { //DEP
  if (selectedRegions.length === regionsList.length) {
    selectedRegions = []; // deselect all
  } else {
    selectedRegions = [...regionsList]; 
  }
}

function toggleAllJobTitles() {
  if (selectedJobTitles.length === jobTitlesList.length) {
    selectedJobTitles = []; 
  } else {
    selectedJobTitles = [...jobTitlesList]; 
  }
}

function openSettings() {
	showSettings = true;
}

function closeSettings() {
	showSettings = false;
}

function toggleReview(job:jobs) {
  if (reviewList.some(j => j.id === job.id)) {
    reviewList = reviewList.filter(j => j.id !== job.id);
  } else {
    reviewList = [...reviewList, job];
  }
}

onMount(loadKeywords);
  onMount(async () => {
    regions = await fetch("/api/data/regions").then(r => r.json()); //De här laddas till min modal.. Det borde de inte göra? Eller? 
    municipalities = await fetch("/api/data/municipalities").then(r => r.json());

  });
onMount(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedJobDetail) {
        selectedJobDetail = null;
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  });


onMount(() => {
	const handleKey = (e: KeyboardEvent) => {
		if (e.key === "Escape") {
			showSettings = false;
		}
	};

	window.addEventListener("keydown", handleKey);

	return () => {
		window.removeEventListener("keydown", handleKey);
	};
});


</script>
<style>
  
	h2 { margin-top: 30px; }
	table { border-collapse: collapse; width: 100%; margin-top: 10px; }
	th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
	button { margin-top: 10px; }
	button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
<button onclick={openSettings} style="float:right;">
	⚙ Settings
</button>
{#if data.user}
	<h1>Hi {data.user.name}, </h1>
{:else}
	<h1>Hi guest</h1>
{/if}

<button type="button" class="preset-filled-primary-500" onclick={() => showLocationModal = true}>
Vilka regioner/kommuner vill du söka jobb i?
</button>
<h3 class="mb-2">Dina sparade platser:</h3> 
<div class="chips">
  {#each displayedLocations as loc}
    <div class="chip">{loc.label}</div>
  {/each}
</div>

<h3>Lägg till ny sökterm</h3>
<input bind:value={newKeyword} placeholder="Keyword" />
<select bind:value={newType}>
  <option value="include">Inkluderande nyckelord</option>
  <option value="exclude">Exkluderande nyckelord</option>
</select>
<button onclick={addKeyword}>Spara</button>

<!--
<div style="margin-top: 10px;">


// {#if extractedKeywords.length > 0}
//   <div class="keyword-list" style="margin-top: 10px;">
//     <p>Välj vilka nyckelord du vill spara:</p>
//     {#each extractedKeywords as kw}
//       <label style="display: block; margin-bottom: 4px;">
//         <input type="checkbox"
//                bind:group={selectedKeywords}
//                value={kw} />
//         {kw}
//       </label>
//     {/each}
//   </div>
//   <button class="btn" onclick={saveSelectedKeywords}>
//     Spara valda nyckelord
//   </button>
// {/if}

//<hr class="hr border-t-8" />
</div>
*/ -->
  <h3 class="mb-2">Dina sparade nyckelord:</h3>
  <div class="flex flex-wrap gap-2 mb-4">
    {#each jobTitlesList as title}
  <button
    class="{selectedJobTitles.includes(title) ? 'preset-filled-primary-500' : 'btn-outline'}"
    type="button"
    onclick={() => toggleJob(title)}
  >
    {title}
  </button>
{/each}
<button type="button" class="btn small-btn" onclick={toggleAllJobTitles}>
    {selectedJobTitles.length === jobTitlesList.length ? "Deselect All" : "Select All"}
  </button>
  </div>
 <div>
<hr class="hr border-t-8" />
 </div>
<div style="margin-top:20px;">
<button type="button" class="btn preset-filled-primary-500" onclick={searchStoredJobs}>
Sök Britt-marie för fa-an!
</button>
</div>


   

<h2>Search Results</h2>
<table>
	<thead>
	<tr>
		<th>Spara</th>
		<th>Titel</th>
		<th>Arbetsgivare</th>
		<th>Kommun</th>
		<th>Ansöknings deadline</th>
	</tr>
	</thead>
	<tbody>
	{#each filteredResults as job}
<tr>
  <td>
    <button
  class="{reviewList.some(j => j.id === job.id) ? 'preset-filled-primary-500' : 'btn-outline'} small-btn"
  onclick={() => toggleReview(job)}
>
  {reviewList.some(j => j.id === job.id) ? "Saved" : "Save"}
</button>
  </td>
  <td><a href={job.webpage_url} target="_blank">{job.headline}</a></td>
  <td>{job.employer_name}</td>
  <td>{job.municipality}</td>
  <td>{job.application_deadline}</td>
</tr>
{/each}
	</tbody>
</table>

<h3 class="mb-2">Alla aktiva platser</h3>
<div class="chips">
  {#each activeDisplayedLocations as loc}
    <div class="chip">{loc.label}</div>
  {/each}
</div>


<!-- Review List -->
<h2>Review List</h2>
<table>
	<thead>
	<tr>
		<th>Headline</th>
		<th>Employer</th>
		<th>Municipality</th>
		<th>Deadline</th>
		<th>View</th>
	</tr>
	</thead>
	<tbody>
	{#each reviewList as job}
		<tr>
			<td>{job.headline}</td>
			<td>{job.employer_name}</td>
			<td>{job.municipality}</td>
			<td>{job.application_deadline_simple}</td>
			<td><button onclick={() => showJobDetail(job)}>View</button></td>
		</tr>
	{/each}
	</tbody>
</table>
{#if showSettings}
  <SettingsModal
    open={showSettings}
    //deleteFilter={deleteFilter}
    on:close={closeSettings}
  />
{/if}

{#if showDetails}
  <JobDetailModal
    job={selectedJobDetail}
    aiPrompt={aiPrompt}
    on:close={closeDetail}
    oncopy={copyPrompt}
  />
{/if}


<LocationModal
  {regions}
  {municipalities}
  {selectedLocations}
  open={showLocationModal}
  on:save={saveModal}
  on:close={() => showLocationModal = false}
/>