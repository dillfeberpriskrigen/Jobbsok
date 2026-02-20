<script>
  import { createEventDispatcher } from "svelte";

  export let open = false;
  export let filters = [];
  export let deleteFilter;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch("close");
  }
</script>

{#if open}
  <div class="modal-backdrop" on:click={close}>
    <div class="modal" on:click|stopPropagation>
      <h2>Settings</h2>
<button
  type="button"
  class="btn preset-filled-primary-500"
  on:click={() => dispatch("fetch")}
>
  Fetch Latest Jobs
</button>
      <h3>Headline Filters</h3>

      {#if filters.length === 0}
        <p>No filters added.</p>
      {/if}

      <ul class="filter-list">
        {#each filters as f}
          <li>
            <span>{f.value}</span>
            <button class="delete-btn" on:click={() => deleteFilter(f.id)}>
              Delete
            </button>
          </li>
        {/each}
      </ul>

      <button on:click={close}>Close</button>
    </div>
  </div>
{/if}

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: black;
  padding: 20px;
  width: 400px;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}

.filter-list {
  list-style: none;
  padding: 0;
}

.filter-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.delete-btn {
  background: #c62828;
  color: white;
  border: none;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
}

.delete-btn:hover {
  background: #a31515;
}
</style>
