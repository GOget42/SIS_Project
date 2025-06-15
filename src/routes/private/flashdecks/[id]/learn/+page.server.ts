import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Tables } from '$lib/database.types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, params }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/');
	}

	// 1. Deck laden und prüfen, ob es dem aktuellen Nutzer gehört oder öffentlich ist (falls zutreffend)
	const { data: deck, error: deckError } = await supabase
		.from('decks')
		.select('*') // user_id ist implizit in '*'
		.eq('flashdeck_id', params.id)
		.single();

	if (deckError) {
		console.error('Fehler beim Laden des Decks für die Lernansicht:', deckError);
		throw error(500, 'Deck konnte nicht geladen werden.');
	}
	if (!deck) {
		throw error(404, 'Deck nicht gefunden.');
	}

	// Berechtigungsprüfung: Nur der Ersteller des Decks darf es lernen.
	// Diese Logik kann angepasst werden, falls Decks teilbar sein sollen.
	if (deck.user_id !== session.user.id) {
		throw error(403, 'Sie sind nicht berechtigt, dieses Deck zu lernen.');
	}

	// 2. Karten für dieses Deck laden
	const { data: cards, error: cardsError } = await supabase
		.from('cards')
		.select('*')
		.eq('flashdeck_id', params.id)
		.order('created_at', { ascending: true }); // Basis-Sortierung, Mischen erfolgt unten

	if (cardsError) {
		console.error('Fehler beim Laden der Karten für die Lernansicht:', cardsError);
		throw error(500, 'Karten konnten nicht geladen werden.');
	}

	if (!cards || cards.length === 0) {
		// Dieser Fall sollte durch den Button auf der Detailseite verhindert werden,
		// aber als zusätzliche Sicherheit.
		throw error(404, 'Dieses Deck enthält keine Karten zum Lernen.');
	}

	// Karten serverseitig mischen für die initiale Lernsession
	const shuffledCards = [...cards].sort(() => Math.random() - 0.5);

	return {
		deck: deck as Tables<'decks'>,
		cards: shuffledCards as Tables<'cards'>[], // Gemischte Karten übergeben
	};
};