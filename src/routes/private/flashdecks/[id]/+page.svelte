<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	export let data: PageData;
	export let form: ActionData;

	let frontContent = '';
	let backContent = '';

	// For editing
	let editingCardId: string | null = null;
	let editFrontContent = '';
	let editBackContent = '';

	$: ({ deck, cards, isOwner } = data); // isOwner added, if needed

	// Reset form fields on successful card creation
	$: if (
		form?.success &&
		form.message?.includes('created') &&
		!form.updatedCardId &&
		!form.deletedCardId
	) {
		frontContent = '';
		backContent = '';
	}

	// Handle successful card update or deletion by invalidating data to refresh the list
	$: if (form?.success && (form.updatedCardId || form.deletedCardId)) {
		editingCardId = null;
		invalidateAll(); // This reloads the data, including cards
	}

	function startEdit(card: (typeof cards)[0]) {
		editingCardId = card.card_id;
		editFrontContent = card.front_content;
		editBackContent = card.back_content;
	}

	function cancelEdit() {
		editingCardId = null;
	}
</script>

<div class="container mx-auto p-4">
	<a href="/private/flashdecks" class="mb-6 inline-block text-blue-500 hover:underline"
		>&larr; Back to Decks</a
	>
	{#if deck}
		<h1 class="mb-2 text-3xl font-bold">{deck.name}</h1>
		<p class="mb-6 text-gray-600">{deck.description || 'No description available.'}</p>

		<!-- Learn Button -->
		{#if cards && cards.length > 0}
			<div class="my-6">
				<a
					href="/private/flashdecks/{deck.flashdeck_id}/learn"
					class="focus:shadow-outline rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700 focus:outline-none"
				>
					Learn Deck ({cards.length} cards)
				</a>
			</div>
		{/if}

		<!-- Only show if the user is the owner of the deck -->
		{#if isOwner}
			<section class="mb-8">
				<h2 class="mb-4 text-2xl font-semibold">Add New Card</h2>
				<form
					method="POST"
					action="?/createCard"
					use:enhance={() => {
						return async ({ update }) => {
							await update({ reset: false });
						};
					}}
					class="mb-4 rounded bg-white px-8 pt-6 pb-8 shadow-md"
				>
					{#if form?.message && !form.updatedCardId && !form.deletedCardId && !('cardId' in form)}
						<p class="{form.success ? 'text-green-500' : 'text-red-500'} mb-4 text-xs italic">
							{form.message}
						</p>
					{/if}
					<div class="mb-4">
						<label class="mb-2 block text-sm font-bold text-gray-700" for="front_content">
							Front
						</label>
						<textarea
							id="front_content"
							name="front_content"
							bind:value={frontContent}
							class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
							rows="3"
							required
						></textarea>
					</div>
					<div class="mb-6">
						<label class="mb-2 block text-sm font-bold text-gray-700" for="back_content">
							Back
						</label>
						<textarea
							id="back_content"
							name="back_content"
							bind:value={backContent}
							class="focus:shadow-outline mb-3 w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
							rows="3"
							required
						></textarea>
					</div>
					<div class="flex items-center justify-between">
						<button
							class="focus:shadow-outline rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700 focus:outline-none"
							type="submit"
						>
							Create Card
						</button>
					</div>
				</form>
			</section>
		{/if}

		<section>
			<h2 class="mb-4 text-2xl font-semibold">Cards in Deck ({cards?.length || 0})</h2>
			{#if form?.message && (form.updatedCardId || form.deletedCardId)}
				<p class="{form.success ? 'text-green-500' : 'text-red-500'} mb-4 text-xs italic">
					{form.message}
				</p>
			{/if}

			{#if cards && cards.length > 0}
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each cards as card (card.card_id)}
						<div class="flex flex-col justify-between rounded-lg bg-white p-6 shadow-lg">
							{#if editingCardId === card.card_id && isOwner}
								<!-- Editing only for owner of the card/deck -->
								<form
									method="POST"
									action="?/updateCard"
									use:enhance={() => {
										return async ({ update }) => {
											await update({ reset: false });
										};
									}}
									class="flex h-full flex-col"
								>
									<input type="hidden" name="card_id" value={card.card_id} />
									<div class="mb-4">
										<label
											class="mb-1 block text-sm font-bold text-gray-700"
											for="edit_front_content_{card.card_id}"
										>
											Front
										</label>
										<textarea
											id="edit_front_content_{card.card_id}"
											name="front_content"
											bind:value={editFrontContent}
											class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
											rows="3"
											required
										></textarea>
									</div>
									<div class="mb-4">
										<label
											class="mb-1 block text-sm font-bold text-gray-700"
											for="edit_back_content_{card.card_id}"
										>
											Back
										</label>
										<textarea
											id="edit_back_content_{card.card_id}"
											name="back_content"
											bind:value={editBackContent}
											class="focus:shadow-outline w-full appearance-none rounded border px-3 py-2 leading-tight text-gray-700 shadow focus:outline-none"
											rows="3"
											required
										></textarea>
									</div>
									<!-- Error handling for the specific card in edit mode -->
									{#if form?.message && !form.success && 'cardId' in form && form.cardId === card.card_id}
										<p class="mb-2 text-xs text-red-500 italic">{form.message}</p>
									{/if}
									<div class="mt-auto flex items-center justify-end space-x-2">
										<button
											type="button"
											on:click={cancelEdit}
											class="focus:shadow-outline rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400 focus:outline-none"
										>
											Cancel
										</button>
										<button
											class="focus:shadow-outline rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700 focus:outline-none"
											type="submit"
										>
											Save
										</button>
									</div>
								</form>
							{:else}
								<div>
									<div class="mb-4">
										<h3 class="text-lg font-semibold text-gray-800">Front:</h3>
										<p class="whitespace-pre-wrap text-gray-700">{card.front_content}</p>
									</div>
									<div>
										<h3 class="text-lg font-semibold text-gray-800">Back:</h3>
										<p class="whitespace-pre-wrap text-gray-700">{card.back_content}</p>
									</div>
								</div>
								<div class="mt-6 border-t border-gray-200 pt-4">
									<p class="mb-2 text-xs text-gray-400">
										Created: {new Date(card.created_at).toLocaleDateString()}
										{#if card.updated_at && new Date(card.updated_at).toISOString() !== new Date(card.created_at).toISOString()}
											, Updated: {new Date(card.updated_at).toLocaleDateString()}
										{/if}
									</p>
									<!-- Show Edit/Delete buttons only if the user is the owner of the deck/card -->
									{#if isOwner}
										<div class="flex items-center justify-end space-x-2">
											<button
												on:click={() => startEdit(card)}
												class="focus:shadow-outline rounded bg-yellow-400 px-3 py-1 text-sm font-semibold text-white hover:bg-yellow-500 focus:outline-none"
											>
												Edit
											</button>
											<form
												method="POST"
												action="?/deleteCard"
												use:enhance={({ cancel: cancelSubmission }) => {
													if (!confirm('Are you sure you want to delete this card?')) {
														cancelSubmission();
														return;
													}
													return async ({ update }) => {
														await update({ reset: false });
													};
												}}
												class="inline"
											>
												<input type="hidden" name="card_id" value={card.card_id} />
												<button
													class="focus:shadow-outline rounded bg-red-500 px-3 py-1 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none"
													type="submit"
												>
													Delete
												</button>
											</form>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-gray-500">
					{#if isOwner}
						No cards in this deck yet. Add the first one!
					{:else}
						There are no cards in this deck.
					{/if}
				</p>
			{/if}
		</section>
	{:else}
		<p class="text-red-500">Deck could not be loaded or does not exist.</p>
	{/if}
</div>
