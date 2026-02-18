import { AutocompleteCommand } from "@sapphire/framework";
import axios from "axios";
import Sentry from "@sentry/node";

const TRELLO_KEY = process.env.TRELLO_KEY;
const TRELLO_TOKEN = process.env.TRELLO_TOKEN;
const ADDON = `?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`

const BOARD_ID = "5d7bf39ef8b32242a47999df"; // DOCM Permit Board
const LIST_IDS: string[] = [
    "5dfe6bcf594f9c2f0da5f3e2", // Standard Pemits
    "5dfe7cb7a7747e7b38603151", // Special Permits
    "695b00fa0f1f7c4b5cf8106f", // Expired/Invalid Permits
]

const CARD_NAME_EXCLUSIONS = [
    "All valid business permits are listed below.",
    "---",
    "-----",
    "-----------",
    "Permit Template",
    "NBP Participants - 6 Month Expiration",
    "All business permits on this list are founder-run in v2 or v3 or have some form of special approval.",
    "Foreign Recognized Permits",
    "Standard Permits - 3 Month Expiration",
]

let cachedCards: any[] | null = null;
let lastFetchTime: number = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes in milliseconds

async function retrieveAllPermitCards(span?: Sentry.Span) {
    const now = Date.now();

    span?.setAttribute("cache.lastFetchTime", lastFetchTime);
    span?.setAttribute("cache.ttl", CACHE_TTL);
    span?.setAttribute("cache.isCacheValid", cachedCards !== null && (now - lastFetchTime < CACHE_TTL));
    span?.setAttribute("cache.cachedCardsCount", cachedCards ? cachedCards.length : 0);

    span?.setAttribute("trello.boardId", BOARD_ID);
    span?.setAttribute("trello.listIds", LIST_IDS.join(","));
    span?.setAttribute("trello.cardNameExclusions", CARD_NAME_EXCLUSIONS.join(","));

    // 1. Check if we have valid cached data
    if (cachedCards && (now - lastFetchTime < CACHE_TTL)) {
        // console.log(`[CACHE] Returning ${cachedCards.length} cards from memory.`);
        return cachedCards;
    }

    // 2. If not, fetch from Trello
    try {
        const url = `https://api.trello.com/1/boards/${BOARD_ID}/cards`;
        span?.setAttribute("trello.url", url);

        // console.log(`[API] Fetching fresh data from Trello...`);
        const response = await axios({
            method: 'get',
            url: url + ADDON,
            params: { fields: "name,shortUrl,closed,idList" },
            headers: { "Content-Type": "application/json" }
        });

        const cards = response.data || [];

        span?.setAttribute("trello.cardsFetched", cards.length);
        
        // 3. Filter and store in cache
        const filteredCards = cards.filter((card: any) => 
            LIST_IDS.includes(card.idList) && 
            !card.closed && 
            !CARD_NAME_EXCLUSIONS.includes(card.name)
        );

        span?.setAttribute("trello.cardsAfterFilter", filteredCards.length);

        cachedCards = filteredCards;
        lastFetchTime = now;

        span?.setAttribute("cache.newFetchTime", lastFetchTime);
        span?.setAttribute("cache.newCachedCardsCount", cachedCards.length);

        // console.log(`[CACHE] Updated cache with ${filteredCards.length} cards.`);

        return filteredCards;
    } catch (error) {
        console.error("[ERROR] Trello fetch failed:", error);
        // If API fails, return the old cache as a fallback if it exists
        return cachedCards || [];
    }
}

export default async function retrievePermit(interaction: AutocompleteCommand | any, span?: Sentry.Span) {
    const cards = await retrieveAllPermitCards(span);

    // Discord expects: Array<{ name: string, value: string }>
    // We map the cards directly to this format
    const options = cards.map((card: any) => ({
        name: card.name, // What the user sees in Discord
        value: card.shortUrl   // What your bot receives when they click it
    }));

    // Optional: Filter the list based on what the user has typed so far
    // This is the "Auto" part of Autocomplete!
    const focusedValue = interaction.options.getFocused().toLowerCase();
    // console.log(`User is typing: ${focusedValue}, filtering ${options.length} options...`);

    span?.setAttribute("autocomplete.focusedValue", focusedValue);
    span?.setAttribute("autocomplete.optionsBeforeFilter", options.length);

    const filtered = options
        .filter(option => option.name.toLowerCase().includes(focusedValue))
        .slice(0, 25); // Discord allows a maximum of 25 choices

    span?.setAttribute("autocomplete.optionsAfterFilter", filtered.length);

    return filtered;
}