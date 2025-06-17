<script lang="ts">
	import type { ActionData } from './$types';

	export let form: ActionData;

	let email = form?.email || '';
	let password = ''; // Passwort wird aus Sicherheitsgründen nicht zurückgegeben/vorausgefüllt
</script>

<div class="flex min-h-screen flex-col justify-center bg-gray-100 py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Log in to your account</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
			<form class="space-y-6" method="POST">
				<div>
					<label for="email" class="block text-sm font-medium text-gray-700"> Email address </label>
					<div class="mt-1">
						<input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							autocomplete="email"
							required
							placeholder="you@example.com"
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700"> Password </label>
					<div class="mt-1">
						<input
							id="password"
							name="password"
							type="password"
							bind:value={password}
							autocomplete="current-password"
							required
							placeholder="Passwort"
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<button
						type="submit"
						class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					>
						Log In
					</button>
				</div>
			</form>

			{#if form?.error}
				<p class="mt-4 text-center text-sm text-red-600">
					{form.error}
				</p>
			{/if}

			<p class="mt-6 text-center text-sm text-gray-600">
				Don't have an account?
				<a href="/signup" class="font-medium text-indigo-600 hover:text-indigo-500"> Sign up </a>
			</p>
		</div>
	</div>
</div>
