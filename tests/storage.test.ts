import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSave, type WorldSave } from '../src/storage.ts';

const validSave: WorldSave = {
  version: 1,
  seed: 73129,
  edits: [['-48,0,-48', 0], ['47,44,47', 10], ['10,12,22', 4]],
  position: [10.5, 13.01, 22.5],
  yaw: -0.8,
  pitch: 0.12,
  selected: 8,
  flying: false,
  daytime: true,
};

function rejects(overrides: Record<string, unknown>): void {
  assert.equal(parseSave(JSON.stringify({ ...validSave, ...overrides })), null);
}

test('a complete save roundtrips including all block ids and edge coordinates', () => {
  assert.deepEqual(parseSave(JSON.stringify(validSave)), validSave);
  const edited = { ...validSave, edits: Array.from({ length: 11 }, (_, id) => [`${id},1,0`, id]) };
  assert.deepEqual(parseSave(JSON.stringify(edited)), edited);
  assert.deepEqual(parseSave(JSON.stringify({ ...validSave, edits: [] })), { ...validSave, edits: [] });
});

test('empty, malformed, and non-object save data are rejected without throwing', () => {
  for (const raw of [null, '', '{', 'not json', 'undefined', 'null', '[]', 'true', '1', '"save"', '{}']) {
    assert.equal(parseSave(raw), null, String(raw));
  }
});

test('unsupported versions and non-integral or unsafe seeds are rejected', () => {
  for (const version of [0, 2, -1, '1', null, true]) rejects({ version });
  for (const seed of [1.2, '73129', null, Number.MAX_SAFE_INTEGER + 1, Number.NaN, Infinity]) rejects({ seed });
});

test('block edits must use a coordinate key and a valid integer block id', () => {
  for (const entry of [
    null, {}, [], ['0,1,0'], ['0,1,0', 1, 2], [12, 1],
    ['0.5,1,0', 1], ['0,1', 1], ['0,1,0,2', 1], ['0, 1,0', 1],
    ['NaN,1,0', 1], ['Infinity,1,0', 1], ['0,1e2,0', 1],
    ['0,1,0', -1], ['0,1,0', 11], ['0,1,0', 1.5],
    ['0,1,0', '1'], ['0,1,0', null], ['0,1,0', true],
  ]) rejects({ edits: [entry] });
  for (const edits of [null, {}, '0,1,0']) rejects({ edits });
});

test('block edits outside the world are rejected on every axis', () => {
  for (const coordinate of ['-49,1,0', '48,1,0', '0,-1,0', '0,45,0', '0,1,-49', '0,1,48']) {
    rejects({ edits: [[coordinate, 1]] });
  }
  rejects({ edits: [['99999999999999999999999999999999999999,1,0', 1]] });
});

test('a save cannot contain more edits than the world has cells', () => {
  rejects({ edits: new Array(96 * 96 * 45 + 1).fill(['0,1,0', 1]) });
});

test('player coordinates must be three finite numbers inside recovery bounds', () => {
  for (const position of [
    null, {}, [], [1, 2], [1, 2, 3, 4], ['1', 2, 3], [null, 2, 3],
    [NaN, 2, 3], [1, Infinity, 3], [1, 2, -Infinity],
    [-48.01, 1, 0], [48.01, 1, 0], [0, -15.01, 0], [0, 60.01, 0],
    [0, 1, -48.01], [0, 1, 48.01],
  ]) rejects({ position });
});

test('non-finite JSON numeric literals and NaN-like angles are rejected', () => {
  for (const field of ['seed', 'yaw', 'pitch']) {
    const raw = JSON.stringify({ ...validSave, [field]: 0 }).replace(`"${field}":0`, `"${field}":1e999`);
    assert.equal(parseSave(raw), null);
  }
  const infinitePosition = JSON.stringify({ ...validSave, position: [0, 1, 2] })
    .replace('"position":[0,1,2]', '"position":[0,1e999,2]');
  assert.equal(parseSave(infinitePosition), null);
  for (const angle of [null, 'NaN', 'Infinity', '0', NaN, Infinity]) {
    rejects({ yaw: angle });
    rejects({ pitch: angle });
  }
});

test('hotbar selection is an integer index and flight and daytime are booleans', () => {
  for (const selected of [-1, 9, 0.5, '0', null, true, NaN]) rejects({ selected });
  for (const value of [0, 1, 'true', 'false', null, [], {}]) {
    rejects({ flying: value });
    rejects({ daytime: value });
  }
  const flyingAtNight = { ...validSave, selected: 0, flying: true, daytime: false };
  assert.deepEqual(parseSave(JSON.stringify(flyingAtNight)), flyingAtNight);
});

test('missing required fields invalidate the save', () => {
  for (const key of Object.keys(validSave)) {
    const incomplete: Record<string, unknown> = { ...validSave };
    delete incomplete[key];
    assert.equal(parseSave(JSON.stringify(incomplete)), null, `Missing ${key}`);
  }
});
