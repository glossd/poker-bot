const tableClient = require("@pokergloss/table-client-typescript")
const tableChatClient = require("@pokergloss/table-chat-client-typescript")
const axios = require('axios')
const WebSocket = require('ws');
const action0 = require('./action_0')
const action1 = require('./action_1')
const actionAI = require('./action_ai')
const actionAiHistory = require('./action_ai_history')
const {startServer} = require('./server')

let basePath = "https://api.pokergloss.com/api/table"
if (process.env.DEV) {
  basePath = "http://dev.pokerblow.com/api/table"
}
if (process.env.LOCAL) {
  basePath = "http://localhost:8080/api/table"
}

const api = new tableClient.DefaultApi(undefined, basePath)
const apiChat = new tableChatClient.DefaultApi(undefined, basePath)

const botUserIds = [
  "NFcGNU0kymZGZDZwAfI5gPL0cls1", // 0 nice-fella
  "SnNDsJNYlbd2ESH7zeFGDNJjqEx2", // 1 crazy-mary
  "Cy6mWYo5LEdtNUyxp4H5F96p9Os2", // 2 devil
  "DnK2gpyoOPfuprKotkjTeAy2ARS2", // 3 pigeon
  "99X946nLkJUWnSIYWHqPDku8bMG2", // 4 prince-charming
  "bmO68rNtnjfziNkeQH41kPboXi83", // 5 eminem
  "lQv64rP51qUOy1YrKMs6riylDn93", // 6 candyman
  "7HVagFKH6iffsJjZtnFBa7DAZ372", // 7 lady
  "4MCCeRe2fgcawNUbAhaAO8Zu8nw2", // 8 legend
]

const userIdIdx = process.env.BOT_USER_IDX ? parseInt(process.env.BOT_USER_IDX) : -1
let theUserId = process.env.USER_ID
const botEmail = process.env.BOT_EMAIL
const botPassword = process.env.BOT_PASSWORD
const randAlg = () => [0, 1, 1, 1][Math.floor(Math.random()*4)]
const algorithm = process.env.ALG ? parseInt(process.env.ALG) : randAlg()

const userId = () => {
  if (theUserId) {
    return theUserId
  }
  return botUserIds[userIdIdx]
}


const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const config = {
  apiKey: 'AIzaSyD8vmB6kGZOLHZBNYwd3JLDKd388-DpN9Q',
  authDomain: 'pokerblow.firebaseapp.com',
  projectId: "pokerblow",
  databaseURL: "https://pokerblow.firebaseio.com",
  storageBucket: "pokerblow.appspot.com",
  messagingSenderId: "382776642412",
  appId: "1:382776642412:web:18ad5dc1371399f9140149"
};
const { initializeApp } = require("firebase/app");
const app = initializeApp(config);
const auth = getAuth(app);

async function loginAndGetToken(email, password) {
  try {
    // 1. Authenticate the user with email and password
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    theUserId = user.uid

    // 2. Retrieve the JWT ID token
    const idToken = await user.getIdToken();

    console.log("Successfully signed in!");
    if (!!process.env.DEBUG) {
      console.log("ID Token:", idToken);
    }

    // TODO: Send `idToken` to your backend via headers (e.g., Authorization: Bearer <token>)
    return idToken;

  } catch (error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error(`Login failed [${errorCode}]: ${errorMessage}`);
    throw error;
  }
}

const botTableIds = ["5f95b6800088c27779c29d0e", "5f96a7029dd0d5d97b87d4e7"]
const randTableId = () => botTableIds[Math.floor(Math.random()*botTableIds.length)]
let table = null
let idTokenGlobal = null
let tableId = process.env.TABLE_ID ? process.env.TABLE_ID : randTableId();
let botPosition = -1
let gameType = process.env.GAME_TYPE ? process.env.GAME_TYPE : "table"

async function main() {
  timeoutExit()

  startServer(() => {return stand(botPosition)}).catch(e => { console.error(e); process.exit(1) })

  if (!botEmail && gameType === 'table') { // this allows scaling, meaning no need to specify bot
    if (userIdIdx === -1) {
      tableId = randTableId()
      const res = await api.getTables(0, botTableIds.length)
      const botTables = res.data
      const allTablesPlayerIds = botTables.flatMap(table => table.seats).filter(seat => seat.player).map(seat => seat.player.userId)
      const allPlayerIdsSet = new Set(allTablesPlayerIds)
      const availableBotUserIds = botUserIds.filter(uid => !allPlayerIdsSet.has(uid))
      theUserId = availableBotUserIds[Math.floor(Math.random()*availableBotUserIds.length)]
      if (!theUserId) {
        console.error("Bot user ID not found")
        process.exit(1)
      }
    }
  }

  await fetchIdToken()
  fetchDalyBonus()

  if (!idTokenGlobal) {
    console.error("ID token missing")
    process.exit(1)
  }

  if (gameType === 'multiLobby') {
    await api.registerMulti(tableId, reqConf()).catch(e => console.log("Register failed"))
    const ws = new WebSocket(`${host()}/api/ws/news?token=${idTokenGlobal}`)
    ws.on("open", () => {
      console.info("user ws opened")
    })
    ws.on('message', (data) => {
      console.log("User socket message ", data)
      let msgs = data.split(/\n/)
      for (let data of msgs) {
        const events = JSON.parse(data)
        for (let event of events) {
          if (event.type === 'multiGameStart') {
            ws.close()
            gameType = "table"
            tableId = event.payload.tableId
            connect()
          }
        }
      }
    })
    ws.on('close', () => {
      console.info('user socket close');
      setTimeout(connect, 1000 * tries);
    })

    ws.on('error', async (error) => {
      console.error("User socket error:", error)
    })
    return
  }

  if (gameType === 'sitngoLobby') {
    const res = await api.getFullSitngoLobby(tableId)
    const lobby = res.data
    const players = new Map()
    for (let entry of lobby.entries) {
      players.set(entry.position, entry)
    }
    let position = -1
    for (let i = 0; i < lobby.lobbyTable.size; i++) {
      let p = players.get(i);
      if (!p) {
        position = i
        break
      }
    }

    if (position === -1) {
      console.log("Sitngo lobby is full")
      process.exit(0)
    }

    api.registerForSitAndGo(tableId, {position}, reqConf()).catch(e => console.error("Register failed", e.response))
  }

  connect()
}

