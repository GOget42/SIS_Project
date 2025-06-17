import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Tables } from '$lib/database.types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, params }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/');
	}

	// (1) Adjust deck loading to remove the ownership check
	const { data: deck, error: deckError } = await supabase
		.from('decks')
		.select('*, user_id') // keep user_id for the isOwner flag
		.eq('flashdeck_id', params.id)
		// .eq('user_id', session.user.id) // Diese Zeile wird entfernt, um das Lernen von Decks anderer Benutzer zu ermöglichen
		.single();

	if (deckError || !deck) {
		throw error(404, 'Deck not found.');
	}

	const { data: cards, error: cardsError } = await supabase
		.from('cards')
		.select('*')
		.eq('flashdeck_id', params.id)
		.order('created_at', { ascending: true }); // For example, load cards in creation order

	if (cardsError) {
		console.error('Error loading cards for the learning session:', cardsError);
		throw error(500, 'Cards for the learning session could not be loaded.');
	}

	return {
		deck: deck as Tables<'decks'>,
		cards: (cards || []) as Tables<'cards'>[], // Ensure cards is always an array
		deckId: params.id,
		isOwner: deck.user_id === session.user.id // Keep flag in case the UI differs for owners
	};
};
