<script lang="ts">
  import type { UserPrompt } from "$lib/types/prompt.js";

  interface Job {
    id: string;
    headline: string | null;
    employer_name: string | null;
    municipality: string | null;
    application_deadline_simple?: string;
    application_deadline?: string | Date | null;
    description: string | null;
    webpage_url?: string | null;
  }

  interface Props {
    job?: Job | null;
    prompts?: UserPrompt[];
    onclose: () => void;
    oncopy: (payload: string) => void;
  }

  let { job = null, prompts = [], onclose, oncopy }: Props = $props();
  let selectedPromptId = $state("");

  $effect(() => {
    if (prompts.length > 0 && !prompts.some((prompt) => prompt.id === selectedPromptId)) {
      selectedPromptId = prompts[0].id;
    }

    if (prompts.length === 0) {
      selectedPromptId = "";
    }
  });

  const selectedPrompt = $derived(
    prompts.find((prompt) => prompt.id === selectedPromptId) ?? null
  );

  function close() {
    onclose();
  }

  function copyPromptAndDescription() {
    if (!job) {
      return;
    }

    const promptContent = selectedPrompt?.content?.trim() ?? "";
    const composed = [
      promptContent,
      `Job title: ${job.headline}`,
      `Employer: ${job.employer_name}`,
      `Municipality: ${job.municipality}`,
      `Job description:`,
      job.description?.trim() ?? ""
    ]
      .filter(Boolean)
      .join("\n\n");

    oncopy(composed);
  }
</script>

<div
  class="modal-backdrop"
  role="button"
  tabindex="0"
  aria-label="Close job detail modal"
  onclick={(event) => event.target === event.currentTarget && close()}
  onkeydown={(event) => (event.key === "Enter" || event.key === " ") && close()}
>
  <div
    class="modal-content"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    onclick={(event) => event.stopPropagation()}
    onkeydown={(event) => event.stopPropagation()}
  >
    <button type="button" class="close-btn" aria-label="Close" onclick={close}>×</button>

    {#if job}
      <h2 class="title">Job details</h2>
      <div class="header">
        <h3>
          <a href={job.webpage_url ?? "#"} target="_blank" rel="noopener noreferrer">
            {job.headline}
          </a>
        </h3>
        <p><strong>Employer:</strong> {job.employer_name}</p>
        <p><strong>Municipality:</strong> {job.municipality}</p>
        <p><strong>Deadline:</strong> {job.application_deadline_simple ?? job.application_deadline ?? ""}</p>
      </div>

      <div class="field-group">
        <label for="prompt-select">Saved prompt</label>
        <select id="prompt-select" bind:value={selectedPromptId}>
          {#if prompts.length === 0}
            <option value="">No saved prompts</option>
          {:else}
            {#each prompts as prompt}
              <option value={prompt.id}>{prompt.label}</option>
            {/each}
          {/if}
        </select>
      </div>

      <div class="field-group">
        <label for="prompt-preview">Prompt preview</label>
        <textarea id="prompt-preview" readonly>{selectedPrompt?.content ?? "No saved prompt selected."}</textarea>
      </div>

      <div class="field-group">
        <label for="job-description">Job description</label>
        <textarea id="job-description" readonly>{job.description ?? ""}</textarea>
      </div>

      <div class="actions">
        <button type="button" class="primary-button" onclick={copyPromptAndDescription}>
          Copy Prompt + Description
        </button>
        <button type="button" class="secondary-button" onclick={close}>Close</button>
      </div>
    {:else}
      <p>Loading...</p>
    {/if}
  </div>
</div>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 1000;
}

.modal-content {
  position: relative;
  display: grid;
  gap: 0.9rem;
  width: min(92vw, 760px);
  max-height: 84vh;
  overflow-y: auto;
  padding: 1.25rem;
  border-radius: var(--radius-container);
  background: var(--color-surface-800);
  border: 1px solid var(--color-surface-600);
  color: var(--base-font-color, #ebdbb2);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
}

.title {
  margin: 0;
  color: var(--color-primary-300);
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 12px;
  border: 0;
  background: transparent;
  color: var(--color-primary-300);
  font-size: 1.2rem;
  cursor: pointer;
}

.header,
.field-group {
  display: grid;
  gap: 0.45rem;
}

.header h3,
.header p {
  margin: 0;
}

.header {
  margin-bottom: 0.25rem;
}

.field-group {
  margin-top: 1rem;
}

label {
  color: var(--color-primary-300);
  font-size: 0.95rem;
}

select,
textarea {
  width: 100%;
  padding: 0.8rem 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid var(--color-surface-600);
  background: var(--color-surface-900);
  color: var(--base-font-color);
  font: inherit;
}

textarea {
  min-height: 160px;
  resize: vertical;
  line-height: 1.45;
}

.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.primary-button,
.secondary-button {
  padding: 0.75rem 1rem;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.primary-button {
  border: 1px solid var(--color-secondary-500);
  background: var(--color-secondary-500);
  color: var(--color-secondary-contrast-500);
}

.secondary-button {
  border: 1px solid var(--color-surface-500);
  background: var(--color-surface-700);
  color: var(--base-font-color);
}
</style>
