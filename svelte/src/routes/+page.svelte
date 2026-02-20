<script>
import SettingsModal from "$lib/components/SettingsModal.svelte";
import JobDetailModal from "$lib/components/JobDetailModal.svelte";
// Deklarationer

	const regionsList = [
		"Dalarnas län", "Östergotlands län", "Örebro län",
		"Jönköpings län", "Södermanlands län",
		"Västmanlands län", "Gävleborgs län"
	];

	const jobTitlesList = [
		"Snut", "ekonomi",
		"strateg", "verksamhetsutvecklare"
	];

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

	let filters = $state([]);   // 👈 store backend filters

	let selectedJobDetail = $state(null);
	let aiPrompt = $state("");
    let activeIndex = -1;

    let showSettings = $state(false);
    const regionMap = {
        "Blekinge": "DGQd_uYs_oKb",
        "Dalarna": "oDpK_oZ2_WYt",
        "Gotland": "K8iD_VQv_2BA",
        "Gavleborg": "zupA_8Nt_xcD",
        "Halland": "wjee_qH2_yb6",
        "Jamtland": "65Ms_7r1_RTG",
        "Jonkoping": "MtbE_xWT_eMi",
        "Kalmar": "9QUH_2bb_6Np",
        "Kronoberg": "tF3y_MF9_h5G",
        "Norrbotten": "9hXe_F4g_eTG",
        "Skane": "CaRE_1nn_cSU",
        "Stockholm": "CifL_Rzy_Mku",
        "Sodermanland": "s93u_BEb_sx2",
        "Uppsala": "zBon_eET_fFU",
        "Varmland": "EVVp_h6U_GSZ",
        "Vasterbotten": "g5Tt_CAV_zBd",
        "Vasternorrland": "NvUF_SP1_1zo",
        "Vastmanland": "G6DV_fKE_Viz",
        "Vastra Gotaland": "zdoY_6u5_Krt",
        "Orebro": "xTCk_nT5_Zjm",
        "Ostergotland": "oLT3_Q9p_3nn",
    };


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

function getSelectedRegionCodes() {
    return selectedRegions.map(name => regionMap[name]).filter(Boolean);
}
function showJobDetail(job) {
  selectedJobDetail = job; // only now the modal shows
}

import { onMount } from "svelte";

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

