<script lang="ts">
  import { onMount } from 'svelte';
  import type { LocationSelection } from '$lib/types/location.js';

  type Keyword = {
    id: string;
    keyword: string;
    type?: string | null;
  };

  type Subscription = {
    id: string;
    title: string;
    locationId: string;
    locationType: 'region' | 'municipality';
    locationLabel: string;
    createdAt: string | Date;
  };

  const storedLocationKey = 'jobbsok:selected-subscription-locations';
  const storedTitleKey = 'jobbsok:selected-subscription-titles';

  let locationOptions = $state<LocationSelection[]>([]);
  let titleOptions = $state<string[]>([]);
  let subscriptions = $state<Subscription[]>([]);
  let selectedLocationId = $state('');
  let selectedLocationType = $state<'region' | 'municipality' | ''>('');
  let selectedTitles = $state<string[]>([]);
  let loading = $state(true);
  let statusMessage = $state('');
  let errorMessage = $state('');

  onMount(async () => {
    await Promise.all([
      loadOptions(),
      loadSubscriptions()
    ]);

    loading = false;
  });

  $effect(() => {
    if (!selectedLocationId) {
      return;
    }

    const selectedLocation = locationOptions.find((location) => location.id === selectedLocationId);
    selectedLocationType = selectedLocation?.type ?? '';
  });

  async function loadOptions() {
    errorMessage = '';

    const [locationsResponse, keywordsResponse] = await Promise.all([
      fetch('/api/user/locations'),
      fetch('/api/user/keywords')
    ]);

    if (locationsResponse.status === 401 || keywordsResponse.status === 401) {
      errorMessage = 'You must be signed in to manage subscriptions.';
      return;
    }

    const apiLocations = locationsResponse.ok
      ? await locationsResponse.json() as LocationSelection[]
      : [];
    const apiKeywords = keywordsResponse.ok
      ? await keywordsResponse.json() as Keyword[]
      : [];

    const storedLocations = readStoredLocations();
    const storedTitles = readStoredTitles();

    locationOptions = (storedLocations.length > 0 ? storedLocations : apiLocations)
      .sort((left, right) => left.label.localeCompare(right.label));
    titleOptions = (storedTitles.length > 0 ? storedTitles : apiKeywords
      .filter((keyword) => keyword.type === 'include')
      .map((keyword) => keyword.keyword.trim())
      .filter(Boolean))
      .sort((left, right) => left.localeCompare(right));

    if (!selectedLocationId && locationOptions.length > 0) {
      selectedLocationId = locationOptions[0].id;
      selectedLocationType = locationOptions[0].type;
    }
  }

  function readStoredLocations() {
    if (typeof localStorage === 'undefined') return [];

    try {
      const value = localStorage.getItem(storedLocationKey);
      if (!value) return [];

      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter(
            (item): item is LocationSelection =>
              item &&
              typeof item === 'object' &&
              typeof item.id === 'string' &&
              typeof item.label === 'string' &&
              (item.type === 'region' || item.type === 'municipality')
          )
        : [];
    } catch {
      return [];
    }
  }

  function readStoredTitles() {
    if (typeof localStorage === 'undefined') return [];

    try {
      const value = localStorage.getItem(storedTitleKey);
      if (!value) return [];

      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [];
    } catch {
      return [];
    }
  }

  async function loadSubscriptions() {
    errorMessage = '';

    const response = await fetch('/api/user/subscriptions');

    if (!response.ok) {
      if (response.status === 401) {
        errorMessage = 'You must be signed in to manage subscriptions.';
        return;
      }

      errorMessage = 'Failed to load subscriptions.';
      return;
    }

    subscriptions = await response.json();
  }

  function toggleTitle(title: string) {
    if (selectedTitles.includes(title)) {
      selectedTitles = selectedTitles.filter((selectedTitle) => selectedTitle !== title);
      return;
    }

    selectedTitles = [...selectedTitles, title].sort((left, right) => left.localeCompare(right));
  }

  async function saveSubscriptions() {
    statusMessage = '';
    errorMessage = '';

    if (!selectedLocationId || !selectedLocationType || selectedTitles.length === 0) {
      errorMessage = 'Choose one location and at least one title first.';
      return;
    }

    const responses = await Promise.all(
      selectedTitles.map((title) =>
        fetch('/api/user/subscriptions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title,
            locationId: selectedLocationId,
            locationType: selectedLocationType
          })
        })
      )
    );

    if (responses.some((response) => !response.ok)) {
      errorMessage = responses.some((response) => response.status === 401)
        ? 'You must be signed in to save subscriptions.'
        : 'Failed to save one or more subscriptions.';
      return;
    }

    selectedTitles = [];
    statusMessage = 'Subscriptions updated.';
    await loadSubscriptions();
  }

  async function removeSubscription(id: string) {
    statusMessage = '';
    errorMessage = '';

    const response = await fetch('/api/user/subscriptions', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) {
      errorMessage = response.status === 401
        ? 'You must be signed in to remove subscriptions.'
        : 'Failed to remove subscription.';
      return;
    }

    subscriptions = subscriptions.filter((subscription) => subscription.id !== id);
    statusMessage = 'Subscription removed.';
  }

  const groupedSubscriptions = $derived.by(() => {
    const next = new Map<string, { key: string; label: string; type: string; items: Subscription[] }>();

    for (const subscription of subscriptions) {
      const key = `${subscription.locationType}:${subscription.locationId}`;
      const existing = next.get(key);

      if (existing) {
        existing.items.push(subscription);
      } else {
        next.set(key, {
          key,
          label: subscription.locationLabel,
          type: subscription.locationType,
          items: [subscription]
        });
      }
    }

    return [...next.values()].sort((left, right) => left.label.localeCompare(right.label));
  });
