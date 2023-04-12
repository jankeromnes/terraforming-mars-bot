// Copyright © 2020 Jan Keromnes.
// The following code is covered by the MIT license.
import * as minim from 'minimist';
//import path from "path";
import { startGame } from "./start-game.js";
import type { InputResponse } from "./terraforming-mars/src/common/inputs/InputResponse.js";
import { PlayerInputModel } from './terraforming-mars/src/common/models/PlayerInputModel.js';
import type { PlayerViewModel } from './terraforming-mars/src/common/models/PlayerModel.js'
import { Phase } from './terraforming-mars/src/common/Phase.js';
import { IBot } from './bots/IBot.js';
import { quantum } from './bots/quantum.js';

const usage = `USAGE

    node play-bot [OPTIONS]

OPTIONS

    -h, --help
        Print usage information

    --bot=BOT
        Play with a specific bot script from the bots/ directory (default is --bot=quantum)

    --server=SERVER
        The url to the server (default is --server='http://localhost:8080)

    --player=PLAYER
        The id of a player in an existing game on the server (default is blank, will create a new solo game for this bot)

    --games=NUMBER
        Play NUMBER of games in a row, then print score statistics (default is 1)

    --ignore-errors
        If an error occurs during a game, ignore it and just play another game`;
const playGames = async function() {
const argv = minim(process.argv.slice(2));
if (argv.h || argv.help || argv._.length > 1) {
  console.log(usage);
  process.exit();
}
const scores: {}[] = [];
const trs: number[] = []
const finalStates: string[] = [];
const games = argv.games ?? 1;
while (scores.length < games) {
try {
    const game = await playGame(argv.bot ?? 'quantum', argv.server ?? 'http://localhost:8080', scores.length + 1, argv.playerId);
    console.log('Final scores:\n' + game.players.map(p => `  - ${p.name} (${p.color}): ${p.victoryPointsBreakdown.total} points`).join('\n'));
    const score = {};
    for (const p of game.players) {
      score[p.name] = p.victoryPointsBreakdown.total;
    }
    scores.push(score);
    if (game.players.length === 1) {
      trs.push(game.players[0].victoryPointsBreakdown.terraformRating);
      finalStates.push(`temp=${game.game.temperature}, oxy=${game.game.oxygenLevel}, oceans=${game.game.oceans}`);
    }
} catch (error) {
  console.log("Last move:", lastMove)
  console.log('Game is waiting for:', lastWaitingFor);

   if (argv['ignore-errors']) {
     continue;
   }
   throw error;
  }
}
if (scores.length > 1) {
  console.log(`\nPlayed ${scores.length} game${scores.length === 1 ? '' : 's'}. Score summary:`);
  for (const name in scores[0]) {
    let min = 1000;
    let max = -1;
    let total = scores.map(s => s[name]).reduce((a, b) => {
      if (b < min) min = b;
      if (b > max) max = b;
      return a + b;
    }, 0);
    let average = Math.round(100 * total / scores.length) / 100;
    console.log(`  - ${name}: average ${average} points (min ${min}, max ${max})`);
  }
  // for solo mode we are more intetested in tr rating and final state
  if (finalStates.length > 0 && scores.length > 1) {
    console.log(`\nTR summary for solo game:`);
    let min = 1000;
    let max = -1;
    let total = trs.reduce((a, b) => {
      if (b < min) min = b;
      if (b > max) max = b;
      return a + b;
    }, 0);
    console.log(`  : average ${total/trs.length} trs (min ${min}, max ${max})`);
    finalStates.forEach(game => console.log(game));
  }
}
}

playGames();

function getBot(name:string):IBot {
  switch (name){
    case 'quantum':
      return new quantum();
    default:
      throw new Error("Unknown bot name " + name);
  }
}

var lastMove:InputResponse;
var lastWaitingFor:PlayerInputModel;
async function playGame (botPath: string, serverUrl: string, gameNumber: number, playerId?: string) {
  playerId = playerId ?? (await startGame([botPath], serverUrl, true))[0].id;

  // Load bot script
  const bot: IBot = getBot(botPath);

  // Initial research phase
  let game = await waitForTurn(serverUrl, playerId, undefined);
  // Play the game until the end
  while (game.game.phase !== Phase.END) {
    logGameState(game, gameNumber);
    const move = bot.play(game, game.waitingFor);
    lastMove = move;
//    console.log('Bot plays:', move);
    game = await playMoveAndWaitForTurn(serverUrl, playerId, move);
    lastWaitingFor = game.waitingFor;
  }

//  console.log('Game ended!');
  logGameState(game, gameNumber);
  return game;
}

async function playMoveAndWaitForTurn (serverUrl: string, playerId: string, move: InputResponse) {
  // console.log('Bot plays:', move);
  const response = await fetch(`${serverUrl}/player/input?id=${playerId}`, {method: "post", body: JSON.stringify(move)} );
  const game = (await response.json()) as PlayerViewModel;
  return await waitForTurn(serverUrl, playerId, game);
}

async function waitForTurn (serverUrl: string, playerId: string, game?: PlayerViewModel) {
  while (!(game?.waitingFor !== undefined || game?.game?.phase === Phase.END)) {
    await new Promise(resolve => setTimeout(resolve, 30));
    const response = await fetch(`${serverUrl}/api/player?id=${playerId}`);
    game = (await response.json()) as PlayerViewModel;
  }
  return game;
}

function logGameState (game:PlayerViewModel, gameNumber: number) {
  console.log(`Game state (${gameNumber}) (${game.players.length}p): gen=${game.game.generation}, temp=${game.game.temperature}, oxy=${game.game.oxygenLevel}, oceans=${game.game.oceans}, phase=${game.game.phase}`);
}
