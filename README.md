# Blockfield

A peaceful, Minecraft-inspired creative sandbox built with TypeScript and Three.js. Explore a sunlit voxel valley, wander down to the cabin, and build something of your own.

## Run locally

Requires Node.js 22.18+ (or 24+) and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The game uses WebGL, so hardware acceleration should be enabled in your browser.

## Controls

| Action | Control |
| --- | --- |
| Walk | W A S D |
| Look around | Mouse; click and drag if pointer lock is unavailable |
| Jump / fly up | Space |
| Sprint / fly down | Shift |
| Toggle flight | F |
| Break a block | Left click or Q |
| Place a block | Right click or B |
| Choose material | 1–9 or mouse wheel |
| Open inventory | E |
| Pause / resume | Escape |
| View controls | H or Tab |
| Return to spawn | R |
| Toggle sound | M |
| Keyboard look | Arrow keys |

Touchscreens have movement, flight, and building controls; drag the landscape to look around.

## Your world

The deterministic 96×96-block valley includes forests, a river, a little cabin, and a dock. Nine materials are available in unlimited quantities: grass, dirt, stone, oak logs, leaves, sand, planks, brick, and glass. Walk, jump, or fly; use settings to switch between daylight and starlight.

Block edits, position, selected material, flight, and time of day automatically save in this browser's local storage every five seconds and when pausing or leaving. Saves stay on this browser/device. Creating a fresh world replaces that saved world after confirmation. Clearing browser data removes the save.

This is a single-player creative sandbox with a finite world. It does not include multiplayer, crafting, enemies, or survival systems. All textures, icons, landscape, and sounds are generated in code; fonts are bundled locally.

## Verification

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The unit suite checks player collision, flight, jumping, world generation and edits, and saved-data validation. Browser tests cover starting, movement, block editing, inventory, settings, saving, and the mobile layout.

## Play online

[Play the hosted game](https://intrepion.github.io/kata-minecraft-clone-astra-6-ultra/)
