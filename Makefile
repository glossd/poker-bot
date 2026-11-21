bot ?= 5

isDev ?=
isLocal ?=
gameType ?= table
uid ?=
alg = 2
debug = true

run_ai:
	TABLE_ID=$(tableid) GEMINI_API_KEY=$(geminikey) USER_ID=$(uid) ALG=$(alg) GAME_TYPE=$(gameType) BOT_EMAIL=$(email) BOT_PASSWORD=$(password) DEBUG=true node app.js

run:
	TABLE_ID=$(id) BOT_USER_IDX=$(bot) USER_ID=$(uid) ALG=1 GAME_TYPE=$(gameType) DEV=$(isDev) LOCAL=$(isLocal) node app.js

list:
	ps aux | grep "node app.js"

run_table:
	@make run gameType=table

run_sitngo:
	@make run gameType=sitngoLobby

run_multi:
	@make run id=$(id) bot=$(bot) gameType=multiLobby

run_multi_background:
	make run_multi id=$(id) bot=$(bot) &
	sleep 1

run_many_multi:
	for i in `seq 0 1`; do make run_multi_background id=$(id) bot=$$i; done

stop_many_multi:
	ps aux | grep "node app.js" | awk '{print $$2}' | xargs kill
