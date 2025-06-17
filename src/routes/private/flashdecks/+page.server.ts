import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { TablesInsert, Tables } from '$lib/database.types'; // Tables importiert

// Type for decks with creator name
type DeckWithCreator = Tables<'decks'> & { creator_name: string };

export const load: PageServerLoad = async ({ locals: { supabase, getSession } }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/login');
	}

	const userId = session.user.id;

	// Get user's decks
	const { data: myDecksData, error: myDecksError } = await supabase
		.from('decks')
		.select('*')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (myDecksError) {
		console.error('Error fetching user decks:', myDecksError);
		throw error(500, 'Could not fetch your decks.');
	}

	const myDecks: DeckWithCreator[] = myDecksData
		? myDecksData.map((deck) => ({ ...deck, creator_name: 'You' }))
		: [];

	// Get other decks created by other users
	const { data: otherDecksData, error: otherDecksError } = await supabase
		.from('decks')
		.select('*')
		.neq('user_id', userId)
		.order('created_at', { ascending: false });

	if (otherDecksError) {
		console.error('Error fetching other decks:', otherDecksError);
		throw error(500, 'Could not fetch other decks.');
	}

	let otherDecks: DeckWithCreator[] = [];
	if (otherDecksData && otherDecksData.length > 0) {
		const creatorIds = [...new Set(otherDecksData.map((deck) => deck.user_id))];
		const profilesMap = new Map<string, string>();

		// Get profiles of students
		const { data: studentProfiles, error: studentProfilesError } = await supabase
			.from('students')
			.select('user_id, first_name, last_name, email')
			.in('user_id', creatorIds);

		if (studentProfilesError) {
			console.warn('Error fetching student profiles:', studentProfilesError.message);
		} else if (studentProfiles) {
			studentProfiles.forEach((p) => {
				const name = p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : p.email;
				profilesMap.set(p.user_id, name);
			});
		}

		// Get profiles of instructors
		const { data: instructorProfiles, error: instructorProfilesError } = await supabase
			.from('instructors')
			.select('user_id, first_name, last_name, email')
			.in('user_id', creatorIds);

		if (instructorProfilesError) {
			console.warn('Error fetching instructor profiles:', instructorProfilesError.message);
		} else if (instructorProfiles) {
			instructorProfiles.forEach((p) => {
				const instructorName = p.first_name
					? `${p.first_name} ${p.last_name || ''}`.trim()
					: p.email;
				const existingName = profilesMap.get(p.user_id);
				if (
					!existingName ||
					(existingName &&
						existingName.includes('@') &&
						instructorName &&
						!instructorName.includes('@')) ||
					!profilesMap.has(p.user_id)
				) {
					profilesMap.set(p.user_id, instructorName);
				}
			});
		}

		otherDecks = otherDecksData.map((deck) => ({
			...deck,
			creator_name: profilesMap.get(deck.user_id) || 'Admin Account'
		}));
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
			return fail(400, {
				success: false,
				message: 'Deck name is required.',
				name,
				description,
				action: '?/createDeck'
			});
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
			return fail(500, {
				success: false,
				message: 'Failed to create deck.',
				name,
				description,
				action: '?/createDeck'
			});
		}
		return {
			success: true,
			message: 'Deck created successfully!',
			createdDeck: data,
			action: '?/createDeck'
		};
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

		// Check if the deck exists and belongs to the user
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

		// Delete associated cards
		const { error: cardsDeleteError } = await supabase
			.from('cards')
			.delete()
			.eq('flashdeck_id', deck.flashdeck_id);

		if (cardsDeleteError) {
			console.error('Error deleting cards for deck:', cardsDeleteError);
			return fail(500, { success: false, message: 'Failed to delete associated cards.' });
		}

		// Delete Deck
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
