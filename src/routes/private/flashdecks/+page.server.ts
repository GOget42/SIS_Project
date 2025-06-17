import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TablesInsert } from '$lib/database.types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	const { data: myDecks, error: myDecksError } = await supabase
		.from('decks')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (myDecksError) {
		console.error('Error fetching user decks:', myDecksError);
		throw error(500, 'Could not fetch your decks.');
	}

	const { data: otherDecks, error: otherDecksError } = await supabase
		.from('decks')
		.select('*')
		.neq('user_id', userId)
		.order('created_at', { ascending: false });

	if (otherDecksError) {
		console.error('Error fetching other decks:', otherDecksError);
		throw error(500, 'Could not fetch other decks.');
	}

	return { myDecks, otherDecks };
};

export const actions: Actions = {
	createDeck: async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			throw error(401, 'Unauthorized');
		}
		const userId = session.user.id;

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const description = formData.get('description') as string | null;

		if (!name || name.trim() === '') {
			return fail(400, { success: false, message: 'Deck name is required.', name, description });
		}

		const newDeck: TablesInsert<'decks'> = {
			name: name.trim(),
			description: description?.trim() || null,
			user_id: userId
		};

		const { data, error: insertError } = await supabase
			.from('decks')
			.insert(newDeck)
			.select()
			.single();

		if (insertError) {
			console.error('Error creating deck:', insertError);
			return fail(500, { success: false, message: 'Failed to create deck.', name, description });
		}
		return { success: true, message: 'Deck created successfully!', createdDeck: data };
	},

	deleteDeck: async ({ request, locals: { supabase, getSession } }) => {
		const session = await getSession();
		if (!session) {
			throw error(401, 'Unauthorized');
		}
		const userId = session.user.id;

		const formData = await request.formData();
		const deckId = formData.get('flashdeck_id') as string;

		if (!deckId) {
			return fail(400, { success: false, message: 'Deck ID is required.' });
		}

		// Verify ownership
		const { data: deck, error: fetchError } = await supabase
			.from('decks')
			.select('user_id, flashdeck_id')
			.eq('flashdeck_id', deckId)
			.single();

		if (fetchError || !deck) {
			console.error('Error fetching deck for deletion or deck not found:', fetchError);
			return fail(404, { success: false, message: 'Deck not found or error fetching deck.' });
		}

		if (deck.user_id !== userId) {
			return fail(403, { success: false, message: 'You are not authorized to delete this deck.' });
		}

		// Delete associated cards first
		// Note: 'flashdeck_id' in 'cards' table refers to 'flashdeck_id' in 'decks' table.
		const { error: cardsDeleteError } = await supabase
			.from('cards')
			.delete()
			.eq('flashdeck_id', deck.flashdeck_id);

		if (cardsDeleteError) {
			console.error('Error deleting cards for deck:', cardsDeleteError);
			return fail(500, { success: false, message: 'Failed to delete associated cards.' });
		}

		// Delete the deck
		const { error: deckDeleteError } = await supabase
			.from('decks')
			.delete()
			.eq('flashdeck_id', deck.flashdeck_id);

		if (deckDeleteError) {
			console.error('Error deleting deck:', deckDeleteError);
			return fail(500, { success: false, message: 'Failed to delete deck.' });
		}

		return { success: true, message: 'Deck deleted successfully.' };
	}
};
