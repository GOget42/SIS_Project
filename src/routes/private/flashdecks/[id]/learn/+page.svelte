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
		<h1 class="text-3xl font-bold mt-2">Learn Session: {deck.name}</h1>
		{#if isOwner}
			<p class="text-sm text-gray-500">You are the owner of this deck.</p>
		{/if}
	</div>

	{#if cards && cards.length > 0}
		<div class="my-4">
			<p class="text-gray-700">Card {currentCardIndex + 1} of {cards.length}</p>
			<!-- Progress bar -->
			<div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-1">
				<div
					class="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
					style="width: {((currentCardIndex + 1) / cards.length) * 100}%">
				</div>
			</div>
		</div>

		{#if currentCard}
			<div
				class="bg-white shadow-lg rounded-lg p-8 min-h-[250px] flex flex-col items-center justify-center text-center cursor-pointer mb-6 transition-all duration-300 ease-in-out hover:shadow-xl"
				on:click={flipCard}
				role="button"
				tabindex="0"
				on:keydown={(e) => {if (e.key === ' ' || e.key === 'Enter') flipCard()}}
				aria-live="polite"
			>
				{#if showFront}
					<div>
						<p class="text-xs text-gray-500 mb-2 uppercase">Front</p>
						<p class="text-2xl break-words">{currentCard.front_content}</p>
					</div>
				{:else}
					<div>
						<p class="text-xs text-gray-500 mb-2 uppercase">Back</p>
						<p class="text-2xl break-words">{currentCard.back_content}</p>
					</div>
				{/if}
			</div>

			<div class="flex flex-wrap justify-between items-center gap-2 mb-6">
				<button
					on:click={previousCard}
					disabled={currentCardIndex === 0}
					class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded disabled:opacity-50"
				>
					Previous
				</button>
				<button
					on:click={flipCard}
					class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
				>
					Flip
				</button>
				<div class="flex gap-2">
					<button
						on:click={() => nextCard(false)}
						disabled={currentCardIndex === cards.length - 1 && !showFront}
						class="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
					>
						Didn't know
					</button>
					<button
						on:click={() => nextCard(true)}
						disabled={currentCardIndex === cards.length - 1 && !showFront}
						class="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
					>
						Knew it
					</button>
				</div>
			</div>

			<div id="allCardsViewedMessage" class="text-center my-6 p-4 bg-green-100 text-green-700 rounded-md hidden">
				<p class="font-semibold">Great! You have viewed all cards in this round.</p>
			</div>
		{/if}
	{:else}
		<div class="text-center py-10">
			<p class="text-xl text-gray-700 mb-4">This deck contains no cards to learn.</p>
			{#if isOwner}
				<p class="text-gray-600 mb-6">First, add some cards to your deck.</p>
				<a
					href="/private/flashdecks/{deckId}"
					class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
				>
					Add Cards
				</a>
			{/if}
		</div>
	{/if}
</div>