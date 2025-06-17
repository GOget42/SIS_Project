import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { Tables } from "$lib/database.types";

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, params }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, "/");
	}

	const { data: deck, error: deckError } = await supabase
		.from("decks")
		.select(`*, user_id`) // user_id wird weiterhin selektiert, um den Eigentümer zu kennen
		.eq("flashdeck_id", params.id)
		// .eq("user_id", session.user.id) // Diese Zeile wird entfernt, um das Laden von Decks anderer Benutzer zu ermöglichen
		.single();

	if (deckError || !deck) {
		// Dies wird nun ausgelöst, wenn das Deck nicht existiert, unabhängig vom Eigentümer
		throw error(404, "Deck nicht gefunden.");
	}

	const { data: cards, error: cardsError } = await supabase
		.from("cards")
		.select("*")
		.eq("flashdeck_id", params.id)
		.order("created_at", { ascending: false });

	if (cardsError) {
		console.error("Fehler beim Laden der Karten:", cardsError);
		throw error(500, "Karten konnten nicht geladen werden.");
	}

	return {
		deck: deck as Tables<"decks">,
		cards: cards as Tables<"cards">[],
		deckId: params.id,
		isOwner: deck.user_id === session.user.id // Optional: Flag hinzufügen, ob der aktuelle Benutzer der Eigentümer ist
	};
};

export const actions: Actions = {
	createCard: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw redirect(303, "/");
		}

		const formData = await request.formData();
		const frontContent = formData.get("front_content") as string;
		const backContent = formData.get("back_content") as string;
		const deckId = params.id;

		if (!frontContent || !backContent) {
			return fail(400, {
				message: "Vorder- und Rückseite dürfen nicht leer sein.",
				success: false,
				frontContent,
				backContent,
			});
		}

		// Verify deck ownership before adding card
		const { data: deckOwner, error: deckOwnerError } = await supabase
			.from("decks")
			.select("user_id")
			.eq("flashdeck_id", deckId)
			.single();

		if (deckOwnerError || !deckOwner) {
			return fail(404, { message: "Deck nicht gefunden.", success: false });
		}

		if (deckOwner.user_id !== session.user.id) {
			return fail(403, {
				message: "Sie sind nicht berechtigt, Karten zu diesem Deck hinzuzufügen.",
				success: false,
			});
		}

		const { error: insertError } = await supabase.from("cards").insert({
			flashdeck_id: deckId,
			user_id: session.user.id, // Karten werden immer mit der ID des aktuellen Benutzers erstellt
			front_content: frontContent,
			back_content: backContent,
		});

		if (insertError) {
			console.error("Fehler beim Erstellen der Karte:", insertError);
			return fail(500, {
				message: "Karte konnte nicht erstellt werden: " + insertError.message,
				success: false,
				frontContent,
				backContent,
			});
		}

		return {
			message: "Karte erfolgreich erstellt!",
			success: true,
		};
	},

	updateCard: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw redirect(303, "/");
		}

		const formData = await request.formData();
		const cardId = formData.get("card_id") as string;
		const frontContent = formData.get("front_content") as string;
		const backContent = formData.get("back_content") as string;
		// const deckId = params.id; // Nicht direkt für die Kartenprüfung benötigt, da die Karte ihre eigene flashdeck_id hat

		if (!cardId || !frontContent || !backContent) {
			return fail(400, {
				message: "Karten-ID, Vorder- und Rückseite sind erforderlich.",
				success: false,
				cardId,
				frontContent,
				backContent,
			});
		}

		// Verify card ownership
		const { data: card, error: cardError } = await supabase
			.from("cards")
			.select("user_id, flashdeck_id")
			.eq("card_id", cardId)
			.single();

		if (cardError || !card) {
			return fail(404, { message: "Karte nicht gefunden.", success: false, cardId });
		}

		if (card.user_id !== session.user.id) {
			return fail(403, {
				message: "Sie sind nicht berechtigt, diese Karte zu bearbeiten.",
				success: false,
				cardId,
			});
		}
		// Optional: Zusätzliche Prüfung, ob die Karte zum aktuellen Deck gehört, falls params.id relevant ist
		if (card.flashdeck_id !== params.id) {
			return fail(403, {
				message: "Diese Karte gehört nicht zum aktuell angezeigten Deck.",
				success: false,
				cardId,
			});
		}


		const { error: updateError } = await supabase
			.from("cards")
			.update({ front_content: frontContent, back_content: backContent, updated_at: new Date().toISOString() })
			.eq("card_id", cardId);

		if (updateError) {
			console.error("Fehler beim Aktualisieren der Karte:", updateError);
			return fail(500, {
				message: "Karte konnte nicht aktualisiert werden: " + updateError.message,
				success: false,
				cardId,
				frontContent,
				backContent,
			});
		}

		return {
			message: "Karte erfolgreich aktualisiert!",
			success: true,
			updatedCardId: cardId,
		};
	},

	deleteCard: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw redirect(303, "/");
		}

		const formData = await request.formData();
		const cardId = formData.get("card_id") as string;
		// const deckId = params.id; // Ähnlich wie bei updateCard

		if (!cardId) {
			return fail(400, { message: "Karten-ID ist erforderlich.", success: false });
		}

		// Verify card ownership
		const { data: card, error: cardError } = await supabase
			.from("cards")
			.select("user_id, flashdeck_id")
			.eq("card_id", cardId)
			.single();

		if (cardError || !card) {
			return fail(404, { message: "Karte nicht gefunden.", success: false });
		}

		if (card.user_id !== session.user.id) {
			return fail(403, {
				message: "Sie sind nicht berechtigt, diese Karte zu löschen.",
				success: false,
			});
		}
		// Optional: Zusätzliche Prüfung
		if (card.flashdeck_id !== params.id) {
			return fail(403, {
				message: "Diese Karte gehört nicht zum aktuell angezeigten Deck und kann hier nicht gelöscht werden.",
				success: false,
			});
		}

		const { error: deleteError } = await supabase.from("cards").delete().eq("card_id", cardId);

		if (deleteError) {
			console.error("Fehler beim Löschen der Karte:", deleteError);
			return fail(500, {
				message: "Karte konnte nicht gelöscht werden: " + deleteError.message,
				success: false,
			});
		}

		return {
			message: "Karte erfolgreich gelöscht!",
			success: true,
			deletedCardId: cardId,
		};
	},
};