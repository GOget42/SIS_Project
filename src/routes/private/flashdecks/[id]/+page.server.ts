import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Tables } from '$lib/database.types';

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, params }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/');
	}

	const { data: deck, error: deckError } = await supabase
		.from('decks')
		.select(`*, user_id`) // keep user_id so we know the owner
		.eq('flashdeck_id', params.id)
		// .eq("user_id", session.user.id) // This line was removed to allow loading decks from other users
		.single();

	if (deckError || !deck) {
		// This is now triggered if the deck does not exist, regardless of owner
		throw error(404, 'Deck nicht gefunden.');
	}

	const { data: cards, error: cardsError } = await supabase
		.from('cards')
		.select('*')
		.eq('flashdeck_id', params.id)
		.order('created_at', { ascending: false });

	if (cardsError) {
		console.error('Fehler beim Laden der Karten:', cardsError);
		throw error(500, 'Cards could not be loaded.');
	}

	return {
		deck: deck as Tables<'decks'>,
		cards: cards as Tables<'cards'>[],
		deckId: params.id,
		isOwner: deck.user_id === session.user.id // Optional flag indicating whether the current user is the owner
	};
};

export const actions: Actions = {
	createCard: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw redirect(303, '/');
		}

		const formData = await request.formData();
		const frontContent = formData.get('front_content') as string;
		const backContent = formData.get('back_content') as string;
		const deckId = params.id;

		if (!frontContent || !backContent) {
			return fail(400, {
				message: 'Front and back must not be empty.',
				success: false,
				frontContent,
				backContent
			});
		}

		// Verify deck ownership before adding card
		const { data: deckOwner, error: deckOwnerError } = await supabase
			.from('decks')
			.select('user_id')
			.eq('flashdeck_id', deckId)
			.single();

		if (deckOwnerError || !deckOwner) {
			return fail(404, { message: 'Deck nicht gefunden.', success: false });
		}

		if (deckOwner.user_id !== session.user.id) {
			return fail(403, {
				message: 'You are not authorized to add cards to this deck.',
				success: false
			});
		}

		const { error: insertError } = await supabase.from('cards').insert({
			flashdeck_id: deckId,
			user_id: session.user.id, // Karten werden immer mit der ID des aktuellen Benutzers erstellt
			front_content: frontContent,
			back_content: backContent
		});

		if (insertError) {
			console.error('Error creating card:', insertError);
			return fail(500, {
				message: 'Could not create card: ' + insertError.message,
				success: false,
				frontContent,
				backContent
			});
		}

		return {
			message: 'Card created successfully!',
			success: true
		};
	},

	updateCard: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw redirect(303, '/');
		}

		const formData = await request.formData();
		const cardId = formData.get('card_id') as string;
		const frontContent = formData.get('front_content') as string;
		const backContent = formData.get('back_content') as string;
		// const deckId = params.id; // Not required directly for card verification since the card has its own flashdeck_id

		if (!cardId || !frontContent || !backContent) {
			return fail(400, {
				message: 'Card ID, front and back are required.',
				success: false,
				cardId,
				frontContent,
				backContent
			});
		}

		// Verify card ownership
		const { data: card, error: cardError } = await supabase
			.from('cards')
			.select('user_id, flashdeck_id')
			.eq('card_id', cardId)
			.single();

		if (cardError || !card) {
			return fail(404, { message: 'Card not found.', success: false, cardId });
		}

		if (card.user_id !== session.user.id) {
			return fail(403, {
				message: 'You are not authorized to edit this card.',
				success: false,
				cardId
			});
		}
		// Optional extra check to ensure the card belongs to the current deck if params.id is relevant
		if (card.flashdeck_id !== params.id) {
			return fail(403, {
				message: 'This card does not belong to the currently displayed deck.',
				success: false,
				cardId
			});
		}

		const { error: updateError } = await supabase
			.from('cards')
			.update({
				front_content: frontContent,
				back_content: backContent,
				updated_at: new Date().toISOString()
			})
			.eq('card_id', cardId);

		if (updateError) {
			console.error('Fehler beim Aktualisieren der Karte:', updateError);
			return fail(500, {
				message: 'Could not update card: ' + updateError.message,
				success: false,
				cardId,
				frontContent,
				backContent
			});
		}

		return {
			message: 'Card updated successfully!',
			success: true,
			updatedCardId: cardId
		};
	},

	deleteCard: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw redirect(303, '/');
		}

		const formData = await request.formData();
		const cardId = formData.get('card_id') as string;
		// const deckId = params.id; // Ähnlich wie bei updateCard

		if (!cardId) {
			return fail(400, { message: 'Karten-ID ist erforderlich.', success: false });
		}

		// Verify card ownership
		const { data: card, error: cardError } = await supabase
			.from('cards')
			.select('user_id, flashdeck_id')
			.eq('card_id', cardId)
			.single();

		if (cardError || !card) {
			return fail(404, { message: 'Karte nicht gefunden.', success: false });
		}

		if (card.user_id !== session.user.id) {
			return fail(403, {
				message: 'You are not authorized to delete this card.',
				success: false
			});
		}
		// Optional additional check
		if (card.flashdeck_id !== params.id) {
			return fail(403, {
				message:
					'This card does not belong to the currently displayed deck and cannot be deleted here.',
				success: false
			});
		}

		const { error: deleteError } = await supabase.from('cards').delete().eq('card_id', cardId);

		if (deleteError) {
			console.error('Error deleting card:', deleteError);
			return fail(500, {
				message: 'Could not delete card: ' + deleteError.message,
				success: false
			});
		}

		return {
			message: 'Card deleted successfully!',
			success: true,
			deletedCardId: cardId
		};
	}
};
