<script lang="ts">
  import { onMount } from 'svelte';
  import JobDetailModal from '$lib/components/JobDetailModal.svelte';
  import type { Job } from '$lib/server/db/jobTypes.js';
  import type { UserPrompt } from '$lib/types/prompt.js';

  type SearchJob = Job & {
    application_deadline_simple?: string;
  };

  let jobs = $state<SearchJob[]>([]);
  let prompts = $state<UserPrompt[]>([]);
  let selectedJob = $state<SearchJob | null>(null);
  let errorMessage = $state('');

  onMount(async () => {
    await Promise.all([
      loadJobs(),
      loadPrompts()
    ]);
  });

  async function loadJobs() {
    errorMessage = '';

    const savedResponse = await fetch('/api/user/savedJobs');
    if (!savedResponse.ok) {
      errorMessage = savedResponse.status === 401
        ? 'You must be signed in to view saved jobs.'
        : 'Failed to load saved jobs.';
      return;
    }

    const savedRows = await savedResponse.json() as Array<{ jobId: string }>;
    const jobIds = savedRows.map((row) => row.jobId).filter(Boolean);

    if (jobIds.length === 0) {
      jobs = [];
      return;
    }

    const jobsResponse = await fetch('/api/jobs/JobById', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobIds })
    });

    if (!jobsResponse.ok) {
      errorMessage = 'Failed to load saved job details.';
      return;
    }

    const rows = await jobsResponse.json() as SearchJob[];
    jobs = rows.map((job) => ({
      ...job,
      application_deadline_simple: job.application_deadline_simple || ''
    }));
  }

  async function loadPrompts() {
    const response = await fetch('/api/user/prompts');

    if (!response.ok) {
      prompts = [];
      return;
    }

    prompts = await response.json();
  }

  async function removeSavedJob(jobId: string) {
    errorMessage = '';

    const response = await fetch('/api/user/savedJobs', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ jobId })
    });

    if (!response.ok) {
      errorMessage = response.status === 401
        ? 'You must be signed in to remove saved jobs.'
        : 'Failed to remove saved job.';
      return;
    }

    jobs = jobs.filter((job) => job.id !== jobId);
    if (selectedJob?.id === jobId) {
      selectedJob = null;
    }
  }

  function copyPrompt(payload: string) {
    navigator.clipboard.writeText(payload);
  }
</script>

<section class="saved-jobs-page">
  <div class="page-intro">
    <p class="eyebrow">Sparade jobb</p>
    <h2>Dina jobb att komma tillbaka till</h2>
    <p class="page-copy">Jobb du sparar från huvudsidan samlas här.</p>
  </div>

  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}

  {#if jobs.length === 0}
    <section class="tool-panel">
      <p class="empty-state">Du har inga sparade jobb ännu.</p>
    </section>
  {:else}
    <section class="tool-panel">
      <div class="table-shell">
        <table>
          <thead>
            <tr>
              <th>Jobb</th>
              <th>Arbetsgivare</th>
              <th>Kommun</th>
              <th>Deadline</th>
              <th>Visa</th>
              <th>Ta bort</th>
            </tr>
          </thead>
          <tbody>
            {#each jobs as job}
              <tr>
                <td>{job.headline}</td>
                <td>{job.employer_name}</td>
                <td>{job.municipality}</td>
                <td>{job.application_deadline_simple ?? job.application_deadline ?? ''}</td>
                <td>
                  <button type="button" class="primary-button" onclick={() => selectedJob = job}>Visa</button>
                </td>
                <td>
                  <button type="button" class="secondary-button" onclick={() => removeSavedJob(job.id)}>Ta bort</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/if}
</section>

{#if selectedJob}
  <JobDetailModal
    job={selectedJob}
    prompts={prompts}
    onclose={() => selectedJob = null}
    oncopy={copyPrompt}
  />
{/if}

<style>
  .saved-jobs-page,
  .tool-panel,
  .page-intro {
    display: grid;
    gap: 1rem;
  }

  .saved-jobs-page {
    padding: 1.25rem;
    border-radius: var(--radius-container);
    background: var(--color-surface-800);
    border: 1px solid var(--color-surface-600);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
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

  .page-copy,
  .empty-state {
    color: var(--color-primary-400);
  }

  .error-message {
    margin: 0;
    color: var(--color-error-400);
  }

  .tool-panel {
    padding: 1rem;
    border-radius: calc(var(--radius-container) * 0.9);
    background: var(--color-surface-700);
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

  .primary-button,
  .secondary-button {
    padding: 0.7rem 1rem;
    border-radius: 999px;
    font: inherit;
    cursor: pointer;
  }

  .primary-button {
    border: 1px solid var(--color-secondary-500);
    background: var(--color-secondary-500);
    color: var(--color-secondary-contrast-500);
  }

  .secondary-button {
    border: 1px solid var(--color-surface-500);
    background: transparent;
    color: var(--color-primary-300);
  }
</style>
