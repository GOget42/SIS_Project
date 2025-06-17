<script lang="ts">
	import type { PageData } from './$types';

	export let data: PageData;
	$: ({ deck, cards, isOwner, deckId } = data);

	let currentCardIndex = 0;
	let showFront = true;

	// Simple client-side tracking for demonstration purposes
	// let knownCount = 0; // Could be used for more complex logic

	$: currentCard = cards && cards.length > 0 ? cards[currentCardIndex] : null;

	function flipCard() {
		showFront = !showFront;
	}

	function nextCard(_knewIt: boolean) {
		// _knewIt could be used to save learning progress
		if (currentCardIndex < cards.length - 1) {
			currentCardIndex++;
			showFront = true;
		} else {
			// Optional: Display message when all cards have been viewed
			const allCardsViewedElement = document.getElementById('allCardsViewedMessage');
			if (allCardsViewedElement) {
				allCardsViewedElement.classList.remove('hidden');
			}
		}
	}

	function previousCard() {
		if (currentCardIndex > 0) {
			currentCardIndex--;
			showFront = true;
			const allCardsViewedElement = document.getElementById('allCardsViewedMessage');
			if (allCardsViewedElement) {
				allCardsViewedElement.classList.add('hidden');
			}
		}
	}

	function restartLearnSession() {
		currentCardIndex = 0;
		showFront = true;
		// knownCount = 0;
		const allCardsViewedElement = document.getElementById('allCardsViewedMessage');
		if (allCardsViewedElement) {
			allCardsViewedElement.classList.add('hidden');
		}
	}
</script>

<div class="container mx-auto p-4">
	<div class="mb-6">
		<a href="/private/flashdecks/{deckId}" class="text-blue-500 hover:underline">
			&larr; Back to Deck "{deck.name}"
		</a>
		<h1 class="mt-2 text-3xl font-bold">Learn Session: {deck.name}</h1>
		{#if isOwner}
			<p class="text-sm text-gray-500">You are the owner of this deck.</p>
		{/if}
	</div>

	{#if cards && cards.length > 0}
		<div class="my-4">
			<p class="text-gray-700">Card {currentCardIndex + 1} of {cards.length}</p>
			<!-- Progress bar -->
			<div class="mt-1 h-2.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="h-2.5 rounded-full bg-blue-600 transition-all duration-300 ease-out"
					style="width: {((currentCardIndex + 1) / cards.length) * 100}%"
				></div>
			</div>
		</div>

		{#if currentCard}
			<div
				class="mb-6 flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-lg bg-white p-8 text-center shadow-lg transition-all duration-300 ease-in-out hover:shadow-xl"
				on:click={flipCard}
				role="button"
				tabindex="0"
				on:keydown={(e) => {
					if (e.key === ' ' || e.key === 'Enter') flipCard();
				}}
				aria-live="polite"
			>
				{#if showFront}
					<div>
						<p class="mb-2 text-xs text-gray-500 uppercase">Front</p>
						<p class="text-2xl break-words">{currentCard.front_content}</p>
					</div>
				{:else}
					<div>
						<p class="mb-2 text-xs text-gray-500 uppercase">Back</p>
						<p class="text-2xl break-words">{currentCard.back_content}</p>
					</div>
				{/if}
			</div>

			<div class="mb-6 flex flex-wrap items-center justify-between gap-2">
				<button
					on:click={previousCard}
					disabled={currentCardIndex === 0}
					class="rounded bg-gray-300 px-4 py-2 font-bold text-gray-800 hover:bg-gray-400 disabled:opacity-50"
				>
					Previous
				</button>
				<button
					on:click={flipCard}
					class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				>
					Flip
				</button>
				<div class="flex gap-2">
					<button
						on:click={() => nextCard(false)}
						disabled={currentCardIndex === cards.length - 1 && !showFront}
						class="rounded bg-orange-500 px-4 py-2 font-bold text-white hover:bg-orange-600 disabled:opacity-50"
					>
						Didn't know
					</button>
					<button
						on:click={() => nextCard(true)}
						disabled={currentCardIndex === cards.length - 1 && !showFront}
						class="rounded bg-green-500 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
					>
						Knew it
					</button>
				</div>
			</div>

			<div
				id="allCardsViewedMessage"
				class="my-6 hidden rounded-md bg-green-100 p-4 text-center text-green-700"
			>
				<p class="font-semibold">Great! You have viewed all cards in this round.</p>
			</div>
		{/if}
	{:else}
		<div class="py-10 text-center">
			<p class="mb-4 text-xl text-gray-700">This deck contains no cards to learn.</p>
			{#if isOwner}
				<p class="mb-6 text-gray-600">First, add some cards to your deck.</p>
				<a
					href="/private/flashdecks/{deckId}"
					class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700"
				>
					Add Cards
				</a>
			{/if}
		</div>
	{/if}
</div>
