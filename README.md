# terraforming-mars-bot

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/jankeromnes/terraforming-mars-bot)

A proof-of-concept Terraforming Mars AI meant to play https://github.com/bafolts/terraforming-mars/ automatically.

## How to run this

Open this repository in [Gitpod.io](https://www.gitpod.io), a free online development environment:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jankeromnes/terraforming-mars-bot)

This will give you a cloud workspace containing this repository already set-up and running:

<img alt="terraforming-mars-bot-in-gitpod" width="650" src="https://user-images.githubusercontent.com/599268/99880174-16e3e680-2c12-11eb-9360-5c6a7ea7ab4b.png">

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

4. Test your bot by starting a new game of Terraforming Mars, and make your bot play it:

- `node start-game`: Starts a new game, and outputs a player link (looks like `http://localhost:8080/player?id=123456789`)
- `node play-bot --bot=bots/my-bot PLAYER_LINK`: Makes your bot (here `my-bot.js`) play the game using the player link from above

Here is what a test run may look like in yout Terminal:

```
$ node start-game
Started new game. Player links:
  - Bot (red): http://localhost:8080/player?id=6d9796440d25

$ node play-bot --bot=bots/random http://localhost:8080/player?id=6d9796440d25
Bot plays: [ [ 'CrediCor' ], [ 'Solar Wind Power' ] ]
...
```

## Helper scripts

This repository comes with a few useful scripts:

### `node start-game [SERVER]`

```bash
# Start a new local game of Terraforming Mars (outputs a player link)
node start-game

# Start a new game on any Terraforming Mars server
node start-game https://my-tm-server.com
```

### `node play-bot PLAYER_LINK`

```bash
# Make a bot play Terraforming Mars (accepts a regular player link)
node play-bot https://my-tm-server.com/player?id=123456789
```

```bash
# Make a specific bot play Terraforming Mars
node play-bot --bot=bots/random https://my-tm-server.com/player?id=123456789
```
