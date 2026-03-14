<script lang="ts">
  interface Props {
    open?: boolean;
    availableTitles?: string[];
    selectedTitles?: string[];
    keywordError?: string;
    onSave?: (titles: string[]) => Promise<void> | void;
    onClose?: () => void;
    onAddKeyword?: (keyword: string, type: "include" | "exclude") => Promise<string | null> | string | null;
  }

  let {
    open = false,
    availableTitles = [],
    selectedTitles = [],
    keywordError = "",
    onSave = () => {},
    onClose = () => {},
    onAddKeyword = async () => null
  }: Props = $props();

  let tempSelectedTitles = $state<string[]>([]);
  let titleSearch = $state("");
  let newKeyword = $state("");
  let newType = $state<"include" | "exclude">("include");
  let saving = $state(false);
  let normalizedTitleSearch = $derived.by(() => titleSearch.trim().toLowerCase());

  $effect(() => {
    if (open) {
      tempSelectedTitles = [...selectedTitles];
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

  const selectedTitleSet = $derived.by(() => new Set(tempSelectedTitles));
  const allTitles = $derived.by(() => [...new Set([...tempSelectedTitles, ...availableTitles])].sort((a, b) => a.localeCompare(b)));
  const filteredTitles = $derived.by(() =>
    allTitles.filter((title) => title.toLowerCase().includes(normalizedTitleSearch))
  );

  function close() {
    onClose();
  }

  async function save() {
    saving = true;
    await onSave(tempSelectedTitles);
    saving = false;
  }

  function toggleTitle(title: string) {
    if (tempSelectedTitles.includes(title)) {
      tempSelectedTitles = tempSelectedTitles.filter((selectedTitle) => selectedTitle !== title);
      return;
    }

    tempSelectedTitles = [...tempSelectedTitles, title];
  }

  function toggleAllTitles() {
    if (tempSelectedTitles.length === availableTitles.length) {
      tempSelectedTitles = [];
      return;
    }

    tempSelectedTitles = [...availableTitles];
  }

  async function addKeyword() {
    const keyword = newKeyword.trim();
    if (!keyword) {
      return;
    }

    const inserted = await onAddKeyword(keyword, newType);
    if (inserted && !tempSelectedTitles.includes(inserted) && newType === "include") {
      tempSelectedTitles = [...tempSelectedTitles, inserted];
    }

    if (inserted) {
      newKeyword = "";
      newType = "include";
    }
  }
</script>

{#if open}
  <div
    class="modal-bg"
    role="button"
    tabindex="0"
    aria-label="Close job selection modal"
    onclick={(event) => event.target === event.currentTarget && close()}
    onkeydown={(event) => (event.key === "Enter" || event.key === " ") && close()}
  >
    <div class="modal">
      <button type="button" class="close-btn" aria-label="Close modal" onclick={close}>×</button>

      <div class="modal-intro">
        <p class="eyebrow">Job Selection</p>
        <h2>Choose Job Titles</h2>
        <p class="intro-copy">Pick the title families you want to search, or add a new title for later use.</p>
      </div>

      <div class="toolbar">
        <input bind:value={titleSearch} placeholder="Search saved titles" />
        <button type="button" class="secondary-button" onclick={toggleAllTitles}>
          {tempSelectedTitles.length === availableTitles.length ? "Clear All" : "Select All"}
        </button>
      </div>

      <div class="add-keyword">
        <input bind:value={newKeyword} placeholder="Add a keyword" />
        <select bind:value={newType}>
          <option value="include">Include</option>
          <option value="exclude">Exclude</option>
        </select>
        <button type="button" class="primary-button" onclick={addKeyword}>Save Keyword</button>
      </div>

      {#if keywordError}
        <p class="error-message">{keywordError}</p>
      {/if}

      {#if filteredTitles.length > 0}
        <div class="title-list">
          {#each filteredTitles as title}
            <button
              type="button"
              class="title-row {selectedTitleSet.has(title) ? 'selected' : ''}"
              onclick={() => toggleTitle(title)}
              aria-pressed={selectedTitleSet.has(title)}
            >
              <span>{title}</span>
              <span class="selection-indicator">{selectedTitleSet.has(title) ? "Selected" : "Select"}</span>
            </button>
          {/each}
        </div>
      {:else}
        <p class="empty-state">No saved titles match your search yet.</p>
      {/if}

      <div class="footerbuttons">
        <button type="button" class="primary-button" onclick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button type="button" class="secondary-button" onclick={close}>Cancel</button>
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
  max-width: 760px;
  width: min(92vw, 760px);
  max-height: 82vh;
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
.toolbar,
.add-keyword {
  display: grid;
  gap: 0.75rem;
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

.intro-copy {
  color: var(--color-primary-400);
}

.toolbar,
.add-keyword {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  margin-bottom: 0.9rem;
}

.add-keyword {
  grid-template-columns: minmax(0, 1fr) auto auto;
}

input,
select {
  min-width: 0;
  padding: 0.75rem 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid var(--color-surface-600);
  background: var(--color-surface-900);
  color: var(--base-font-color);
  font: inherit;
}

.title-list {
  display: grid;
  gap: 0.65rem;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  border: 1px solid var(--color-surface-600);
  background: var(--color-surface-700);
  color: var(--base-font-color);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.title-row.selected {
  background: color-mix(in srgb, var(--color-secondary-500) 28%, var(--color-surface-700));
  border-color: var(--color-secondary-500);
}

.selection-indicator {
  color: var(--color-primary-400);
  font-size: 0.9rem;
}

.title-row.selected .selection-indicator {
  color: var(--color-secondary-200);
}

.primary-button,
.secondary-button {
  padding: 0.7rem 1rem;
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

.footerbuttons {
  position: sticky;
  bottom: -1.25rem;
  margin-top: 1rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  padding: 1rem 0 0.25rem;
  background: linear-gradient(180deg, rgba(60, 56, 54, 0) 0%, var(--color-surface-800) 35%);
  border-top: 1px solid var(--color-surface-600);
}

.error-message,
.empty-state {
  margin: 0.5rem 0 0;
}

.error-message {
  color: var(--color-error-400);
}

.empty-state {
  color: var(--color-primary-400);
}

@media (hover: hover) and (pointer: fine) {
  .title-row,
  .primary-button,
  .secondary-button,
  .close-btn {
    transition: background 0.14s ease 100ms, color 0.14s ease 100ms, border-color 0.14s ease 100ms, filter 0.14s ease 100ms;
  }

  .title-row:hover {
    background: var(--color-surface-600);
  }

  .title-row.selected:hover {
    background: color-mix(in srgb, var(--color-secondary-500) 38%, var(--color-surface-700));
  }

  .primary-button:hover,
  .secondary-button:hover,
  .close-btn:hover {
    filter: brightness(1.06);
  }
}

@media (max-width: 640px) {
  .toolbar,
  .add-keyword {
    grid-template-columns: 1fr;
  }
}
</style>
