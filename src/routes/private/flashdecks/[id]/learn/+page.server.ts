import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Tables } from '$lib/database.types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, params }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/');
	}

	// (1) Deck-Ladevorgang anpassen, um die Eigentumsprüfung zu entfernen
	const { data: deck, error: deckError } = await supabase
		.from('decks')
		.select('*, user_id') // user_id wird weiterhin selektiert für das isOwner-Flag
		.eq('flashdeck_id', params.id)
		// .eq('user_id', session.user.id) // Diese Zeile wird entfernt, um das Lernen von Decks anderer Benutzer zu ermöglichen
		.single();

	if (deckError || !deck) {
		throw error(404, 'Deck nicht gefunden.');
	}

	const { data: cards, error: cardsError } = await supabase
		.from('cards')
		.select('*')
		.eq('flashdeck_id', params.id)
		.order('created_at', { ascending: true }); // Karten z.B. in Erstellungsreihenfolge laden

	if (cardsError) {
		console.error("Fehler beim Laden der Karten für die Lernsession:", cardsError);
		throw error(500, 'Karten für die Lernsession konnten nicht geladen werden.');
	}

	return {
		deck: deck as Tables<'decks'>,
		cards: (cards || []) as Tables<'cards'>[], // Sicherstellen, dass cards immer ein Array ist
		deckId: params.id,
		isOwner: deck.user_id === session.user.id // Flag beibehalten, falls die UI für Eigentümer variiert
	};
};