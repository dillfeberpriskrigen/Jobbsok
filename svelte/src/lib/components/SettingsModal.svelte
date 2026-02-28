<script>
  import { createEventDispatcher } from "svelte";

  export let open = false;

  const dispatch = createEventDispatcher();

  function close() {
    dispatch("close");
  }
</script>
{#if open}
  <div class="modal-backdrop"
  role="button"
  tabindex="0"
   on:click={close}
   on:keydown={(e) => e.key === "Enter" && close()}>
    <div class="modal" 
    role="dialog"
    tabindex="0"
   on:keydown={(e) => e.key === "Enter" && close()}>
    on:click|stopPropagation>
      <h2>Settings</h2>
<button
  type="button"
  class="btn preset-filled-primary-500"
  on:click={() => dispatch("fetch")}
>
  Fetch Latest Jobs
</button>
      <h3>Headline Filters</h3>



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
</style>
