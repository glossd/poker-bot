

// userId -> Array<OpponentHand>
const history = new Map()

class OpponentHand {
    communityCards
    holeCards
    startingStack
    actions
}

module.exports = {
    remember(event, botUserId, table) {
        // remember everyone except the bot

        if (event.type === "blinds") {
            for (let seat of event.payload?.table?.seats) {
                if (!!seat && !!seat.player && seat.player.userId !== botUserId) {
                    if (!setStartingStack(seat.player.userId, seat.player.stack)) {
                        // the player could have left the table before the reset comes,
                        // and newHand requires userId. So it is lazy-initialized.
                        newHand(seat.player.userId)
                        setStartingStack(seat.player.userId, seat.player.stack)
                    }
                }
            }
        }

        if (event.type === "playerAction") {
            const p = event.payload?.table?.seats[0]?.player
            if (p.userId !== botUserId) {
                let action = p.lastGameAction
                if (action === "raise" || action === "bet") {
                    action += ` ${p.lastGameBet}`
                }
                addAction(p.userId, action)
            }
        }
        if (event.type === "showDown") {
            const p = event.payload?.table?.seats[0]?.player
            if (p.userId !== botUserId) {
                setHoleCards(p.userId, p.cards)
            }
        }

        if (event.type === "winners") {
            for (let seat of table?.seats) {
                if (!!seat && !!seat.player && seat.player.userId !== botUserId) {
                    setCommunityCards(seat.player.userId, event.payload?.table?.communityCards)
                }
            }
        }
    },
    getHandsFromHistory(userId) {
        return history.get(userId)
    }
}

function addAction(userId, action) {
    let hands = history.get(userId)
    if (!hands || hands.length === 0) {
        hands = [new OpponentHand()]
        history.set(userId, hands)
    }
    const current = hands.at(-1)
    current.actions = current.actions || []
    current.actions.push(action)
}

function setStartingStack(userId, chips) {
    let hands = history.get(userId)
    if (!hands || hands.length === 0) {
        hands = [new OpponentHand()]
        history.set(userId, hands)
    }
    if (hands.at(-1).startingStack > 0) {
        return false
    }

    hands.at(-1).startingStack = chips
    return true
}

function setCommunityCards(userId, cards) {
    let hands = history.get(userId)
    if (!hands || hands.length === 0) {
        hands = [new OpponentHand()]
        history.set(userId, hands)
    }
    hands.at(-1).communityCards = cards
}

function setHoleCards(userId, cards) {
    let hands = history.get(userId)
    if (!hands || hands.length === 0) {
        hands = [new OpponentHand()]
        history.set(userId, hands)
    }
    hands.at(-1).holeCards = cards
}

function newHand(userId) {
    let hands = history.get(userId)
    if (!hands) {
        hands = []
        history.set(userId, hands)
    }
    hands.push(new OpponentHand())
    if (hands.length > 10) {
        hands.shift()
    }
}
