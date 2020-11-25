# terraforming-mars-bot

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-blue?logo=gitpod)](https://gitpod.io/#https://github.com/jankeromnes/terraforming-mars-bot)

A proof-of-concept Terraforming Mars AI meant to play https://github.com/bafolts/terraforming-mars/ automatically.

## How to run this

Open this repository in [Gitpod.io](https://www.gitpod.io), a free online development environment:

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/jankeromnes/terraforming-mars-bot)

This will give you a cloud workspace containing this repository already set-up and running:

<img alt="terraforming-mars-bot-in-gitpod" width="650" src="https://user-images.githubusercontent.com/599268/99880174-16e3e680-2c12-11eb-9360-5c6a7ea7ab4b.png">

## Helper scripts

This repository comes with a few useful scripts:

### `node start-game [SERVER]`

```bash
# Start a new local game of Terraforming Mars (prints out the player links)
node start-game

# Start a new game on any Terraforming Mars server
node start-game https://my-tm-server.com
```

### `node play-bot PLAYER_LINK`

```bash
# Make a bot play Terraforming Mars (accepts a regular player link)
node play-bot https://my-tm-server.com/player?id=123456789
```
