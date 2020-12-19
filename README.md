# terraforming-mars-bot

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/jankeromnes/terraforming-mars-bot)

A proof-of-concept Terraforming Mars AI meant to play https://github.com/bafolts/terraforming-mars/ automatically.

## How to run this

Open this repository in [Gitpod](https://www.gitpod.io), a free online development environment:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jankeromnes/terraforming-mars-bot)

This will give you a cloud workspace containing this repository already set-up and running:

<img alt="terraforming-mars-bot-in-gitpod" width="700" src="https://user-images.githubusercontent.com/599268/99880174-16e3e680-2c12-11eb-9360-5c6a7ea7ab4b.png">

## How to implement your own bot

1. Feel free to fork this repository, or to contribute your own bot here ([Pull Requests](https://github.com/jankeromnes/terraforming-mars-bot/pulls) welcome!)

2. Create your own bot script under the [bots/](bots/) directory, for example by copying one of the existing bots:

```bash
cd bots/
cp random.js my-bot.js
```

3. Implement or modify the required functions in your bot script, like for example `exports.playInitialResearchPhase`:

```js
exports.playInitialResearchPhase = async (game, availableCorporations, availableCards) => {
  const corporation = // TODO
  const initialCards = // TODO
  return [[ corporation ], initialCards];
}
```

> 💡 Feel free to inspect the `game` object, for example with `console.log(game)`, as it holds all the interesting details about the game in progress.

4. Test your bot by making it play a full game of Terraforming Mars:

- `node play-bot --bot=bots/my-bot`: Makes your bot play a new local solo game

Here is what such a test run may look like in yout Terminal:

```bash
$ node play-bot --bot=bots/my-bot
Bot plays: [ [ 'CrediCor' ], [ 'Solar Wind Power' ] ]
...
Game ended!
Game state (1p): gen=14, temp=-20, oxy=1, oceans=2, phase=end
Final scores:
  - Bot (red): 22 points
```

> 💡 This should make your bot play until the end of the game. However, if an error occurs (for example, if your bot tries to play an illegal move) you can debug it like so:
>
> - Notice in the logs what the game was waiting for, and what your bot attempted to play
> - Then, open the bot's player link in your browser
> - Open your browser's Developer Tools, then open the Network panel, and clear all previous entries
> - Manually play what your bot should have played
> - Click on the first item that appeared in your Network panel (looks like `/input`), and display the request's JSON payload
> - Then, compare what your bot tried to play with what you manually played -- this should tell you what your bot should do differently

## Helper scripts

This repository comes with a few useful scripts:

### `node play-bot [PLAYER_LINK]`

```bash
# Make a bot play a full solo game of Terraforming Mars
node play-bot

# Make a bot play Terraforming Mars (using a regular player link)
node play-bot https://my-tm-server.com/player?id=123456789

# Make a specific bot play Terraforming Mars
node play-bot --bot=bots/random.js https://my-tm-server.com/player?id=123456789

# See all available options and what they do
node play-bot --help
```

### `node start-game [SERVER]`

```bash
# Start a new local game of Terraforming Mars (outputs a player link)
node start-game

# Start a new game on any Terraforming Mars server
node start-game https://my-tm-server.com

# Start a new local game of Terraforming Mars, but only print player links (no extra text)
node start-game --quiet

# See all available options and what they do
node start-game --help
```
