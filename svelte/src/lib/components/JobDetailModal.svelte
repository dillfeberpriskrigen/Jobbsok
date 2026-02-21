<script>
  export let job = null;
  export let aiPrompt = "";
  export let onclose;
  export let oncopy;
</script>

<div class="modal-backdrop" on:click={onclose}>
  <div class="modal-content" on:click|stopPropagation>
    {#if job}
      <h3>
        <a href={job.webpage_url} target="_blank" rel="noopener noreferrer">
          {job.headline}
        </a>
      </h3>
      <p><strong>Employer:</strong> {job.employer_name}</p>
      <p><strong>Municipality:</strong> {job.municipality}</p>
      <p><strong>Deadline:</strong> {job.application_deadline_simple}</p>

      <p><strong>Description:</strong></p>
      <textarea readonly>{job.description}</textarea>

      <p><strong>AI Prompt:</strong></p>
      <textarea bind:value={aiPrompt}></textarea>

      <button on:click={oncopy}>Copy Prompt</button>
      <button on:click={onclose}>Close</button>
    {:else}
      <p>Loading...</p>
    {/if}
  </div>
</div>

<style>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: black;
  padding: 20px;
  border-radius: 8px;
  width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}
textarea {
  width: 100%;
  height: 120px;
  margin-top: 5px;
}
</style>