function timeoutExit() {
  setTimeout(() => {
    api.stand(tableId, botPosition, reqConf())
      .then(() => {
        console.log("Timeout exit")
        process.exit(0)
      })
      .catch(() => {
        console.error("Timeout exit")
        process.exit(0)
      })
  }, 120*60*1000)
}

main()

function stand(posFrom) {
  return api.stand(tableId, posFrom, reqConf()).catch(e => console.log("Stand failed"))
}

function takeRandomSeat() {
  console.log("Taking random seat")
  const seatsFree = table.seats.filter(s => !s.player)
  if (seatsFree.length === 0) {
    console.log(`Table ${tableId} is full`)
    process.exit(0)
  }
  botPosition = seatsFree[Math.floor(Math.random()*seatsFree.length)].position
  api.reserveSeatV2(tableId, botPosition, reqConf())
    .then(() => {
      buyInNow()
    })
    .catch(e => {
      console.error("Seat reserve failed", e)
      process.exit(1)
    })
}

function buyInNow() {
  api.buyInV2(tableId, botPosition, {stack: table.bigBlind*200}, reqConf()).catch(e => {
    const msg = e.response?.data?.message || e.message
    console.error("Buy-in failed:", msg)
    if (msg.includes("not enough chips") || msg.includes("insufficient")) {
      console.log("Insufficient balance!")
      // send an alert with a message
      process.exit(1)
    } else {
      process.exit(1)
    }
  })
}


async function connect() {
  if (tableWs === undefined) {
    return
  }
  switch (gameType) {
    case "table":
      const res = await api.getFullTable(tableId, reqConf()).catch((e) => console.error("Get table failed", e))
      table = res.data
      onInit().catch(async (e) => {
        console.error("onInit failed:", e)
        if (`${e}`.endsWith("401")) {
          console.error("401, refreshing token")
          await fetchIdToken()
        }
        setTimeout(connect, 1000)
      })
  }

  wsConnect()
}

let tries = 1
async function onInit() {
  console.log("Table onInit")
  const players = table.seats.filter(s => s.player).map(s => s.player)
  const bot = players.find(p => p.userId === userId())
  if (bot) {
    console.log("Bot already sitting at the table id=" + table.id)
    if (bot.status === 'playing') {
      botPosition = bot.position
      if (table.decidingPosition === botPosition) {
        await makeBotAction(table, bot)
      }
    } else if (bot.status === 'sittingOut') {
      botPosition = bot.position
      if (bot.stack > 0) {
        await api.backToGame(tableId, botPosition, reqConf())
          .catch(e => console.error("Sitback failed", e))
      } else {
        await buyInNow()
      }
    } else {
      if (table.type === "cashGame") {
        console.info("standing from position ", bot.position)
        await stand(bot.position).then(() => {
          takeRandomSeat()
        })
      }
    }
  } else {
    takeRandomSeat()
  }
}

function host() {
  let host = "wss://api.pokergloss.com"
  if (process.env.DEV) {
    host = "ws://dev.pokergloss.com"
  }
  if (process.env.LOCAL) {
    host = "ws://localhost:4040"
  }
  return host;
}

let tableWs = null

function setNewTableWs(url) {
  if (tableWs === undefined) {
    return
  }
  if (tableWs !== null) {
    tableWs.close()
  }
  tableWs = new WebSocket(url)
}

