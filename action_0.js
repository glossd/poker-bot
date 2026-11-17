module.exports = {
  getAction(table, botPlayer) {
    let action
    if (table.maxRoundBet > botPlayer.totalRoundBet) {
      action = ["call", "call", "call", "raise"][Math.floor(Math.random() * 4)]
    } else {
      action = ["check", "check", "check", "bet"][Math.floor(Math.random() * 4)]
    }

    let chips = 0
    if (action === "bet") {
      chips = table.bigBlind + Math.floor(table.bigBlind * Math.random())
    } else if (action === "raise") {
      chips = table.maxRoundBet + 1 + Math.floor(table.bigBlind * Math.random() * 2)
    }

    if (botPlayer.stack <= chips || botPlayer.stack <= table.maxRoundBet) {
      action = "allIn"
      chips = 0
    }

    if ((table.totalPot <= 3 * table.maxRoundBet && table.maxRoundBet > 3 * botPlayer.totalRoundBet) && Math.floor(Math.random() * 2) === 1) {
      action = "fold"
      chips = 0
    }
    return {action, chips};
  }
}