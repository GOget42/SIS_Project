<script lang="ts">
	import type { PageData } from './$types';
	import { onMount } from 'svelte';

	export let data: PageData;

	$: ({ deck, cards: initialCards } = data);

	let currentCardIndex = 0;
	let isFlipped = false;
	let sessionFinished = false;
	let learnableCards: typeof initialCards = [];

	// Konsistente Styling-Klassen
	const cardBaseClasses = "bg-white shadow-xl rounded-lg p-8 min-h-[250px] md:min-h-[300px] flex flex-col justify-center items-center text-center transition-all duration-300 ease-in-out";
	const buttonBaseClasses = "px-6 py-3 rounded-md text-base font-medium shadow-sm transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";
	const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
	const secondaryButtonClasses = `${buttonBaseClasses} text-blue-700 bg-blue-100 hover:bg-blue-200 focus:ring-blue-500`;
	const greenButtonClasses = `${buttonBaseClasses} text-white bg-green-500 hover:bg-green-600 focus:ring-green-400`;
	const redButtonClasses = `${buttonBaseClasses} text-white bg-red-500 hover:bg-red-600 focus:ring-red-400`;
	const grayButtonClasses = `${buttonBaseClasses} text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-gray-400`;


	function initializeSession(cardsToLearn: typeof initialCards) {
		// Karten sind bereits serverseitig gemischt und als `initialCards` übergeben
		// Für den ersten Durchlauf verwenden wir die serverseitig gemischten Karten
		learnableCards = [...cardsToLearn];
		currentCardIndex = 0;
		isFlipped = false;
		sessionFinished = false;
		if (learnableCards.length === 0) {
			sessionFinished = true;
		}
	}

	onMount(() => {
		initializeSession(initialCards);
	});

	$: currentCard = learnableCards[currentCardIndex];
	$: cardDynamicClasses = `${cardBaseClasses} ${isFlipped ? 'transform rotate-y-180' : ''}`;


	function flipCard() {
		isFlipped = !isFlipped;
	}

	function handleAnswer(known: boolean) {
		// Zukünftige Logik für Spaced Repetition könnte hier einhaken.
		// Fürs Erste gehen wir einfach zur nächsten Karte.
		goToNextCard();
	}

	function goToNextCard() {
		if (currentCardIndex < learnableCards.length - 1) {
			currentCardIndex++;
			isFlipped = false;
		} else {
			sessionFinished = true;
			isFlipped = false; // Sicherstellen, dass die letzte Karte nicht umgedreht bleibt
		}
	}

	function restartSession() {
		// Mische die Karten clientseitig für jede neue "Nochmal lernen"-Sitzung
		const newShuffledCards = [...initialCards].sort(() => Math.random() - 0.5);
		initializeSession(newShuffledCards);
	}

</script>

<div class="container mx-auto p-4 md:p-8 flex flex-col items-center min-h-screen bg-gray-100">
	{#if deck}
		<div class="w-full max-w-xl xl:max-w-2xl">
			<div class="mb-6 text-center">
				<a href="/private/flashdecks/{deck.flashdeck_id}" class="text-blue-600 hover:text-blue-800 hover:underline text-sm">
					&larr; Zurück zu "{deck.name}"
				</a>
				<h1 class="text-3xl md:text-4xl font-bold mt-2 text-gray-800">Deck lernen: {deck.name}</h1>
			</div>

			{#if sessionFinished}
				<div class="{cardBaseClasses} justify-center items-center">
					<h2 class="text-2xl md:text-3xl font-semibold text-green-600 mb-4">🎉 Geschafft! 🎉</h2>
					<p class="text-gray-700 text-lg mb-6">Du hast alle Karten in diesem Deck angesehen.</p>
					<div class="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
						<button on:click={restartSession} class="{primaryButtonClasses} w-full sm:w-auto">
							Nochmal lernen
						</button>
						<a href="/private/flashdecks/{deck.flashdeck_id}" class="{secondaryButtonClasses} w-full sm:w-auto text-center">
							Zurück zum Deck
						</a>
					</div>
				</div>
			{:else if currentCard}
				<div class="mb-4 text-center text-gray-600 font-medium">
					Karte {currentCardIndex + 1} von {learnableCards.length}
				</div>

				<!-- Flashcard Container -->
				<div class="perspective">
					<div class="{cardBaseClasses} {isFlipped ? 'card-flipped' : ''} cursor-pointer" on:click={flipCard} title="Klicken zum Umdrehen">
						<!-- Vorderseite -->
						<div class="card-face card-front absolute inset-0 flex flex-col justify-center items-center p-6">
							<p class="text-xl md:text-2xl text-gray-800 whitespace-pre-wrap">{currentCard.front_content}</p>
						</div>
						<!-- Rückseite -->
						<div class="card-face card-back absolute inset-0 flex flex-col justify-center items-center p-6">
							<p class="text-xl md:text-2xl text-gray-800 whitespace-pre-wrap">{currentCard.back_content}</p>
						</div>
					</div>
				</div>


				<div class="mt-8 flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-center sm:items-center sm:space-x-4">
					{#if !isFlipped}
						<button on:click={flipCard} class="{primaryButtonClasses} w-full sm:w-auto">
							Antwort anzeigen
						</button>
					{:else}
						<button on:click={() => handleAnswer(false)} class="{redButtonClasses} w-full sm:w-auto">
							Nicht gewusst
						</button>
						<button on:click={() => handleAnswer(true)} class="{greenButtonClasses} w-full sm:w-auto">
							Gewusst
						</button>
					{/if}
				</div>
				{#if isFlipped && !sessionFinished}
					<div class="mt-4 text-center">
						<button on:click={goToNextCard} class="{grayButtonClasses} w-full sm:w-auto">
							Nächste Karte &rarr;
						</button>
					</div>
				{/if}

			{:else if learnableCards.length > 0 && !sessionFinished}
				<div class="{cardBaseClasses} justify-center items-center">
					<p class="text-gray-600 text-lg">Lade Karte...</p>
				</div>
			{:else}
				<!-- Dieser Fall sollte idealerweise nicht eintreten, wenn die Logik korrekt ist -->
				<div class="{cardBaseClasses} justify-center items-center">
					<p class="text-red-500 text-lg">Keine Karten zum Lernen in diesem Deck gefunden oder ein Fehler ist aufgetreten.</p>
					<a href="/private/flashdecks/{deck.flashdeck_id}" class="{secondaryButtonClasses} mt-6 w-full sm:w-auto text-center">
						Zurück zum Deck
					</a>
				</div>
			{/if}
		</div>
	{:else}
		<div class="w-full max-w-xl xl:max-w-2xl text-center">
			<p class="text-red-500 text-xl p-8 bg-white shadow-lg rounded-lg">Deckinformationen konnten nicht geladen werden.</p>
		</div>
	{/if}
</div>

<style>
    .perspective {
        perspective: 1000px;
        min-height: inherit; /* Ensure it takes up the card's min-height */
    }
    .card-base { /* Renamed from cardClasses to avoid conflict, used by JS */
        /* min-height is now on cardBaseClasses in script */
        /* other base styles for the card itself if needed */
    }
    .card-flipped {
        transform: rotateY(180deg);
    }
    .card-face {
        backface-visibility: hidden;
        width: 100%;
        height: 100%;
        /* Ensure p-6 padding is applied here if not on parent */
    }
    .card-back {
        transform: rotateY(180deg);
    }
</style>