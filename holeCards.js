const Card = require('./card')

module.exports = class HoleCards {
  f
  s
  constructor(cards) {
    this.f = new Card(cards[0])
    this.s = new Card(cards[1])
  }

  isPair() {
    return this.f.face() === this.s.face()
  }

  containsAnyOf(cards) {
    for (let card of cards) {
      if (this.contains(card)) {
        return true
      }
    }
  }

  firstMatchingCard(cards) {
    for (let card of cards) {
      if (this.contains(card)) {
        return new Card(card)
      }
    }
    return null
  }

  findByFace(face) {
    if (this.f.face() === face) {
      return this.f
    }
    if (this.s.face() === face) {
      return this.s
    }
    return null
  }

  containsAllOf(cards) {
    let count = 0
    for (let card of cards) {
      if (this.contains(card)) {
        count++
        if (count === 2) {
          return true
        }
      }
    }
    return false
  }

  contains(card) {
    return this.f.c === card || this.s.c === card
  }

  hasAce() {
    return this.hasFace('A')
  }

  hasKing() {
    return this.hasFace('K')
  }

  hasQueen() {
    return this.hasFace('Q')
  }

  hasJack() {
    return this.hasFace('J')
  }

  hasTen() {
    return this.hasFace('T')
  }

  hasNine() {
    return this.hasFace('9')
  }

  hasEight() {
    return this.hasFace('8')
  }

  hasSeven() {
    return this.hasFace('7')
  }

  hasFaceBoth(face) {
    return this.f.face() === face && this.s.face() === face
  }

  hasFace(face) {
    return this.f.face() === face || this.s.face() === face
  }

  isStrongPair() {
    if (this.isPair()) {
      return this.hasAce() || this.hasKing() || this.hasQueen() || this.hasJack()
    }
    return false
  }

  isMediumPair() {
    if (this.isPair()) {
      return this.hasTen() || this.hasNine() || this.hasEight() || this.hasSeven()
    }
    return false
  }

  higher() {
    if (this.f.faceRank() > this.s.faceRank()) {
      return this.f
    } else {
      return this.s
    }
  }

  lower() {
    if (this.f.faceRank() < this.s.faceRank()) {
      return this.f
    } else {
      return this.s
    }
  }
}