function wsConnect() {
  let url = `${host()}/api/table-stream/tables/${tableId}?token=${idTokenGlobal}`;
  setNewTableWs(url)

  tries += 1

  tableWs.on('open', () => {
    console.log('socket open');
  })

  tableWs.on('message', (data) => {
    let msgs = data.split(/\n/)
    for (let data of msgs) {
      const events = JSON.parse(data)
      for (let event of events) {
        table = mergeTable(table, event.payload.table)

        if (event.type === 'multiPlayerMove') {
          tableWs.close()
          tableWs = null
          tableId = event.payload.tableId
          connect()
        }
        if (event.type === 'sitngoGameStart') {
          tableWs.close()
          tableWs = null
          gameType = "table"
          tableId = event.payload.table.id
          connect()
        }

        actionAiHistory.remember(event, theUserId, table)

        if (event.type === "playerLeft" && event.payload.leftPlayer && event.payload.leftPlayer.position === botPosition) {
          setTimeout(() => process.exit(0), 30*1000)
        }
        if (event.type === "timeToDecide" && event.payload.table.seats[0].position === botPosition) {
          let botPlayer = table.seats[botPosition].player
          if (botPlayer.userId !== userId()) {
            return
          }

          makeBotAction(table, botPlayer).catch(e => console.error("Failed to makeBotAction", e))
        }
        if (event.type === "reset") {
          if (botPosition >= 0 && table.seats[botPosition]) {
            if (!table.seats[botPosition].player || table.seats[botPosition].player.stack === 0) {
              apiChat.postMessage(table.id, {text: "Nice hand, well played!"}, reqConf())
                  .catch(e => console.error("Sending message failed", e))
              console.info("Buying in")
              setTimeout(() => {
                buyInNow()
              }, 3*1000)
            }
          }
        }
      }
    }
  })

  tableWs.on('close', () => {
    console.log('socket close');
    setTimeout(connect, 1000 * tries);
  })

  tableWs.on('error', async (error) => {
    if (`${error}`.endsWith("401")) {
      console.error("401, refreshing token")
      await fetchIdToken()
    }
    console.error(error)
    setTimeout(connect, 1000);
  })
}

async function makeBotAction(table, botPlayer) {
  let resultAct
  switch (algorithm) {
    case 2:
      resultAct = await actionAI.getAction(table, botPlayer)
      break
    case 1:
      resultAct = action1.getAction(table, botPlayer);
      if (!resultAct) {
        console.error("Action1 returned no action")
      }
      if (resultAct.stand) {
        tableWs.close()
        tableWs = undefined
        apiChat.postMessage(table.id, {text: "I'm bored"}, reqConf())
            .then(() => {
              setTimeout(() => stand(botPosition), 1000)
            })
        console.info("Will exit in 2 minutes")
        setTimeout(() => process.exit(0), 2 * 60 * 1000)
      }
      break
    case 0:
    default:
      resultAct = action0.getAction(table, botPlayer)
      break
  }
  let action = resultAct.action
  let chips = resultAct.chips

  if (action === "bet") {
    if (!chips || chips < table.bigBlind) {
      chips = table.bigBlind
    }

    if (chips === table.bigBlind + table.smallBlind) {
      // behaviour, nobody bets bb + sb
      chips = table.bigBlind
    }

    if (botPlayer.blind === "bigBlind" && table.communityCards.length === 0) {
      action = "raise"
    }
  }

  if (action === "raise") {
    if (!chips || chips < table.maxRoundBet * 2 - botPlayer.totalRoundBet) {
      chips = table.maxRoundBet * 2 - botPlayer.totalRoundBet
    }
  }

  if (botPlayer.stack <= chips) {
    action = "allIn"
    chips = 0
  }

  if (isOthersAllIn()) {
    if (action !== "fold") {
      if (table.maxRoundBet > botPlayer.totalRoundBet + botPlayer.stack) {
        action = "allIn"
        chips = 0
      } else {
        // if you deciding when others all-in, there is only one option - all-in
        action = "call"
        chips = 0
      }
    }
  }

  const makeAction = async () => {
    api.makeActionV2(tableId, botPosition, action, {chips}, reqConf())
        .catch(reason => {
          if (reason.response.status === 401) {
            console.error("401, refreshing token")
            fetchIdToken().then(() =>
                api.makeActionV2(tableId, botPosition, action, {chips}, reqConf()).catch(r => console.error(r.response))
            )
          } else {
            console.error("Request failed", reason.response)
          }
        })
  }
  setTimeout(makeAction, 1500 + Math.floor(Math.random() * 2000))

  function isOthersAllIn() {
    const others = allOtherPlayers()
    const gamingPlayers = others.filter(p => p.status === "playing" && p.lastGameAction !== "fold")
    const allInPlayers = others.filter(p => p.status === "playing" && p.lastGameAction === "allIn")
    return gamingPlayers.length === allInPlayers.length;

  }

  function allOtherPlayers() {
    return table.seats.filter(s => s.player && s.player.position !== botPlayer.position).map(s => s.player)
  }
}

function reqConf() {
  return {headers: {Authorization: `Bearer ${idTokenGlobal}`}}
}

function fetchDalyBonus() {
  axios.put("https://api.pokergloss.com/api/bonus/daily-bonus", {}, {headers: {Authorization: `Bearer ${idTokenGlobal}`}})
    .catch(() => console.log("Daily bonus failed"))
}

async function fetchIdToken() {
  idTokenGlobal = await loginAndGetToken(botEmail, botPassword)
}

const { mergeTable } = require("./mergeTable")

process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled rejection:', reason);
});
