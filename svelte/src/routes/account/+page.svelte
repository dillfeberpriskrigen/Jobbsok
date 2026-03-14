<script lang="ts">
	import { enhance } from '$app/forms';
	import PromptManagerModal from '$lib/components/PromptManagerModal.svelte';
	import type { ActionData, PageData } from './$types.js';

	let { form, data }: { form: ActionData; data: PageData } = $props();
	let showPromptManager = $state(false);

	type ProfileDraft = {
		firstName: string;
		lastName: string;
		title: string;
		summary: string;
		practicalSkills: string[];
		interpersonalSkills: string[];
		leadershipSkills: string[];
		certifications: string[];
		languages: string[];
		workStyles: string[];
	};

	type SkillBucket =
		| 'practicalSkills'
		| 'interpersonalSkills'
		| 'leadershipSkills'
		| 'certifications'
		| 'languages'
		| 'workStyles';

	const initialNameParts = data.user?.name?.split(' ') ?? [];
	const initialFirstName = initialNameParts[0] ?? '';
	const initialLastName = initialNameParts.slice(1).join(' ');

	let profileDraft = $state<ProfileDraft>({
		firstName: initialFirstName,
		lastName: initialLastName,
		title: '',
		summary: '',
		practicalSkills: [],
		interpersonalSkills: [],
		leadershipSkills: [],
		certifications: [],
		languages: [],
		workStyles: []
	});

	let practicalInput = $state('');
	let interpersonalInput = $state('');
	let leadershipInput = $state('');
	let certificationInput = $state('');
	let languageInput = $state('');
	let workStyleInput = $state('');

	function addSkill(bucket: SkillBucket, value: string) {
		const normalized = value.trim();

		if (!normalized || profileDraft[bucket].includes(normalized)) {
			return;
		}

		profileDraft = {
			...profileDraft,
			[bucket]: [...profileDraft[bucket], normalized]
		};
	}

	function removeSkill(bucket: SkillBucket, value: string) {
		profileDraft = {
			...profileDraft,
			[bucket]: profileDraft[bucket].filter((item) => item !== value)
		};
	}

	function handleSkillAdd(bucket: SkillBucket) {
		if (bucket === 'practicalSkills') {
			addSkill(bucket, practicalInput);
			practicalInput = '';
			return;
		}

		if (bucket === 'interpersonalSkills') {
			addSkill(bucket, interpersonalInput);
			interpersonalInput = '';
			return;
		}

		if (bucket === 'leadershipSkills') {
			addSkill(bucket, leadershipInput);
			leadershipInput = '';
			return;
		}

		if (bucket === 'certifications') {
			addSkill(bucket, certificationInput);
			certificationInput = '';
			return;
		}

		if (bucket === 'languages') {
			addSkill(bucket, languageInput);
			languageInput = '';
			return;
		}

		if (bucket === 'workStyles') {
			addSkill(bucket, workStyleInput);
			workStyleInput = '';
		}
	}

	const promptProfilePreview = $derived.by(() => {
		const sections = [
			profileDraft.firstName || profileDraft.lastName
				? `Name: ${[profileDraft.firstName, profileDraft.lastName].filter(Boolean).join(' ')}`
				: '',
			profileDraft.title ? `Professional title: ${profileDraft.title}` : '',
			profileDraft.summary ? `Profile summary: ${profileDraft.summary}` : '',
			profileDraft.practicalSkills.length > 0
				? `Practical skills: ${profileDraft.practicalSkills.join(', ')}`
				: '',
			profileDraft.interpersonalSkills.length > 0
				? `Interpersonal skills: ${profileDraft.interpersonalSkills.join(', ')}`
				: '',
			profileDraft.leadershipSkills.length > 0
				? `Leadership skills: ${profileDraft.leadershipSkills.join(', ')}`
				: ''
			,
			profileDraft.certifications.length > 0
				? `Certifications: ${profileDraft.certifications.join(', ')}`
				: '',
			profileDraft.languages.length > 0
				? `Languages: ${profileDraft.languages.join(', ')}`
				: '',
			profileDraft.workStyles.length > 0
				? `Work style: ${profileDraft.workStyles.join(', ')}`
				: ''
		].filter(Boolean);

		return sections.length > 0
			? sections.join('\n\n')
			: 'This profile draft will later be available as structured context for prompts.';
	});
</script>

