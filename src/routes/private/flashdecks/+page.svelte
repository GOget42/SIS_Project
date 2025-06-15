<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	let deckName = '';
	let deckDescription = '';

	// CSS classes for styling consistency (inspired by +layout.svelte)
	const inputClasses = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm";
	const primaryButtonClasses = "px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors duration-150 ease-in-out text-white bg-blue-600 hover:bg-blue-700";
	const deleteButtonClasses = "px-3 py-1.5 rounded-md text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-colors";
	const viewButtonClasses = "px-3 py-1.5 rounded-md text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors";
	const viewOtherButtonClasses = "px-3 py-1.5 rounded-md text-xs font-medium text-white bg-gray-500 hover:bg-gray-600 transition-colors";


	$: if (form?.success && form?.action?.includes('?/createDeck')) {
		deckName = '';
		deckDescription = '';
	}
	// If form indicates an error for createDeck, repopulate for user convenience
	$: if (form?.success === false && form?.action?.includes('?/createDeck') && form?.name) {
		deckName = form.name;
		deckDescription = form.description || '';
	}

</script>

<div class="container mx-auto p-4 md:p-8">
	<h1 class="text-3xl font-bold mb-8 text-gray-800">FlashDecks</h1>

	{#if form?.message}
		<div class="mb-4 p-3 rounded-md {form.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}" role="alert">
			{form.message}
		</div>
	{/if}

	<!-- My Decks Section -->
	<section class="mb-12">
		<h2 class="text-2xl font-semibold mb-6 text-gray-700">My Decks</h2>

		<div class="bg-white p-6 rounded-lg shadow-md mb-8">
			<h3 class="text-xl font-medium mb-4 text-gray-700">Create New Deck</h3>
			<form method="POST" action="?/createDeck" use:enhance>
				<div class="mb-4">
					<label for="deckName" class="block text-sm font-medium text-gray-700">Deck Name*</label>
					<input type="text" id="deckName" name="name" bind:value={deckName} required class="{inputClasses}" />
				</div>
				<div class="mb-4">
					<label for="deckDescription" class="block text-sm font-medium text-gray-700">Description</label>
					<textarea id="deckDescription" name="description" bind:value={deckDescription} rows="3" class="{inputClasses}"></textarea>
				</div>
				<button type="submit" class="{primaryButtonClasses}">
					Create Deck
				</button>
			</form>
		</div>

		{#if data.myDecks && data.myDecks.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.myDecks as deck (deck.flashdeck_id)}
					<div class="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
						<div class="p-5 flex-grow">
							<h3 class="text-lg font-semibold text-blue-700 mb-2">
								<a href="/private/flashdecks/{deck.flashdeck_id}" class="hover:underline">{deck.name}</a>
							</h3>
							{#if deck.description}
								<p class="text-gray-600 text-sm mb-3 whitespace-pre-line">{deck.description}</p>
							{/if}
						</div>
						<div class="p-5 border-t border-gray-200 bg-gray-50 flex justify-end items-center space-x-2">
							<a href="/private/flashdecks/{deck.flashdeck_id}" class="{viewButtonClasses}">
								View
							</a>
							<form method="POST" action="?/deleteDeck" use:enhance={({ cancel }) => {
								if (!confirm('Are you sure you want to delete this deck and all its cards? This action cannot be undone.')) {
									cancel();
								}
								return async ({ update }) => {
									await update({ reset: false });
								};
							}}>
								<input type="hidden" name="flashdeck_id" value={deck.flashdeck_id} />
								<button type="submit" class="{deleteButtonClasses}">
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-600 italic">You haven't created any decks yet. Use the form above to get started!</p>
		{/if}
	</section>

	<!-- Other Decks Section -->
	<section>
		<h2 class="text-2xl font-semibold mb-6 text-gray-700">Other Decks</h2>
		{#if data.otherDecks && data.otherDecks.length > 0}
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each data.otherDecks as deck (deck.flashdeck_id)}
					<div class="bg-white rounded-lg shadow-md overflow-hidden flex flex-col">
						<div class="p-5 flex-grow">
							<h3 class="text-lg font-semibold text-blue-700 mb-2">
								<a href="/private/flashdecks/{deck.flashdeck_id}" class="hover:underline">{deck.name}</a>
							</h3>
							{#if deck.description}
								<p class="text-gray-600 text-sm mb-3 whitespace-pre-line">{deck.description}</p>
							{/if}
						</div>
						<div class="p-5 border-t border-gray-200 bg-gray-50 flex justify-end">
							<a href="/private/flashdecks/{deck.flashdeck_id}" class="{viewOtherButtonClasses}">
								View Deck
							</a>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-gray-600 italic">No other decks are currently available.</p>
		{/if}
	</section>
</div>