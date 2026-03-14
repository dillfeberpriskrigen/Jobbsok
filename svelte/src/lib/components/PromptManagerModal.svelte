<script lang="ts">
  import { promptKinds, type PromptKind, type UserPrompt } from "$lib/types/prompt.js";

  interface Props {
    open?: boolean;
    onClose?: () => void;
  }

  const blankPrompt = {
    id: "",
    label: "",
    kind: "interview_general",
    content: ""
  } satisfies Pick<UserPrompt, "id" | "label" | "kind" | "content">;

  let { open = false, onClose = () => {} }: Props = $props();

  let prompts = $state<UserPrompt[]>([]);
  let selectedPromptId = $state("__new__");
  let formState = $state({ ...blankPrompt });
  let loading = $state(false);
  let saving = $state(false);
  let errorMessage = $state("");
  let successMessage = $state("");

  $effect(() => {
    if (open) {
      void loadPrompts();
    }
  });

  $effect(() => {
    if (!open) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  });

  function resetForm() {
    formState = { ...blankPrompt };
    selectedPromptId = "__new__";
  }

  async function loadPrompts() {
    loading = true;
    errorMessage = "";
    successMessage = "";

    const response = await fetch("/api/user/prompts");
    loading = false;

    if (!response.ok) {
      errorMessage = response.status === 401
        ? "You must be signed in to manage prompts."
        : "Failed to load prompts.";
      return;
    }

    prompts = await response.json();

    if (prompts.length === 0) {
      resetForm();
      return;
    }

    if (selectedPromptId === "__new__") {
      loadPromptIntoForm(prompts[0].id);
    } else {
      loadPromptIntoForm(selectedPromptId);
    }
  }

  function loadPromptIntoForm(id: string) {
    if (id === "__new__") {
      resetForm();
      return;
    }

    const prompt = prompts.find((candidate) => candidate.id === id);
    if (!prompt) {
      resetForm();
      return;
    }

    selectedPromptId = id;
    formState = {
      id: prompt.id,
      label: prompt.label,
      kind: prompt.kind,
      content: prompt.content
    };
  }

  function close() {
    onClose();
  }

  async function savePrompt() {
    errorMessage = "";
    successMessage = "";

    if (!formState.label.trim()) {
      errorMessage = "Prompt name is required.";
      return;
    }

    if (!formState.content.trim()) {
      errorMessage = "Prompt content is required.";
      return;
    }

    saving = true;

    const response = await fetch("/api/user/prompts", {
      method: formState.id ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: formState.id || undefined,
        label: formState.label,
        kind: formState.kind,
        content: formState.content
      })
    });

    saving = false;

    if (!response.ok) {
      errorMessage = response.status === 401
        ? "You must be signed in to save prompts."
        : "Failed to save prompt.";
      return;
    }

    const savedPrompt = await response.json() as UserPrompt;
    successMessage = "Prompt saved.";
    await loadPrompts();
    loadPromptIntoForm(savedPrompt.id);
  }

  async function deletePrompt() {
    if (!formState.id) {
      resetForm();
      return;
    }

    errorMessage = "";
    successMessage = "";
    saving = true;

    const response = await fetch("/api/user/prompts", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ id: formState.id })
    });

    saving = false;

    if (!response.ok) {
      errorMessage = response.status === 401
        ? "You must be signed in to delete prompts."
        : "Failed to delete prompt.";
      return;
    }

    successMessage = "Prompt deleted.";
    await loadPrompts();
    if (prompts.length === 0) {
      resetForm();
    }
  }
</script>