async function fetchNewJobs() {
    const params = {
        region: selectedRegions,  // codes only
        q: selectedJobTitles.map(j => `"${j}"`).join(" OR "),
        limit: 50
    };

    try {
        const res = await fetch("http://localhost:3000/jobs/fetch", {
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
    const params = {
        regions: selectedRegions,
        keyword: searchKeyword,
        jobTitles: selectedJobTitles
    };

    try {
        const res = await fetch("http://localhost:3000/jobs/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(params)
        });
        const data = await res.json();

        // map application_deadline_simple
        filteredResults = data.map(job => ({
            ...job,
            _selected: false,
            application_deadline_simple: job.application_deadline_simple || ""
        }));
    } catch (err) {
        console.error(err);
        filterMessage = "Failed to search stored jobs.";
    }
}
function toggleAllRegions() {
  if (selectedRegions.length === regionsList.length) {
    selectedRegions = []; // deselect all
  } else {
    selectedRegions = [...regionsList]; // select all
  }
}

function toggleAllJobTitles() {
  if (selectedJobTitles.length === jobTitlesList.length) {
    selectedJobTitles = []; // deselect all
  } else {
    selectedJobTitles = [...jobTitlesList]; // select all
  }
}

function openSettings() {
	showSettings = true;
}

function closeSettings() {
	showSettings = false;
}
	// -----------------------------
	// Load filters from backend
	// -----------------------------
	async function loadFilters() {
		try {
			const res = await fetch("http://localhost:3000/filters");
			filters = await res.json();
		} catch (err) {
			console.error("Failed loading filters", err);
		}
	}

	loadFilters();



	// -----------------------------
	// Local filtering (regions + titles + backend filters)
	// -----------------------------
	
function filterLocalResults() {
    const excludeFilters = filters
        .filter(f => f.type === "exclude")
        .map(f => f.value.toLowerCase());

    filteredResults = allResults.filter(job =>
        selectedRegions.includes(job.region) && // ← use region now
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

	// -----------------------------
	// Add filter
	// -----------------------------
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

	// -----------------------------
	// Delete filter
	// -----------------------------
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

	// -----------------------------
	// Move to review
	// -----------------------------
	function moveToReview() {
		const selectedJobs = filteredResults.filter(
			job => job._selected && !reviewList.some(j => j.id === job.id)
		);
		if (selectedJobs.length) {
			reviewList = [...reviewList, ...selectedJobs];
		}
	}

	// -----------------------------
	// Clear job detail if removed
	// -----------------------------
	$effect(() => {
		if (selectedJobDetail && !reviewList.find(j => j.id === selectedJobDetail.id)) {
			selectedJobDetail = null;
			aiPrompt = "";
		}
	});
</script>
<style>
  
	body { font-family: Arial, sans-serif; margin: 20px; }
	h2 { margin-top: 30px; }
	.checkbox-group label { margin-right: 12px; }
	table { border-collapse: collapse; width: 100%; margin-top: 10px; }
	th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
	button { margin-top: 10px; }
	.job-detail { border: 1px solid #aaa; padding: 10px; margin-top: 20px; }
	textarea { width: 100%; height: 120px; margin-top: 5px; }
	.message { color: green; margin-top: 5px; }
	button:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
<button on:click={openSettings} style="float:right;">
	⚙ Settings
</button>
<div style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
  <input
    class="input"
    type="text"
    placeholder="Filtrera på nyckelord om det behövs"
    bind:value={searchKeyword}
    title="Search jobs"
  />
  <button
    type="button"
    class="btn preset-filled-primary-500"
    on:click={filterLocalResults}
    disabled={!searchKeyword}
  >
    Filtrera
  </button>
</div>


<div class="p-4">

  <h3 class="mb-2">Filtrera på förinställda titlar</h3>
  <div class="flex flex-wrap gap-2 mb-4">
    {#each jobTitlesList as title}
  <button
    class="{selectedJobTitles.includes(title) ? 'preset-filled-primary-500' : 'btn-outline'}"
    type="button"
    on:click={() => toggleJob(title)}
  >
    {title}
  </button>
{/each}
<button type="button" class="btn small-btn" on:click={toggleAllJobTitles}>
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
    on:click={() => toggleRegion(region)}
  >
    {region}
  </button>
{/each}
  <button type="button" class="btn small-btn" on:click={toggleAllRegions}>
    {selectedRegions.length === regionsList.length ? "Deselect All" : "Select All"}
  </button>
  </div>

</div>
<!-- Job Titles -->
 <div>
<hr class="hr border-t-8" />
 </div>
<div style="margin-top:20px;">
<button type="button" class="btn preset-filled-primary-500" on:click={searchStoredJobs}>
Sök Britt-marie för fa-an!
</button>
</div>
 <!-- Keyword Search -->


<div style="margin-top: 10px; display: flex; gap: 8px; align-items: center;">
  <input
    class="input"
    type="text"
    placeholder="Filtrera på nyckelord om det behövs"
    bind:value={searchKeyword}
    title="Search jobs"
  />
  <button
    type="button"
    class="btn preset-filled-primary-500"
    on:click={filterLocalResults}
    disabled={!searchKeyword}
  >
    Filtrera
  </button>
</div>

   

<!-- Search Results -->
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
			<td><input type="checkbox" bind:checked={job._selected} /></td>
			<td><a href={job.webpage_url} target="_blank">{job.headline}</a></td>
			<td>{job.employer_name}</td>
			<td>{job.municipality}</td>
			<td>{job.application_deadline_simple}</td>
		</tr>
	{/each}
	</tbody>
</table>

<button on:click={moveToReview} disabled={!filteredResults.some(j => j._selected)}>
	Move Selected to Review
</button>

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
			<td><button on:click={() => showJobDetail(job)}>View</button></td>
		</tr>
	{/each}
	</tbody>
</table>

<!-- Job Detail -->
{#if selectedJobDetail}
	<div class="job-detail">
		<h3><a href={selectedJobDetail.webpage_url} target="_blank">{selectedJobDetail.headline}</a></h3>
		<p><strong>Employer:</strong> {selectedJobDetail.employer_name}</p>
		<p><strong>Municipality:</strong> {selectedJobDetail.municipality}</p>
		<p><strong>Deadline:</strong> {selectedJobDetail.application_deadline_simple}</p>

		<p><strong>Description:</strong></p>
		<textarea readonly>{selectedJobDetail.description}</textarea>

		<p><strong>AI Prompt:</strong></p>
		<textarea bind:value={aiPrompt}></textarea>

		<button on:click={copyPrompt}>Copy Prompt</button>
	</div>
{/if}

{#if selectedJobDetail}
  <div class="modal-backdrop" on:click={() => selectedJobDetail = null}>
    <div class="modal-content" on:click|stopPropagation>
      <h3>
        <a href={selectedJobDetail.webpage_url} target="_blank">
          {selectedJobDetail.headline}
        </a>
      </h3>
      <p><strong>Employer:</strong> {selectedJobDetail.employer_name}</p>
      <p><strong>Municipality:</strong> {selectedJobDetail.municipality}</p>
      <p><strong>Deadline:</strong> {selectedJobDetail.application_deadline_simple}</p>

      <p><strong>Description:</strong></p>
      <textarea readonly>{selectedJobDetail.description}</textarea>

      <p><strong>AI Prompt:</strong></p>
      <textarea bind:value={aiPrompt}></textarea>

      <button on:click={copyPrompt}>Copy Prompt</button>
      <button on:click={() => selectedJobDetail = null}>Close</button>
    </div>
  </div>
{/if}
<SettingsModal
  open={showSettings}
  filters={filters}
  deleteFilter={deleteFilter}
  on:close={closeSettings}
  on:fetch={fetchNewJobs}
/>

<JobDetailModal
  open={selectedJobDetail !== null}
  job={selectedJobDetail}
  aiPrompt={aiPrompt}
  on:close={() => selectedJobDetail = null}
  onCopy={copyPrompt}
/>