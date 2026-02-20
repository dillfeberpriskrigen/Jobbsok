<script>
  import { createEventDispatcher } from "svelte";

  export let open = false;
  export let job = null;
  export let aiPrompt = "";
  export let onCopy; // function to copy AI prompt

  const dispatch = createEventDispatcher();

  function close() {
    dispatch("close");
  }
</script>

{#if open && job}

  <div class="modal-backdrop" on:click={close}>
    <div class="modal" on:click|stopPropagation>
      <div class="exit-button">

            <button 
            class="btn preset-filled-primary-500"
            on:click={close}>&#10006;</button>
      </div>
      <h3><a href={job.webpage_url} target="_blank">{job.headline}</a></h3>
      <p><strong>Arbetsgivare:</strong> {job.employer_name}</p>
      <p><strong>Kommun:</strong> {job.municipality}</p>
      <p><strong>Ansöknings deadline:</strong> {job.application_deadline_simple}</p>

      <p><strong>Arbetsbeskrivning:</strong></p>
      <textarea readonly>{job.description}</textarea>

      <p><strong>AI Prompt:</strong></p>
      <textarea bind:value={aiPrompt}></textarea>

      <button on:click={onCopy}>Copy Prompt</button>
    </div>
  </div>
{/if}

<style>
.exit-button{display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}
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
  background: rgb(0, 0, 0);
  padding: 20px;
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.3);
}
textarea {
  width: 100%;
  height: 120px;
  margin-top: 5px;
}
button {
  margin-top: 10px;
}
</style>