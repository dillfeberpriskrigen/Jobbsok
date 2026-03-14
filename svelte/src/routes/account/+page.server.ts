import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';
import { auth } from '$lib/server/auth.js';
import { APIError } from 'better-auth';

export const load: PageServerLoad = async (event) => {
	return {
		user: event.locals.user ?? null
	};
};

export const actions: Actions = {
	signInEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		try {
			await auth.api.signInEmail({
				body: {
					email,
					password,
					callbackURL: '/'
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { mode: 'signin', message: error.message || 'Signin failed' });
			}

			return fail(500, { mode: 'signin', message: 'Unexpected error during sign in.' });
		}

		return redirect(302, '/');
	},

	signUpEmail: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString().trim() ?? '';

		try {
			await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
					callbackURL: '/'
				}
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { mode: 'signup', message: error.message || 'Registration failed' });
			}

			return fail(500, { mode: 'signup', message: 'Unexpected error during sign up.' });
		}

		return redirect(302, '/');
	},

	signOut: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});

		return redirect(302, '/account');
	}
};
