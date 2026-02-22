<script>
import SettingsModal from "$lib/components/SettingsModal.svelte";
import JobDetailModal from "$lib/components/JobDetailModal.svelte";
import { onMount } from "svelte";
// Deklarationer

	const regionsList = [
		"Dalarnas län", "Östergotlands län", "Örebro län",
		"Jönköpings län", "Södermanlands län",
		"Västmanlands län", "Gävleborgs län"
	];

	let jobTitlesList = $state([
		"Snut", "ekonomi",
		"strateg", "verksamhetsutvecklare"
	]);

	// -----------------------------
	// State
	// -----------------------------
	let selectedRegions = $state([]); //Det här borde läsas från databas
	let selectedJobTitles = $state([]);

	let allResults = $state([]);
	let filteredResults = $state([]);
	let reviewList = $state([]);

	let searchKeyword = $state("");
	let newFilterInput = $state("");
	let filterMessage = $state("");

    let parsedKeywords = $state([]);   
	let filters = $state([]);   // 👈 store backend filters

	let selectedJobDetail = $state(null);
	let aiPrompt = $state("");

    let showSettings = $state(false);
    let showDetails = $state(false);

  let extractedKeywords = $state([]);  // array of keywords
  let selectedKeywords = $state([]);   // which keywords are active for filtering

  function closeDetail() {
    showDetails = false;
    selectedJobDetail = null;
  }
//Key handling TODO: Organisera dina funktioner
   onMount(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && selectedJobDetail) {
        selectedJobDetail = null;
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  });

  
    function parseKeywords() {
    extractedKeywords = searchKeyword
      .split(/[,;]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);

    // Reset selectedKeywords
    selectedKeywords = [];
  }


function saveSelectedKeywords() {
  if (selectedKeywords.length === 0) return;

  // Add new keywords to jobTitlesList if not already present
  const newKeywords = selectedKeywords.filter(kw => !jobTitlesList.includes(kw));
  if (newKeywords.length > 0) {
    jobTitlesList = [...jobTitlesList, ...newKeywords];
  }

  // Add to selectedJobTitles
  selectedJobTitles = [...selectedJobTitles, ...selectedKeywords.filter(kw => !selectedJobTitles.includes(kw))];

  // Clear input and selections
  searchKeyword = "";
  extractedKeywords = [];
  selectedKeywords = [];
}




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
  function toggleRegion(region) {
    if (selectedRegions.includes(region)) {
      selectedRegions = selectedRegions.filter(r => r !== region);
    } else {
      selectedRegions = [...selectedRegions, region];
    }
  }

function showJobDetail(job) {
  selectedJobDetail = job; // only now the modal shows
  showDetails = true;
}


onMount(() => {
	const handleKey = (e) => {
		if (e.key === "Escape") {
			showSettings = false;
		}
	};

	window.addEventListener("keydown", handleKey);

	return () => {
		window.removeEventListener("keydown", handleKey);
	};
});

async function fetchNewJobs() { // TODO: 
    const params = {
        region: selectedRegions, 
        q: selectedJobTitles.map(j => `"${j}"`).join(" OR "),
        limit: 50
    };

    try {
        const res = await fetch("api/jobs/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params)
        });
        const data = await res.json();

        if (data.ok) {
            allResults = data.jobs.map(job => ({ ...job, _selected: false }));
            filteredResults = [...allResults];
            filterMessage = `Fetched ${data.jobs.length} new jobs!`;
            setTimeout(() => filterMessage = "", 3000);
        }
    } catch (err) {
        console.error(err);
        filterMessage = "Failed to fetch new jobs.";
    }
}

