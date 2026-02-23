import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth';

export const load: PageServerLoad = async (event) => {
	console.log('LOAD /signin page');

	if (event.locals.user) {
		console.log('User already logged in:', event.locals.user);
		return redirect(302, '/demo/better-auth');
	}

	console.log('No user in session');
	return {};
};

export const actions: Actions = {
	signInEmail: async (event) => {
		console.log('--- SIGN IN ACTION START ---');

		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';

		console.log('Form Data Received:', {
			email,
			passwordLength: password.length
		});

		try {
			console.log('Calling auth.api.signInEmail...');

			const result = await auth.api.signInEmail({
				body: {
					email,
					password,
					callbackURL: '/auth/verification-success'
				}
			});

			console.log('Sign-in result:', result);
		} catch (error) {
			console.error('Sign-in error caught:', error);

			if (error instanceof APIError) {
				console.error('BetterAuth APIError:', {
					message: error.message,
					status: error.status
				});
				return fail(400, { message: error.message || 'Signin failed' });
			}

			console.error('Unexpected error type:', error);
			return fail(500, { message: 'Unexpected error' });
		}

		console.log('Sign-in successful, redirecting...');
		return redirect(302, '/demo/better-auth');
	},

	signUpEmail: async (event) => {
		console.log('--- SIGN UP ACTION START ---');

		const formData = await event.request.formData();
		const email = formData.get('email')?.toString() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString() ?? '';

		console.log('Form Data Received:', {
			email,
			name,
			passwordLength: password.length
		});

		try {
			console.log('Calling auth.api.signUpEmail...');

			const result = await auth.api.signUpEmail({
				body: {
					email,
					password,
					name,
					callbackURL: '/auth/verification-success'
				}
			});

			console.log('Sign-up result:', result);
		} catch (error) {
			console.error('Sign-up error caught:', error);

			if (error instanceof APIError) {
				console.error('BetterAuth APIError:', {
					message: error.message,
					status: error.status
				});
				return fail(400, { message: error.message || 'Registration failed' });
			}

			console.error('Unexpected error type:', error);
			return fail(500, { message: 'Unexpected error' });
		}

		console.log('Sign-up successful, redirecting...');
		return redirect(302, '/demo/better-auth');
	},
};