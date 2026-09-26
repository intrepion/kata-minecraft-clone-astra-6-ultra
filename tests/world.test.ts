import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { VoxelWorld } from '../src/world.ts';

// World generation needs a texture canvas, but these tests exercise voxel data and
// real Three.js geometry without requiring a GPU or a browser rendering context.
const originalDocument = globalThis.document;
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({ fillStyle: '', fillRect() {} }),
  }),
} as unknown as Document;
after(() => { globalThis.document = originalDocument; });

test('a seed reproduces the world and another seed changes its terrain', () => {
  const first = new VoxelWorld(new THREE.Scene(), 38176);
  const replay = new VoxelWorld(new THREE.Scene(), 38176);
  const other = new VoxelWorld(new THREE.Scene(), 91823);
  try {
    let differences = 0;
    for (let x = -46; x < 47; x += 4) {
      for (let z = -46; z < 47; z += 4) {
        for (let y = 0; y < 45; y++) {
          assert.equal(first.getBlock(x, y, z), replay.getBlock(x, y, z));
          if (first.getBlock(x, y, z) !== other.getBlock(x, y, z)) differences++;
        }
      }
    }
    assert.ok(differences > 0, 'seed must affect generated blocks');
    assert.deepEqual(first.getSpawn(), replay.getSpawn());
  } finally {
    first.dispose();
    replay.dispose();
    other.dispose();
  }
});

test('spawn provides solid footing and enough clear space for a standing player', () => {
  for (const seed of [38176, 1, 91823]) {
    const world = new VoxelWorld(new THREE.Scene(), seed);
    try {
      const spawn = world.getSpawn();
      for (const dx of [-0.28, 0, 0.28]) {
        for (const dz of [-0.28, 0, 0.28]) {
          const x = Math.floor(spawn.x + dx);
          const z = Math.floor(spawn.z + dz);
          assert.equal(world.isSolid(x, Math.floor(spawn.y) - 1, z), true);
          for (const dy of [0, 0.9, 1.74]) {
            assert.equal(world.isSolid(x, Math.floor(spawn.y + dy), z), false);
          }
        }
      }
      assert.equal(world.getHeight(spawn.x, spawn.z) + 1, Math.floor(spawn.y));
    } finally {
      world.dispose();
    }
  }
});

test('edits validate block ids and integer world boundaries; water is not solid', () => {
  const world = new VoxelWorld(new THREE.Scene());
  try {
    assert.equal(world.size, 96);
    assert.equal(world.setBlock(-48, 44, -48, 3), true);
    assert.equal(world.setBlock(47, 44, 47, 7), true);
    for (const [x, y, z] of [[-49, 10, 0], [48, 10, 0], [0, -1, 0], [0, 45, 0], [0, 10, -49], [0, 10, 48], [0.5, 10, 0], [NaN, 10, 0]]) {
      assert.equal(world.getBlock(x, y, z), 0);
      assert.equal(world.isSolid(x, y, z), false);
      assert.equal(world.setBlock(x, y, z, 1), false);
    }
    for (const id of [-1, 11, 1.5, NaN]) assert.equal(world.setBlock(0, 40, 0, id), false);
    assert.equal(world.setBlock(0, 40, 0, 10), true);
    assert.equal(world.getBlock(0, 40, 0), 10);
    assert.equal(world.isSolid(0, 40, 0), false);
    assert.equal(world.setBlock(0, 40, 0, 9), true);
    assert.equal(world.isSolid(0, 40, 0), true);
  } finally {
    world.dispose();
  }
});

test('saved edits preserve removals, replacements, water, and edge blocks', () => {
  const world = new VoxelWorld(new THREE.Scene(), 12345);
  let restored: VoxelWorld | undefined;
  try {
    const surface = world.getHeight(10, 22);
    assert.equal(world.setBlock(10, surface, 22, 0), true);
    assert.equal(world.setBlock(0, 35, 0, 7), true);
    assert.equal(world.setBlock(0, 35, 0, 9), true);
    assert.equal(world.setBlock(0, 34, 0, 10), true);
    assert.equal(world.setBlock(-48, 44, -48, 3), true);
    assert.equal(world.setBlock(-48, 44, -48, 3), false);
    world.rebuildDirty();
    const serialized = JSON.parse(JSON.stringify(world.getEdits()));
    assert.equal(serialized.length, 4, 'successive replacements keep one edit per coordinate');
    restored = new VoxelWorld(new THREE.Scene(), world.seed, serialized);
    assert.deepEqual(restored.getEdits(), world.getEdits());
    for (const [key, id] of world.getEdits()) {
      const [x, y, z] = key.split(',').map(Number);
      assert.equal(restored.getBlock(x, y, z), id);
    }
    assert.equal(restored.getHeight(10, 22), surface - 1);
  } finally {
    world.dispose();
    restored?.dispose();
  }
});