{#if open}
  <div
    class="modal-bg"
    role="button"
    tabindex="0"
    aria-label="Close prompt manager"
    onclick={(event) => event.target === event.currentTarget && close()}
    onkeydown={(event) => (event.key === "Enter" || event.key === " ") && close()}
  >
    <div class="modal">
      <button type="button" class="close-btn" aria-label="Close prompt manager" onclick={close}>×</button>

      <div class="modal-intro">
        <p class="eyebrow">Prompt Library</p>
        <h2>Interview Prompt Manager</h2>
        <p class="intro-copy">Save multiple prompt templates and edit them by prompt type whenever you need them.</p>
      </div>

      <div class="field-group">
        <label for="prompt-select">Saved prompts</label>
        <div class="select-row">
          <select
            id="prompt-select"
            bind:value={selectedPromptId}
            onchange={(event) => loadPromptIntoForm((event.currentTarget as HTMLSelectElement).value)}
          >
            <option value="__new__">Create new prompt</option>
            {#each prompts as prompt}
              <option value={prompt.id}>{prompt.label}</option>
            {/each}
          </select>
          <button type="button" class="secondary-button" onclick={resetForm}>New Prompt</button>
        </div>
      </div>

      <div class="form-grid">
        <div class="field-group">
          <label for="prompt-label">Prompt name</label>
          <input id="prompt-label" bind:value={formState.label} placeholder="Behavioral interview baseline" />
        </div>

        <div class="field-group">
          <label for="prompt-kind">Prompt type</label>
          <select id="prompt-kind" bind:value={formState.kind}>
            {#each promptKinds as kind}
              <option value={kind.value}>{kind.label}</option>
            {/each}
          </select>
        </div>
      </div>

      <div class="field-group">
        <label for="prompt-content">Prompt content</label>
        <textarea
          id="prompt-content"
          bind:value={formState.content}
          placeholder="Paste the prompt template you want available during interview prep."
        ></textarea>
      </div>

      {#if loading}
        <p class="status-message">Loading prompts…</p>
      {/if}
      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
      {#if successMessage}
        <p class="success-message">{successMessage}</p>
      {/if}

      <div class="footerbuttons">
        <button type="button" class="primary-button" onclick={savePrompt} disabled={saving}>
          {formState.id ? "Save Changes" : "Create Prompt"}
        </button>
        <button type="button" class="secondary-button" onclick={deletePrompt} disabled={saving}>
          Delete
        </button>
        <button type="button" class="secondary-button" onclick={close}>Close</button>
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
  max-width: 820px;
  width: min(94vw, 820px);
  max-height: 86vh;
  overflow-y: auto;
  border-radius: var(--radius-container);
  padding: 1.25rem;
  position: relative;
  background: var(--color-surface-800);
  border: 1px solid var(--color-surface-600);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
  color: var(--base-font-color);
}

.close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  cursor: pointer;
  font-size: 1.2em;
  border: 0;
  background: transparent;
  color: var(--color-primary-300);
}

.modal-intro,
.field-group {
  display: grid;
  gap: 0.5rem;
}

.modal-intro {
  margin-bottom: 1rem;
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
}

.intro-copy,
.status-message {
  color: var(--color-primary-400);
}

.select-row,
.footerbuttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.form-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 1rem;
  margin: 1rem 0;
}

label {
  color: var(--color-primary-300);
  font-size: 0.95rem;
}

input,
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
  min-height: 240px;
  resize: vertical;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.footerbuttons {
  position: sticky;
  bottom: -1.25rem;
  margin-top: 1rem;
  justify-content: flex-end;
  padding: 1rem 0 0.25rem;
  background: linear-gradient(180deg, rgba(60, 56, 54, 0) 0%, var(--color-surface-800) 35%);
  border-top: 1px solid var(--color-surface-600);
}

.error-message,
.success-message,
.status-message {
  margin: 0.75rem 0 0;
}

.error-message {
  color: var(--color-error-400);
}

.success-message {
  color: var(--color-success-400);
}

@media (hover: hover) and (pointer: fine) {
  .primary-button,
  .secondary-button,
  .close-btn {
    transition: filter 0.14s ease 100ms, background 0.14s ease 100ms, border-color 0.14s ease 100ms;
  }

  .primary-button:hover,
  .secondary-button:hover,
  .close-btn:hover {
    filter: brightness(1.05);
  }
}

@media (max-width: 700px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
