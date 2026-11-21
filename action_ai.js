
const { GoogleGenAI } = require("@google/genai")
const {getHandsFromHistory} = require("./action_ai_history");

const ai = new GoogleGenAI({ apiVersion: "v1beta",  apiKey: process.env.GEMINI_API_KEY});

module.exports = {
    async getAction(table, botPlayer) {
        let passiveActions = []
        if (table.maxRoundBet > botPlayer.totalRoundBet) {
            passiveActions = {allIn: "All-in", fold: "Fold", call: "Call"}
        } else {
            passiveActions = {allIn: "All-in", check: "Check"}
        }

        // offer gemini-decisions various options to bet/raise chips
        const raiseActions = () => {
            if (botPlayer.stack <= table.maxRoundBet) {
                return {} // only all-in is available
            }
            let chips = [table.bigBlind, table.bigBlind * 2, table.bigBlind * 3,
            table.totalPot / 2, table.totalPot * 3 /4, table.totalPot]
                .map(v => Math.floor(v))
                .filter(v => v < botPlayer.stack)
            let unique = new Set(chips)
            return Object.fromEntries([...unique].sort().map(v => [`raise${v}`, `Bet ${v} chips`]))
        }

        // saving those input tokens
        const playersToSend = table.seats.map(v => v.player).filter(p => !!p).map(p => ({
            blind: p.blind,
            position: p.position,
            stack: p.stack,
            liveBetChips: p.totalRoundBet,
            cards: p.cards
        }))

        let tableToSend = {
            bigBlind: table.bigBlind,
            totalPot: table.totalPot,
            communityCards: table.communityCards,
            players: playersToSend
        }

        const opponentUserIds = table.seats
            .filter(s => !!s.player && s.player.userId !== botPlayer.userId)
            .map(s => s.player.userId)

        let historyData = ""
        for (let uid of opponentUserIds) {
            let hands = getHandsFromHistory(uid)
            if (!!hands && hands.length > 0) {
                historyData += `Previous hands of user(${uid}) JSON: ${JSON.stringify(hands)}. `
            }
        }

        const geminiInput = `Poker Texas Hold'em decision. Your table position is ${botPlayer.position}. ${historyData} Table JSON: ${JSON.stringify(tableToSend)}`
        if (!!process.env.DEBUG) {
            console.log("Sending input to Gemini", geminiInput)
        }

        const result = await ai.decisions.create({
            model: "gemini-decision-1",
            input: geminiInput,
            questions: {
                action: {
                    type: "choice",
                    instructions: "Your choice",
                    criteria: {...passiveActions, ...raiseActions()},
                },
            },
        });

        const answer = result.answers?.action;
        if (answer?.type === "choice") {
            let choice = answer?.choice
            if (choice.startsWith("raise")) {
                const num = Number(choice.replace(/\D/g, ""));
                if (table.maxRoundBet === 0) {
                    return {action: "bet", chips: num}
                } else {
                    return {action: "raise", chips: num}
                }
            } else {
                return {action: choice, chips: 0}
            }
        }

        console.log("No choice, defaulting to check/fold", result)
        if (passiveActions.includes("check")) {
            return {action: "check", chips: 0}
        } else {
            return {action: "fold", chips: 0};
        }
    },
}