const action1 = require('./action_1');
const HoleCards = require('./holeCards')

test('highest pair, should bet', () => {
  const table = {
    size: 2,
    communityCards: ["3c", "Jc", "5h"],
    bigBlind: 2,
    maxRoundBet: 0,
    totalPot: 4,
    pots: [{chips: 4}]
  }

  const botPlayer = {
    totalRoundBet: 0,
    stack: 250,
    cards: ["Js", "7d"]
  }

  const result = action1.getAction(table, botPlayer)
  expect(result.action).toBe("bet")
  expect(result.chips).toBe(4)
});

test('three of a kind, bot should bet', () => {
  const table = {
    size: 2,
    communityCards: ["Kh", "Js", "3s", "2d", "3h"],
    bigBlind: 2,
    maxRoundBet: 0,
    totalPot: 10,
    pots: [{chips: 10}]
  }

  const botPlayer = {
    totalRoundBet: 0,
    stack: 250,
    cards: ["Ah", "3d"]
  }

  const result = action1.getAction(table, botPlayer)
  expect(result.action).toBe("bet")
  expect(result.chips).toBeGreaterThanOrEqual(6)
});

test('undefined action', () => {
  const table = {
    id: '5f95b6800088c27779c29d0e',
    name: 'Awesome Table',
    size: 6,
    bigBlind: 2,
    smallBlind: 1,
    decisionTimeoutSec: 10,
    minBuyIn: 100,
    maxBuyIn: 400,
    occupied: 4,
    avgStake: 0,
    avgPot: 0,
    seats: [
      { position: 0, blind: 'bigBlind', player: [Object] },
      { position: 1, blind: '', player: null },
      { position: 2, blind: '', player: null },
      { position: 3, blind: '', player: [Object] },
      { position: 4, blind: 'dealer', player: [Object] },
      { position: 5, blind: 'smallBlind', player: [Object] }
    ],
    status: 'playing',
    maxRoundBet: 2,
    pot: 0,
    pots: [ { chips: 0 } ],
    totalPot: 3,
    communityCards: [],
    decidingPosition: 5,
    lastAggressorPosition: -1,
    winners: []
  }

  const botPlayer = {
    userId: '99X946nLkJUWnSIYWHqPDku8bMG2',
    username: 'prince-charming',
    picture: 'https://storage.googleapis.com/pokerblow-avatars/99X946nLkJUWnSIYWHqPDku8bMG2',
    position: 5,
    stack: 249,
    status: 'playing',
    blind: 'smallBlind',
    totalRoundBet: 1,
    lastGameBet: 1,
    lastGameAction: '',
    showDownAction: null,
    intent: null,
    cards: [ '3d', '6h' ],
    timeoutAt: 1604759243618
  }


  const result = action1.getAction(table, botPlayer)
  expect(result).not.toBeUndefined()
});

test('flush', () => {
  const table = {
    size: 2,
    communityCards: ["Ks", "Js", "6s", "3s", "3h"],
    bigBlind: 2,
    maxRoundBet: 0,
    totalPot: 10,
    pots: [{chips: 10}]
  }

  const botPlayer = {
    totalRoundBet: 0,
    stack: 250,
    cards: ["As", "8d"]
  }

  const result = action1.getAction(table, botPlayer)
  expect(result.action).toBe("bet")
  expect(result.chips).toBeGreaterThanOrEqual(20)
});

test('flush bot two cards', () => {
  const table = {
    size: 2,
    communityCards: ["Ks", "Js", "6s", "2d", "3h"],
    bigBlind: 2,
    maxRoundBet: 0,
    totalPot: 10,
    pots: [{chips: 10}]
  }

  const botPlayer = {
    totalRoundBet: 0,
    stack: 250,
    cards: ["7s", "3s"]
  }

  const result = action1.getAction(table, botPlayer)
  expect(result.action).toBe("bet")
  expect(result.chips).toBeGreaterThanOrEqual(20)
});

test('randPositiveNumber', () => {
  for (let i = 0; i < 100; i++) {
    let num = action1.randPositiveNum(1);
    expect(num === 0 || num === 1).toBeTruthy()
  }
});

