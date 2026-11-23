function mergeTable(oldTable, newTable) {
  if (oldTable == null) {
    return newTable
  }

  if (newTable === undefined || newTable === null) {
    return oldTable
  }

  let mergedTable = {}
  Object.assign(mergedTable, oldTable, newTable)
  mergedTable.seats = oldTable.seats
  if (newTable.seats) {
    if (!oldTable.seats) {
      mergedTable.seats = newTable.seats
      return mergedTable
    }
    newTable.seats.forEach(newSeat => {
      let position = newSeat.position
      let oldSeat = oldTable.seats[position]
      let mergedSeat = {}
      Object.assign(mergedSeat, oldSeat, newSeat)
      mergedTable.seats[position] = mergedSeat
      if (oldSeat) {
        mergedTable.seats[position].player = oldSeat.player
      }
    })

    newTable.seats.filter(s => s.player !== undefined).forEach(newSeat => {
      let position = newSeat.position
      let newPlayer = newSeat.player
      if (newPlayer === null) {
        mergedTable.seats[position].player = null
        return
      }

      let oldPlayer = oldTable.seats[position].player
      let mergedPlayer = {}
      Object.assign(mergedPlayer, oldPlayer, newPlayer)
      mergedTable.seats[position].player = mergedPlayer
    })
  }
  return mergedTable
}

module.exports = { mergeTable }