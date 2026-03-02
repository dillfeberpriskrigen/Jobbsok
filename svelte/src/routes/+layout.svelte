<script lang="ts">
import './layout.css';
import { page } from '$app/state';

let { children, data } = $props();

const navItems = [
	{ href: '/', label: 'Home' },
	{ href: '/debug', label: 'Debug' },
	{ href: '/about', label: 'About' }
];

function isActive(path: string) {
	return page.url.pathname === path;
}
</script>

<div class="app-shell">
	<header class="site-header">
		<div class="brand-block">
			<div class="brand-copy">
				<p class="eyebrow">Schup</p>
				<h1>Din kajplats i etern.</h1>
			</div>
		</div>

		<nav class="site-nav" aria-label="Primary">
			{#each navItems as item}
				<a
					class:active={isActive(item.href)}
					href={item.href}
				>
					{item.label}
				</a>
			{/each}

			<a class="auth-link" href={data.user ? '/demo/better-auth' : '/demo/better-auth/login'}>
				{data.user ? data.user.name : 'Login'}
			</a>
		</nav>
	</header>

	<main class="page-shell">
		{@render children()}
	</main>

	<footer class="site-footer">
		<span>The hobbits. In isengard.</span>
	</footer>
</div>

<style>
	:global(body) {
		margin: 0;
		background:
			radial-gradient(circle at top left, color-mix(in srgb, var(--color-warning-500) 12%, transparent), transparent 28%),
			radial-gradient(circle at top right, color-mix(in srgb, var(--color-tertiary-500) 14%, transparent), transparent 24%),
			linear-gradient(180deg, var(--color-surface-900) 0%, var(--color-surface-950) 100%);
		color: var(--base-font-color);
	}

	.app-shell {
		min-height: 100vh;
		min-height: 100dvh;
		padding: 1rem;
	}

	.site-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		max-width: 1100px;
		margin: 0 auto 1.5rem;
		padding: 1rem 1.25rem;
		border: 1px solid var(--color-surface-600);
		border-radius: 1.5rem;
		background: var(--color-surface-800);
		box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
	}

	.brand-block {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 0.9rem;
		background: linear-gradient(135deg, #0f766e 0%, #2563eb 100%);
		color: white;
		font-weight: 700;
		text-decoration: none;
		letter-spacing: 0.08em;
	}

	.brand-copy h1,
	.brand-copy p {
		margin: 0;
	}

	.brand-copy h1 {
		font-size: clamp(1rem, 1.8vw, 1.2rem);
		font-weight: 700;
		max-width: 38rem;
		color: var(--heading-font-color);
	}

	.eyebrow {
		font-size: 0.72rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		color: var(--color-warning-400);
		margin-bottom: 0.2rem;
	}

	.site-nav {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
	}

	.site-nav a {
		padding: 0.65rem 0.95rem;
		border-radius: 999px;
		text-decoration: none;
		color: var(--base-font-color);
		background: var(--color-surface-700);
		border: 1px solid var(--color-surface-600);
		transition: background 0.14s ease, color 0.14s ease, border-color 0.14s ease;
	}

	.site-nav a.active {
		background: var(--color-secondary-500);
		color: var(--color-secondary-contrast-500);
	}

	.auth-link {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--color-warning-500) 85%, black) 0%,
			color-mix(in srgb, var(--color-error-500) 70%, black) 100%
		) !important;
		color: var(--color-warning-contrast-500) !important;
	}

	@media (hover: hover) and (pointer: fine) {
		.site-nav a {
			transition:
				background 0.14s ease 90ms,
				color 0.14s ease 90ms,
				border-color 0.14s ease 90ms;
		}

		.site-nav a:hover {
			background: var(--color-surface-600);
		}
	}

	.page-shell {
		max-width: 1100px;
		margin: 0 auto;
		padding-bottom: 2rem;
	}

	.site-footer {
		max-width: 1100px;
		margin: 1rem auto 0;
		padding: 0.25rem 0.25rem 1.5rem;
		font-size: 0.9rem;
		color: color-mix(in srgb, var(--base-font-color) 70%, transparent);
		text-align: center;
	}

	@media (max-width: 700px) {
		.site-header {
			padding: 1rem;
		}

		.brand-block {
			align-items: flex-start;
		}

		.site-nav {
			width: 100%;
		}
	}
</style>