test('editing a chunk corner rebuilds both adjacent chunks and disposes replaced geometry', () => {
  const scene = new THREE.Scene();
  const world = new VoxelWorld(scene);
  try {
    const affectedNames = ['chunk-1,1-0', 'chunk-0,1-0', 'chunk-1,0-0'];
    const affected = affectedNames.map(name => {
      const mesh = scene.getObjectByName(name) as THREE.Mesh;
      assert.ok(mesh);
      return mesh;
    });
    const unaffected = scene.getObjectByName('chunk-5,5-0');
    const diagonal = scene.getObjectByName('chunk-0,0-0');
    const disposed = new Set<THREE.BufferGeometry>();
    for (const mesh of affected) mesh.geometry.addEventListener('dispose', () => disposed.add(mesh.geometry));
    assert.equal(world.setBlock(-32, 40, -32, 3), true);
    world.rebuildDirty();
    assert.equal(disposed.size, affected.length);
    for (const oldMesh of affected) {
      assert.equal(oldMesh.parent, null);
      const replacement = scene.getObjectByName(oldMesh.name);
      assert.ok(replacement);
      assert.notEqual(replacement, oldMesh);
    }
    assert.equal(scene.getObjectByName('chunk-5,5-0'), unaffected);
    assert.equal(scene.getObjectByName('chunk-0,0-0'), diagonal);
    const current = [...scene.children];
    world.rebuildDirty();
    assert.deepEqual(scene.children, current, 'a clean world needs no further mesh replacement');
  } finally {
    world.dispose();
  }
});

test('generated triangles face outward and texture coordinates remain within the atlas', () => {
  const world = new VoxelWorld(new THREE.Scene());
  try {
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (const object of world.getMeshes()) {
      const mesh = object as THREE.Mesh;
      const geometry = mesh.geometry;
      const positions = geometry.getAttribute('position');
      const normals = geometry.getAttribute('normal');
      const uvs = geometry.getAttribute('uv');
      const indices = geometry.index!;
      for (let i = 0; i < indices.count; i += 3) {
        const first = indices.getX(i);
        a.fromBufferAttribute(positions, first);
        b.fromBufferAttribute(positions, indices.getX(i + 1));
        c.fromBufferAttribute(positions, indices.getX(i + 2));
        normal.fromBufferAttribute(normals, first);
        assert.ok(b.sub(a).cross(c.sub(a)).dot(normal) > 0, 'triangle winding agrees with its outward face normal');
      }
      for (let i = 0; i < uvs.count; i++) {
        assert.ok(uvs.getX(i) >= 0 && uvs.getX(i) <= 1);
        assert.ok(uvs.getY(i) >= 0 && uvs.getY(i) <= 1);
      }
    }
  } finally {
    world.dispose();
  }
});

test('disposing a world releases geometry, materials, and atlas without removing other scene content', () => {
  const scene = new THREE.Scene();
  const unrelated = new THREE.Object3D();
  scene.add(unrelated);
  const world = new VoxelWorld(scene);
  const meshes = scene.children.filter(object => object instanceof THREE.Mesh) as THREE.Mesh[];
  const geometries = new Set(meshes.map(mesh => mesh.geometry));
  const materials = new Set(meshes.map(mesh => mesh.material as THREE.MeshLambertMaterial));
  const textures = new Set([...materials].map(material => material.map!));
  let geometryDisposals = 0;
  let materialDisposals = 0;
  let textureDisposals = 0;
  for (const geometry of geometries) geometry.addEventListener('dispose', () => geometryDisposals++);
  for (const material of materials) material.addEventListener('dispose', () => materialDisposals++);
  for (const texture of textures) texture.addEventListener('dispose', () => textureDisposals++);
  world.dispose();
  assert.equal(geometryDisposals, geometries.size);
  assert.equal(materialDisposals, materials.size);
  assert.equal(textureDisposals, textures.size);
  assert.deepEqual(scene.children, [unrelated]);
  assert.deepEqual(world.getMeshes(), []);
});