async function searchStoredJobs() {
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
function toggleAllRegions() {
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




// Start filter
	async function loadFilters() {
  try {
    const res = await fetch("http://localhost:3000/filters");
    filters = await res.json();
  } catch (err) {
    console.error("Failed loading filters", err);
  }
}

onMount(() => {
  loadFilters();
});


function filterLocalResults() { // Vill jag ha kvar filtret? 
    const excludeFilters = filters
        .filter(f => f.type === "exclude")
        .map(f => f.value.toLowerCase());

    filteredResults = allResults.filter(job =>
        selectedRegions.includes(job.region) && 
        selectedJobTitles.some(t =>
            job.headline?.toLowerCase().includes(t.toLowerCase())
        ) &&
        !excludeFilters.some(f =>
            job.headline?.toLowerCase().includes(f)
        ) &&
        (!searchKeyword ||
            job.headline?.toLowerCase().includes(searchKeyword.toLowerCase()))
    );
}

	async function addJobFilter() {
		const value = newFilterInput.trim();
		if (!value) {
			filterMessage = "Enter filter value";
			return;
		}

		try {
			const res = await fetch("http://localhost:3000/filters", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					value,
					field: "headline",
					type: "exclude"
				})
			});

			const data = await res.json();

			if (data.ok) {
				filterMessage = `Filter "${value}" added!`;
				newFilterInput = "";
				await loadFilters(); // refresh list
			} else {
				filterMessage = data.message;
			}

		} catch {
			filterMessage = "Failed to add filter.";
		}

		setTimeout(() => filterMessage = "", 3000);
	}

	async function deleteFilter(id) {
		try {
			await fetch(`http://localhost:3000/filters/${id}`, {
				method: "DELETE"
			});
			await loadFilters();
		} catch (err) {
			console.error("Failed deleting filter", err);
		}
	}

// Slut filter sektion
// Nuvarande filter funktion TODO: Fixa. Är inte det här min nuvarande sökfunktion?
  function filterJobsByKeywords() {
    parsedKeywords = searchKeyword
      .split(/[,;]+/)
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);

    filteredResults = allResults.filter(job =>
      parsedKeywords.every(keyword =>
        job.headline?.toLowerCase().includes(keyword)
      )
    );


  }
function toggleReview(job) {
  if (reviewList.some(j => j.id === job.id)) {
    reviewList = reviewList.filter(j => j.id !== job.id);
  } else {
    reviewList = [...reviewList, job];
  }
}

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




<div style="margin-top: 10px;">
  <input
    class="input"
    type="text"
    placeholder="Skriv söktermer, separera med komma"
    bind:value={searchKeyword}
    oninput={parseKeywords}
  />

  {#if extractedKeywords.length > 0}
    <div class="keyword-list" style="margin-top: 10px;">
      <p>Välj vilka nyckelord du vill spara:</p>
      {#each extractedKeywords as kw}
        <label style="display: block; margin-bottom: 4px;">
          <input type="checkbox"
                 bind:group={selectedKeywords}
                 value={kw} />
          {kw}
        </label>
      {/each}
    </div>

    <button class="btn" onclick={saveSelectedKeywords}>
      Spara valda nyckelord
    </button>
  {/if}

  <button
    type="button"
    class="btn preset-filled-primary-500"
    onclick={searchStoredJobs}
    disabled={selectedJobTitles.length === 0}
  >
    Sök!
  </button>
</div>

<div class="p-4">

  <h3 class="mb-2">Filtrera på förinställda titlar</h3>
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

  <!-- Regions -->
  <h3 class="mb-2">Välj vilka regioner du vill leta i</h3>
  <div class="flex flex-wrap gap-2 mb-4">
  {#each regionsList as region}
  <button
    class="{selectedRegions.includes(region) ? 'preset-filled-primary-500' : 'btn-outline'}"
    type="button"
    onclick={() => toggleRegion(region)}
  >
    {region}
  </button>
{/each}
  <button type="button" class="btn small-btn" onclick={toggleAllRegions}>
    {selectedRegions.length === regionsList.length ? "Deselect All" : "Select All"}
  </button>
  </div>

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
    filters={filters}
    deleteFilter={deleteFilter}
    onclose={closeSettings}
    onfetch={fetchNewJobs}
  />
{/if}

{#if showDetails}
  <JobDetailModal
    job={selectedJobDetail}
    aiPrompt={aiPrompt}
    onclose={closeDetail}
    oncopy={copyPrompt}
  />
{/if}
