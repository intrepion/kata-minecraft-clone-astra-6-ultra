import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { Player, type SolidWorld } from '../src/player.ts';

function world(extraSolid = (_x: number, _y: number, _z: number) => false): SolidWorld {
  return {
    size: 64,
    getSpawn: () => new Vector3(0.5, 1, 0.5),
    isSolid: (x, y, z) => y === 0 || extraSolid(x, y, z),
  };
}

function simulate(player: Player, seconds: number, keys: string[] = []): void {
  for (let i = 0; i < Math.round(seconds * 120); i++) player.update(1 / 120, new Set(keys));
}

test('gravity lands the feet on the ground and exposes eye height', () => {
  const player = new Player(world(), new Vector3(0.5, 8, 0.5));
  simulate(player, 2);
  assert.ok(Math.abs(player.position.y - 1) < 0.001);
  assert.equal(player.grounded, true);
  assert.equal(player.velocity.y, 0);
  assert.ok(Math.abs(player.eyePosition.y - player.position.y - 1.62) < 0.000001);
});

test('a tall wall blocks movement, including at a large frame delta', () => {
  const player = new Player(world((x, y) => x === 2 && y > 0 && y < 6));
  simulate(player, 2, ['KeyD']);
  player.update(5, new Set(['KeyD', 'ShiftLeft']));
  assert.ok(player.position.x <= 2 - 0.28 + 0.001);
  assert.ok(player.position.x > 1.7);
  assert.ok(Math.abs(player.position.y - 1) < 0.001);
});

test('grounded movement climbs one block but not a two-block ledge', () => {
  const player = new Player(world((x, y) => x === 2 && y === 1));
  simulate(player, 0.38, ['KeyD']);
  assert.ok(player.position.x > 2);
  assert.ok(Math.abs(player.position.y - 2) < 0.002);

  const blocked = new Player(world((x, y) => x === 2 && (y === 1 || y === 2)));
  simulate(blocked, 1, ['KeyD']);
  assert.ok(blocked.position.x < 2);
  assert.ok(Math.abs(blocked.position.y - 1) < 0.001);
});

test('a step cannot push the player through a low ceiling', () => {
  const player = new Player(world((x, y) => (x === 2 && y === 1) || y === 3));
  simulate(player, 1, ['KeyD']);
  assert.ok(player.position.x < 2);
  assert.ok(Math.abs(player.position.y - 1) < 0.001);
});

test('jumping is edge-triggered; holding Space does not bounce after landing', () => {
  const player = new Player(world());
  player.update(1 / 60, new Set(['Space']));
  assert.ok(player.position.y > 1);
  assert.ok(player.velocity.y > 0);
  simulate(player, 2, ['Space']);
  assert.equal(player.grounded, true);
  assert.ok(Math.abs(player.position.y - 1) < 0.001);
  player.update(1 / 60, new Set());
  player.update(1 / 60, new Set(['Space']));
  assert.ok(player.velocity.y > 0);
});

test('diagonal walking has the same speed as straight walking', () => {
  const straight = new Player(world());
  const diagonal = new Player(world());
  const spawn = straight.position.clone();
  simulate(straight, 1, ['KeyW']);
  simulate(diagonal, 1, ['KeyW', 'KeyD']);
  assert.ok(Math.abs(straight.position.distanceTo(spawn) - diagonal.position.distanceTo(spawn)) < 0.00001);
  assert.ok(straight.position.z < spawn.z);
  assert.ok(diagonal.position.x > spawn.x);
});

test('flight ascends and descends, hovers, and continues to collide', () => {
  const player = new Player(world((x, y) => x === 2 && y > 0 && y < 30));
  assert.equal(player.toggleFlight(), true);
  simulate(player, 0.5, ['Space']);
  const high = player.position.y;
  assert.ok(high > 5);
  simulate(player, 0.5);
  assert.equal(player.position.y, high);
  simulate(player, 0.25, ['ShiftLeft']);
  assert.ok(player.position.y < high);
  simulate(player, 1, ['KeyD']);
  assert.ok(player.position.x <= 1.721);
  assert.equal(player.toggleFlight(), false);
  simulate(player, 1);
  assert.ok(Math.abs(player.position.y - 1) < 0.001);
});

test('block placement overlap checks the whole body but permits the floor', () => {
  const player = new Player(world());
  assert.equal(player.overlapsBlock(0, 1, 0), true);
  assert.equal(player.overlapsBlock(0, 2, 0), true);
  assert.equal(player.overlapsBlock(0, 0, 0), false);
  assert.equal(player.overlapsBlock(1, 1, 0), false);
});

test('world boundaries and the flight ceiling remain solid', () => {
  const player = new Player(world(), new Vector3(31.5, 52, 0.5));
  player.toggleFlight();
  simulate(player, 1, ['KeyD', 'Space']);
  assert.ok(player.position.x <= 32 - 0.28 + 0.00001);
  assert.ok(player.position.y <= 55 - 1.75 + 0.00001);
});

test('falling into the void returns to the world spawn', () => {
  const player = new Player(world(), new Vector3(0.5, -14, 0.5));
  simulate(player, 1);
  assert.ok(Math.abs(player.position.y - 1) < 0.001);
});

test('restored positions are brought inside body bounds and out of solid terrain', () => {
  const player = new Player(world(), new Vector3(32, 60, -32));
  assert.ok(player.position.x <= 31.72);
  assert.ok(player.position.z >= -31.72);
  assert.ok(player.position.y <= 53.25);
  player.toggleFlight();
  simulate(player, 0.5, ['KeyA', 'KeyS']);
  assert.ok(player.position.x < 31);
  assert.ok(player.position.z > -31);

  const buried = new Player(world((_x, y) => y === 1 || y === 2), new Vector3(0.5, 1.5, 0.5));
  assert.equal(buried.position.y, 3);
  simulate(buried, 0.5, ['KeyW']);
  assert.ok(buried.position.z < 0);
  assert.ok(Math.abs(buried.position.y - 3) < 0.001);
});