<section class="auth-page">
	<div class="auth-shell">
		<div class="auth-copy">
			<p class="eyebrow">Account</p>
			<h2>{data.user ? 'You are signed in' : 'Sign in to save your search setup'}</h2>
			<p>
				{data.user
					? 'Your saved locations, keywords, and review list follow your account.'
					: 'Use one account to keep locations, saved jobs, and future search presets in sync.'}
			</p>
		</div>

		{#if data.user}
			<div class="account-card">
				<div class="account-meta">
					<p class="account-name">{data.user.name}</p>
					<p class="account-email">{data.user.email}</p>
				</div>

				<div class="account-actions">
					<a class="primary-link" href="/">Go to Search Workspace</a>
					<button type="button" class="secondary-button" onclick={() => showPromptManager = true}>
						Manage Prompts
					</button>
					<form method="post" action="?/signOut" use:enhance>
						<button type="submit" class="secondary-button">Sign Out</button>
					</form>
				</div>
			</div>

			<section class="profile-shell">
				<div class="section-header">
					<div>
						<p class="eyebrow">Profile Draft</p>
						<h3>Build prompt-ready profile context</h3>
					</div>
					<p class="section-copy">Frontend only for now. This is the shape that can later feed interview and cover-letter prompts.</p>
				</div>

				<div class="profile-grid">
					<div class="profile-card">
						<div class="field-row">
							<label>
								<span>First name</span>
								<input bind:value={profileDraft.firstName} placeholder="Anna" />
							</label>

							<label>
								<span>Last name</span>
								<input bind:value={profileDraft.lastName} placeholder="Andersson" />
							</label>
						</div>

						<label>
							<span>Professional title</span>
							<input bind:value={profileDraft.title} placeholder="Warehouse coordinator, junior chemist, support technician..." />
						</label>

						<label>
							<span>Profile summary</span>
							<textarea
								bind:value={profileDraft.summary}
								rows="5"
								placeholder="Short description of experience, work style, and what you are good at."
							></textarea>
						</label>
					</div>

					<div class="profile-card">
						<div class="skill-section">
							<div class="skill-header">
								<h4>Practical skills</h4>
								<p>Tools, systems, methods, domain knowledge.</p>
							</div>
							<div class="skill-entry">
								<input
									bind:value={practicalInput}
									placeholder="Forklift, Excel, lab routines, scheduling..."
									onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), handleSkillAdd('practicalSkills'))}
								/>
								<button type="button" class="secondary-button compact" onclick={() => handleSkillAdd('practicalSkills')}>Add</button>
							</div>
							<div class="skill-chip-list">
								{#each profileDraft.practicalSkills as skill}
									<button type="button" class="skill-chip" onclick={() => removeSkill('practicalSkills', skill)}>
										{skill} ×
									</button>
								{/each}
							</div>
						</div>

						<div class="skill-section">
							<div class="skill-header">
								<h4>Interpersonal skills</h4>
								<p>Communication, teamwork, empathy, service.</p>
							</div>
							<div class="skill-entry">
								<input
									bind:value={interpersonalInput}
									placeholder="Calm under pressure, client communication..."
									onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), handleSkillAdd('interpersonalSkills'))}
								/>
								<button type="button" class="secondary-button compact" onclick={() => handleSkillAdd('interpersonalSkills')}>Add</button>
							</div>
							<div class="skill-chip-list">
								{#each profileDraft.interpersonalSkills as skill}
									<button type="button" class="skill-chip" onclick={() => removeSkill('interpersonalSkills', skill)}>
										{skill} ×
									</button>
								{/each}
							</div>
						</div>

						<div class="skill-section">
							<div class="skill-header">
								<h4>Leadership skills</h4>
								<p>Useful even for informal leadership and coordination.</p>
							</div>
							<div class="skill-entry">
								<input
									bind:value={leadershipInput}
									placeholder="Onboarding, coaching, planning..."
									onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), handleSkillAdd('leadershipSkills'))}
								/>
								<button type="button" class="secondary-button compact" onclick={() => handleSkillAdd('leadershipSkills')}>Add</button>
							</div>
							<div class="skill-chip-list">
								{#each profileDraft.leadershipSkills as skill}
									<button type="button" class="skill-chip" onclick={() => removeSkill('leadershipSkills', skill)}>
										{skill} ×
									</button>
								{/each}
							</div>
						</div>

						<div class="skill-section">
							<div class="skill-header">
								<h4>Certifications</h4>
								<p>Licenses, courses, qualifications, compliance training.</p>
							</div>
							<div class="skill-entry">
								<input
									bind:value={certificationInput}
									placeholder="Forklift license, HACCP, first aid..."
									onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), handleSkillAdd('certifications'))}
								/>
								<button type="button" class="secondary-button compact" onclick={() => handleSkillAdd('certifications')}>Add</button>
							</div>
							<div class="skill-chip-list">
								{#each profileDraft.certifications as skill}
									<button type="button" class="skill-chip" onclick={() => removeSkill('certifications', skill)}>
										{skill} ×
									</button>
								{/each}
							</div>
						</div>

						<div class="skill-section">
							<div class="skill-header">
								<h4>Languages</h4>
								<p>Languages you can work in or support customers in.</p>
							</div>
							<div class="skill-entry">
								<input
									bind:value={languageInput}
									placeholder="Swedish, English, German..."
									onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), handleSkillAdd('languages'))}
								/>
								<button type="button" class="secondary-button compact" onclick={() => handleSkillAdd('languages')}>Add</button>
							</div>
							<div class="skill-chip-list">
								{#each profileDraft.languages as skill}
									<button type="button" class="skill-chip" onclick={() => removeSkill('languages', skill)}>
										{skill} ×
									</button>
								{/each}
							</div>
						</div>

						<div class="skill-section">
							<div class="skill-header">
								<h4>Work style</h4>
								<p>How you like to work and what kind of environment suits you.</p>
							</div>
							<div class="skill-entry">
								<input
									bind:value={workStyleInput}
									placeholder="Structured, independent, team-oriented..."
									onkeydown={(event) => event.key === 'Enter' && (event.preventDefault(), handleSkillAdd('workStyles'))}
								/>
								<button type="button" class="secondary-button compact" onclick={() => handleSkillAdd('workStyles')}>Add</button>
							</div>
							<div class="skill-chip-list">
								{#each profileDraft.workStyles as skill}
									<button type="button" class="skill-chip" onclick={() => removeSkill('workStyles', skill)}>
										{skill} ×
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<div class="profile-preview">
					<div class="section-header">
						<div>
							<p class="eyebrow">Prompt Preview</p>
							<h3>How this can augment prompts later</h3>
						</div>
					</div>
					<pre>{promptProfilePreview}</pre>
				</div>
			</section>
		{:else}
			<div class="auth-grid">
				<form class="auth-card" method="post" action="?/signInEmail" use:enhance>
					<div class="card-header">
						<h3>Sign In</h3>
						<p>Use your existing account.</p>
					</div>

					<label>
						<span>Email</span>
						<input type="email" name="email" autocomplete="email" required />
					</label>

					<label>
						<span>Password</span>
						<input type="password" name="password" autocomplete="current-password" required />
					</label>

					<button type="submit" class="primary-button">Sign In</button>
				</form>

				<form class="auth-card" method="post" action="?/signUpEmail" use:enhance>
					<div class="card-header">
						<h3>Create Account</h3>
						<p>Make a local account for saved preferences.</p>
					</div>

					<label>
						<span>Name</span>
						<input name="name" autocomplete="name" required />
					</label>

					<label>
						<span>Email</span>
						<input type="email" name="email" autocomplete="email" required />
					</label>

					<label>
						<span>Password</span>
						<input type="password" name="password" autocomplete="new-password" required />
					</label>

					<button type="submit" class="primary-button">Create Account</button>
				</form>
			</div>
		{/if}

		{#if form?.message}
			<p class="feedback">{form.message}</p>
		{/if}
	</div>
</section>

<PromptManagerModal
	open={showPromptManager}
	onClose={() => showPromptManager = false}
/>

<style>
	.auth-page {
		display: grid;
		place-items: center;
		min-height: min(78vh, 860px);
	}

	.auth-shell {
		width: min(100%, 980px);
		display: grid;
		gap: 1.25rem;
		padding: 1.5rem;
		border-radius: calc(var(--radius-container) * 1.1);
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-600);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.16);
	}

	.auth-copy h2,
	.auth-copy p {
		margin: 0;
	}

	.auth-copy {
		display: grid;
		gap: 0.35rem;
	}

	.eyebrow {
		color: var(--color-warning-400);
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.auth-copy p:last-child {
		color: var(--color-primary-400);
		max-width: 42rem;
	}

	.auth-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 1rem;
	}

	.profile-shell {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border-radius: 1rem;
		background: var(--color-surface-700);
		border: 1px solid var(--color-surface-600);
	}

	.profile-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
		gap: 1rem;
	}

	.profile-card {
		display: grid;
		gap: 1rem;
		padding: 1.1rem;
		border-radius: 1rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-600);
	}

	.section-header {
		display: grid;
		gap: 0.25rem;
	}

	.section-header h3,
	.section-header p {
		margin: 0;
	}

	.section-copy {
		color: var(--color-primary-400);
		max-width: 44rem;
	}

	.field-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.9rem;
	}

	.auth-card,
	.account-card {
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
		border-radius: 1rem;
		background: var(--color-surface-700);
		border: 1px solid var(--color-surface-600);
	}

	.card-header {
		display: grid;
		gap: 0.2rem;
	}

	.card-header h3,
	.card-header p,
	.account-meta p {
		margin: 0;
	}

	.card-header p,
	.account-email {
		color: var(--color-primary-400);
	}

	label {
		display: grid;
		gap: 0.4rem;
	}

	label span {
		color: var(--color-primary-300);
		font-size: 0.95rem;
	}

	input {
		padding: 0.8rem 0.9rem;
		border-radius: 0.85rem;
		border: 1px solid var(--color-surface-600);
		background: var(--color-surface-900);
		color: var(--base-font-color);
		font: inherit;
	}

	textarea {
		padding: 0.8rem 0.9rem;
		border-radius: 0.85rem;
		border: 1px solid var(--color-surface-600);
		background: var(--color-surface-900);
		color: var(--base-font-color);
		font: inherit;
		resize: vertical;
	}

	.primary-button,
	.secondary-button,
	.primary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: fit-content;
		padding: 0.75rem 1rem;
		border-radius: 999px;
		font: inherit;
		font-weight: 700;
		text-decoration: none;
	}

	.primary-button,
	.primary-link {
		border: 1px solid var(--color-secondary-500);
		background: var(--color-secondary-500);
		color: var(--color-secondary-contrast-500);
		cursor: pointer;
	}

	.secondary-button {
		border: 1px solid var(--color-surface-500);
		background: var(--color-surface-700);
		color: var(--base-font-color);
		cursor: pointer;
	}

	.compact {
		padding: 0.75rem 0.9rem;
		min-width: 4.5rem;
	}

	.account-card {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
	}

	.account-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: flex-end;
	}

	.account-name {
		font-size: 1.1rem;
		font-weight: 700;
	}

	.skill-section {
		display: grid;
		gap: 0.75rem;
	}

	.skill-header {
		display: grid;
		gap: 0.15rem;
	}

	.skill-header h4,
	.skill-header p {
		margin: 0;
	}

	.skill-header p {
		color: var(--color-primary-400);
	}

	.skill-entry {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		gap: 0.75rem;
	}

	.skill-chip-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.skill-chip {
		padding: 0.55rem 0.8rem;
		border-radius: 999px;
		border: 1px solid var(--color-tertiary-500);
		background: color-mix(in srgb, var(--color-tertiary-500) 16%, var(--color-surface-800));
		color: var(--base-font-color);
		font: inherit;
		cursor: pointer;
	}

	.profile-preview {
		display: grid;
		gap: 0.75rem;
		padding: 1.1rem;
		border-radius: 1rem;
		background: var(--color-surface-800);
		border: 1px solid var(--color-surface-600);
	}

	.profile-preview pre {
		margin: 0;
		padding: 1rem;
		border-radius: 0.9rem;
		background: var(--color-surface-900);
		border: 1px solid var(--color-surface-600);
		color: var(--color-primary-200);
		font: inherit;
		line-height: 1.5;
		white-space: pre-wrap;
	}

	.feedback {
		margin: 0;
		color: var(--color-error-400);
	}

	@media (hover: hover) and (pointer: fine) {
		.primary-button,
		.secondary-button,
		.primary-link {
			transition: filter 0.14s ease 100ms, background 0.14s ease 100ms, border-color 0.14s ease 100ms;
		}

		.primary-button:hover,
		.secondary-button:hover,
		.primary-link:hover {
			filter: brightness(1.05);
		}
	}

	@media (max-width: 760px) {
		.auth-grid,
		.account-card,
		.profile-grid,
		.field-row {
			grid-template-columns: 1fr;
		}

		.account-actions {
			justify-content: flex-start;
		}
	}
</style>