</script>

<section class="subscriptions-page">
  <div class="page-intro">
    <p class="eyebrow">Prenumerationer</p>
    <h2>Koppla platser till jobbtitlar</h2>
    <p class="page-copy">Alternativen nedan kommer från det du redan valt i huvudsokningen. Välj en plats och de titlar du vill prenumerera på.</p>
  </div>

  {#if errorMessage}
    <p class="error-message">{errorMessage}</p>
  {/if}

  {#if statusMessage}
    <p class="status-message">{statusMessage}</p>
  {/if}

  <section class="tool-panel">
    <div class="section-heading">
      <h3>Skapa prenumeration</h3>
      <p>En plats kan kopplas till flera titlar.</p>
    </div>

    {#if loading}
      <p class="empty-state">Laddar alternativ...</p>
    {:else if locationOptions.length === 0 || titleOptions.length === 0}
      <p class="empty-state">Gå till huvudsidan och välj platser och jobbtitlar först.</p>
    {:else}
      <label class="field">
        <span>Plats</span>
        <select bind:value={selectedLocationId}>
          {#each locationOptions as location}
            <option value={location.id}>
              {location.label} ({location.type})
            </option>
          {/each}
        </select>
      </label>

      <div class="title-picker">
        {#each titleOptions as title}
          <button
            type="button"
            class="title-chip {selectedTitles.includes(title) ? 'active' : ''}"
            onclick={() => toggleTitle(title)}
            aria-pressed={selectedTitles.includes(title)}
          >
            {title}
          </button>
        {/each}
      </div>

      <button type="button" class="primary-button" onclick={saveSubscriptions}>
        Spara prenumerationer
      </button>
    {/if}
  </section>

  <section class="tool-panel">
    <div class="section-heading">
      <h3>Nuvarande prenumerationer</h3>
    </div>

    {#if groupedSubscriptions.length === 0}
      <p class="empty-state">Du har inga sparade prenumerationer ännu.</p>
    {:else}
      <div class="subscription-groups">
        {#each groupedSubscriptions as group (group.key)}
          <section class="subscription-group">
            <h4>{group.label}</h4>
            <p class="group-type">{group.type === 'region' ? 'Region' : 'Kommun'}</p>

            <div class="subscription-list">
              {#each group.items as subscription (subscription.id)}
                <div class="subscription-item">
                  <span>{subscription.title}</span>
                  <button type="button" class="secondary-button" onclick={() => removeSubscription(subscription.id)}>
                    Ta bort
                  </button>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  </section>
</section>

<style>
  .subscriptions-page,
  .tool-panel,
  .page-intro,
  .section-heading,
  .field {
    display: grid;
    gap: 0.85rem;
  }

  .subscriptions-page {
    gap: 1rem;
    padding: 1.25rem;
    border-radius: var(--radius-container);
    background: var(--color-surface-800);
    border: 1px solid var(--color-surface-600);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
  }

  .page-intro h2,
  .page-intro p,
  .section-heading h3,
  .section-heading p,
  .field span {
    margin: 0;
  }

  .tool-panel {
    padding: 1rem;
    border-radius: calc(var(--radius-container) * 0.9);
    background: var(--color-surface-700);
    border: 1px solid var(--color-surface-600);
  }

  .eyebrow {
    color: var(--color-warning-400);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .page-copy,
  .section-heading p,
  .group-type,
  .empty-state {
    color: var(--color-primary-400);
  }

  .error-message {
    margin: 0;
    color: var(--color-error-400);
  }

  .status-message {
    margin: 0;
    color: var(--color-secondary-300);
  }

  select {
    min-width: 0;
    padding: 0.75rem 0.9rem;
    border-radius: 0.85rem;
    border: 1px solid var(--color-surface-600);
    background: var(--color-surface-900);
    color: var(--base-font-color);
    font: inherit;
  }

  .title-picker,
  .subscription-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .title-chip,
  .primary-button,
  .secondary-button {
    padding: 0.7rem 1rem;
    border-radius: 999px;
    font: inherit;
    cursor: pointer;
  }

  .title-chip {
    border: 1px solid var(--color-surface-500);
    background: var(--color-surface-600);
    color: var(--base-font-color);
  }

  .title-chip.active,
  .primary-button {
    border-color: transparent;
    background: var(--color-secondary-500);
    color: var(--color-secondary-contrast-500);
  }

  .secondary-button {
    border: 1px solid var(--color-surface-500);
    background: transparent;
    color: var(--color-primary-300);
  }

  .subscription-groups {
    display: grid;
    gap: 1rem;
  }

  .subscription-group {
    padding: 1rem;
    border-radius: 1rem;
    border: 1px solid var(--color-surface-600);
    background: var(--color-surface-800);
  }

  .subscription-group h4,
  .group-type {
    margin: 0 0 0.4rem;
  }

  .subscription-item {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.35rem 0;
  }
</style>
