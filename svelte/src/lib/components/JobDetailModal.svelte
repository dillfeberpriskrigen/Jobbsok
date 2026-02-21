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

  <div class="modal-backdrop" onclick={() => (selectedJobDetail = null)}>
    <div
      class="modal-content"
      onclick={(e) => e.stopPropagation()}
    >
      <h3>
        <a
          href={selectedJobDetail.webpage_url}
          target="_blank"
          rel="noopener noreferrer"
        >
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

      <button type="button" onclick={copyPrompt}>
        Copy Prompt
      </button>

      <button type="button" onclick={() => (selectedJobDetail = null)}>
        Close
      </button>
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