// src/routes/api/auth/login/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth';

export const POST: RequestHandler = async (event) => {
	console.log('--- LOGIN API START ---');

	let body: { email?: string; password?: string };

	try {
		body = await event.request.json();
	} catch {
		return json({ message: 'Invalid JSON body' }, { status: 400 });
	}

	const email = body.email ?? '';
	const password = body.password ?? '';

	console.log('JSON Received:', {
		email,
		passwordLength: password.length
	});

	try {
		const result = await auth.api.signInEmail({
			body: {
				email,
				password,
				callbackURL: '/auth/verification-success'
			},
			headers: event.request.headers // ⚠️ important
		});

		console.log('Login success:', result);

		return json({ success: true });
	} catch (error) {
		console.error('Login error:', error);

		if (error instanceof APIError) {
			return json(
				{ message: error.message || 'Signin failed' },
				{ status: error.status ?? 400 }
			);
		}

		return json({ message: 'Unexpected error' }, { status: 500 });
	}
};