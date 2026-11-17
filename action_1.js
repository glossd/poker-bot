const Hand = require('pokersolver').Hand;
const HoleCards = require('./holeCards')

const call = {action: "call", chips: 0}
const check = {action: "check", chips: 0}
const fold = {action: "fold", chips: 0}
const allIn = {action: "allIn", chips: 0}

const logEnabled = process.env.LOG_ENABLED

let preFlopRaiseInRowCount = 0
const maxPreFlopRaiseInRow = 4

module.exports = {
  getAction(table, botPlayer) {
    const botCards = new HoleCards(botPlayer.cards)
    if (logEnabled) {
      console.log("Cards:", botCards)
    }
    const totalPot = table.totalPot

    let BB = table.bigBlind;
    let SB = table.smallBlind;
    if (isPreFlop()) {
      if (table.type === "cashGame" && preFlopRaiseInRowCount >= maxPreFlopRaiseInRow) {
        console.info("Tired of playing with a dirty player")
        return Object.assign(fold, {stand: true})
      }
      if (botCards.isPair() || (botCards.higher().isAce() && !botCards.lower().isWeek())) {
        if (randomFrom1To(10) === 3) {
          return allIn
        }
      }

      if (isSomeoneBet()) {
        if (table.maxRoundBet > BB) {
          preFlopRaiseInRowCount++
        }
        if (botCards.isStrongPair()) {
          return raiseOrAllIn(minRaise() + randomFrom1To(100*BB))
        }
        if (botCards.isMediumPair()) {
          return do1of4(callOrAllIn(), raiseOrAllIn(minRaise() + randomFrom1To(20*BB)))
        }
        if (botCards.isPair() || botCards.hasAce()) {
          return do1of3(callOrAllIn(), raiseOrAllIn(minRaise() + randomFrom1To(10*BB)))
        }
        if (table.maxRoundBet === BB) {
          if (botCards.higher().isStrong()) {
            return callOrAllIn()
          }
          if (botPlayer.blind === "smallBlind" || botPlayer.blind === "dealerSmallBlind") {
            return callOrAllIn()
          }
        }
        return foldOrCall()
      } else {
        // Bot is BigBlind e.g.
        if (botCards.isStrongPair()) {
          return betOrAllIn(randomFrom1To(400*BB))
        }

        if (botCards.isPair()) {
          return betOrAllIn(randomFrom1To(10*BB))
        }

        if (botCards.hasAce()) {
          return do1of2(check, betOrAllIn(randomFrom1To(5*BB)))
        }

        return check
      }
      function foldOrCall() {
        let diff = table.maxRoundBet - botPlayer.totalRoundBet;
        if (diff > 100*BB) {
          return do1ofX(callOrAllIn(), fold, 20)
        }
        if (diff > 50*BB) {
          return do1ofX(callOrAllIn(), fold, 10)
        }
        if (diff > 10*BB) {
          return do1ofX(callOrAllIn(), fold, 6)
        }
        if (diff > 5*BB) {
          return do1ofX(callOrAllIn(), fold, 4)
        }
        if (diff > 3*BB) {
          return do1ofX(callOrAllIn(), fold, 2)
        }
        if (diff > BB) {
          return do1of2(callOrAllIn(), fold)
        }
        return do1ofX(fold, callOrAllIn(), 3)
      }
    } else {
      preFlopRaiseInRowCount = 0
      if (botPlayer.blind === "dealer" || botPlayer.blind === "dealerSmallBlind") {
        // bluffing
        if (table.maxRoundBet === 0) {
          if (randFromZeroTo(20) === 1) {
            return randomOne(allIn, actionChips(randomFromXtoY(Math.floor(botPlayer.stack/2)), botPlayer.stack))
          }
        }
      }
      // Flop, Turn, River
      let res
      try {
        res = Hand.solve(table.communityCards.concat(botPlayer.cards))
      } catch(e) {
        console.error("Duplicate cards, communityCards: " + table.communityCards + ", botCards: " + botPlayer.cards)
        throw new Error("dup cards")
      }
      const communityRes = Hand.solve(table.communityCards)
      const bestHand = res.cards.map(c => c.toString())
      const descr = toParsableDescr(res.descr)
      if (logEnabled) {
        console.log("Combination:", res.name)
      }
      switch (res.name) {
        case "Straight Flush":
          if (botHasTwoCards()) {
            return allIn
          }
          if (botHasCard()) {
            return actionChips(orXBB(totalPot, randomFromXtoY(50, 200)))
          }
          break
        case "Four of a Kind":
          if (botHasCard()) {
            return actionChips(orXBB(totalPot, randomFromXtoY(50, 200)))
          }
          break
        case 'Full House':
          const faceOfThree = descr.charAt(res.name.length + 2)
          if (botCards.hasFace(faceOfThree)) {
            return actionChips(orXBB(totalPot, randomFromXtoY(20, 40)))
          }

          const faceOfTwo = res.descr.charAt(res.name.length +11)
          if (botCards.hasFace(faceOfTwo)) {
            return actionChips(orXBB(halfTotalPot(), randomFromXtoY(5, 10)))
          }

          break
        case 'Flush':
          const highestCard = descr.substring(7, 9)
          if (botCards.contains(highestCard)) {
            return actionChips(orXBB(totalPot, randomFromXtoY(10, 30)))
          }

          if (botHasTwoCards()) {
            return actionChips(orXBB(totalPot, randomFromXtoY(10, 20)))
          }

          if (botHasCard()) {
            let c = botBestHandCard()
            if (c.isStrong()) {
              return actionChips(or3BB(totalPot))
            }
            return callOrCheck()
          }
          break
        case 'Straight':
          if (botHasTwoCards()) {
            return actionChips(orXBB(totalPot, randomFromXtoY(10, 20)))
          }
          if (botHasCard()) {
            return actionChips(orXBB(halfTotalPot(), randomFromXtoY(5, 20)))
          }
          break
        case "Three of a Kind":
          const threeFace = descr.charAt(17)
          if (botCards.hasFaceBoth(threeFace)) {
            return actionChips(orXBB(totalPot, randomFromXtoY(5, 15)))
          }
          if (botCards.hasFace(threeFace)) {
            return actionChips(orXBB(halfTotalPot(), randomFromXtoY(3, 10)))
          }
          break
        case "Two Pair":
          const highFace = descr.charAt(10)
          const lowFace = descr.charAt(16)
          if (botCards.hasFace(highFace) && botCards.hasFace(lowFace)) {
            return actionChips(orXBB(totalPot, randomFromXtoY(3, 7)))
          }
          if (botCards.hasFace(highFace)) {
            return actionChips(2*BB)
          }
          if (botCards.hasFace(lowFace)) {
            return callOrCheck()
          }
          break
        case "Pair":
          const pairFace = descr.charAt(6)
          if (botCards.hasFace(pairFace)) {
            let card = botCards.findByFace(pairFace)
            let highestCommunityFace = communityRes.cardPool[0].value
            if (card.face() === highestCommunityFace) {
              return actionChips(2*BB)
            }

            if (!isSomeoneBet()) {
              if (card.isStrong()) {
                actionChips(orXBB(totalPot, randomFromXtoY(2, 5)))
              }
              if (card.isMiddle()) {
                return actionChips(randomFrom1To(2) * BB)
              }
            } else {
              return limitedCall()
            }
          }
          break
        default:
          break
      }
      return foldOrCheck()

      function foldOrCheck() {
        if (isSomeoneBet()) {
          if (table.totalPot > table.maxRoundBet*5 && !isRiver()) {
            return callOrAllIn()
          }
          return fold
        } else {
          return check
        }
      }

      function orXBB(chips, x) {
        return Math.max(chips, x*BB)
      }

      function or3BB(chips) {
        return Math.max(chips, 3*BB)
      }

      function or2BB(chips) {
        return Math.max(chips, 2*BB)
      }

      function halfTotalPot() {
        return Math.floor(table.totalPot / 2)
      }

      function botHasCard() {
        return botCards.containsAnyOf(bestHand);
      }

      function botBestHandCard() {
        return botCards.firstMatchingCard(bestHand)
      }

      function botHasTwoCards() {
        return botCards.containsAllOf(bestHand);
      }

      function actionChips(chips) {
        if (isSomeoneBet()) {
          const raiseAction = raiseOrAllIn(2*table.maxRoundBet - botPlayer.totalRoundBet + chips + randomOne(0, SB))
          if (raiseAction.chips === 0) {
            console.error("Got raise chips zero: ", table.maxRoundBet, botPlayer.totalRoundBet, chips)
          }
          if (botPlayer.totalRoundBet > 0) { // prevents from infinite raise
            return do1of3(raiseAction, callOrAllIn())
          }
          return raiseAction
        } else {
          if (isFlop()) {
            if (randFromZeroTo(3) === 2) {
              return check
            }
          }

          return betOrAllIn(chips)
        }
      }

      function limitedCall() {
        if (table.maxRoundBet > tablePotsSum()) {
          return fold
        }
        if (table.maxRoundBet > 3 * BB && totalPot < 2 * table.size * BB) {
          return fold
        }
        return callOrAllIn()
      }

      function callOrCheck() {
        if (isSomeoneBet()) {
          return limitedCall()
        } else {
          return check
        }
      }
    }

    function callOrAllIn() {
      if (table.maxRoundBet >= botPlayer.stack - botPlayer.totalRoundBet) {
        return allIn
      } else {
        return call
      }
    }

    function tablePotsSum() {
      if (!table.pots) {
        return 0
      }
      return table.pots.reduce((p1, p2) => p1.chips + p2.chips)
    }

    function minRaise() {
      return 2*table.maxRoundBet
    }

    function minBet() {
      return BB
    }

    function raiseOrAllIn(chips) {
      if (botPlayer.stack <= chips) {
        return {action: "allIn", chips: 0}
      }
      return {action: "raise", chips:  Math.floor(chips)}
    }

    function betOrAllIn(chips) {
      if (botPlayer.stack <= chips) {
        return {action: "allIn", chips: 0}
      }
      return {action: "bet", chips: Math.floor(chips)}
    }

    function isPreFlop() {
      return table.communityCards.length === 0;
    }

    function isFlop() {
      return table.communityCards.length === 3;
    }

    function isRiver() {
      return table.communityCards.length === 5;
    }

    function isSomeoneBet() {
      return table.maxRoundBet > botPlayer.totalRoundBet;
    }
  },
  randPositiveNum: randFromZeroTo,
}

function do1of2(a1, a2) {
  return randomOne(a1, a2)
}
function do1of3(a1, a2) {
  return randomOne(a1, a2, a2)
}
function do1of4(a1, a2) {
  return randomOne(a1, a2, a2, a2)
}
function do1ofX(a1, a2, x) {
  const arr = []
  for (let i = 0; i < x; i++) {
    arr.push(a2)
  }
  return randomOne(a1, ...arr)
}




function isFourOfSuit(cards) {
  const solve = Hand.solve(cards)
  for (const [key, value] of Object.entries(solve.suits)) {
    if (value.length >= 4) {
      return true
    }
  }
  return false
}

function toParsableDescr(descr) {
  return descr.split("10").join("T")
}

function randomOne(...arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randFromZeroTo(to) {
  return Math.floor(Math.random()*(to + 1))
}

function randomFrom1To(to) {
  return 1 + Math.floor(Math.random()*(to))
}

function randomFromXtoY(x, y) {
  return x + 1 + Math.floor(Math.random()*(y-x))
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}
