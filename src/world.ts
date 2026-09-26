import * as THREE from 'three';

export type BlockDefinition = {
  id: number;
  name: string;
  color: string;
  sideColor: string;
  topColor: string;
  solid: boolean;
};

export const BLOCKS: BlockDefinition[] = [
  { id: 1, name: 'Grass', color: '#79a849', sideColor: '#96704c', topColor: '#83b958', solid: true },
  { id: 2, name: 'Dirt', color: '#9a7354', sideColor: '#816047', topColor: '#aa815a', solid: true },
  { id: 3, name: 'Stone', color: '#9aa49e', sideColor: '#7d8885', topColor: '#b0b8b0', solid: true },
  { id: 4, name: 'Oak log', color: '#866144', sideColor: '#735137', topColor: '#bd9a66', solid: true },
  { id: 5, name: 'Leaves', color: '#5b8541', sideColor: '#547a3d', topColor: '#76a253', solid: true },
  { id: 6, name: 'Sand', color: '#e6d1a1', sideColor: '#cdb783', topColor: '#eddbb0', solid: true },
  { id: 7, name: 'Oak planks', color: '#c69760', sideColor: '#ad814e', topColor: '#d6ac76', solid: true },
  { id: 8, name: 'Brick', color: '#b56c54', sideColor: '#9b5b46', topColor: '#ce876a', solid: true },
  { id: 9, name: 'Glass', color: '#b9e4e2', sideColor: '#a2cfd1', topColor: '#d5f1ed', solid: true },
  { id: 10, name: 'Water', color: '#5cb6c4', sideColor: '#50a6b9', topColor: '#71c2cf', solid: false },
];

const SIZE = 96;
const MIN = -48;
const HEIGHT = 45;
const CHUNK = 16;
const WATER_Y = 7;
const TILES = 4;
const TILE_SIZE = 16;
const FACES = [
  { d: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.88 },
  { d: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.81 },
  { d: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1 },
  { d: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.65 },
  { d: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.95 },
  { d: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.85 },
];

function hash(x: number, z: number, seed: number): number {
  let n = Math.imul(x ^ seed, 374761393) + Math.imul(z, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  let tx = x - ix;
  let tz = z - iz;
  tx = tx * tx * (3 - 2 * tx);
  tz = tz * tz * (3 - 2 * tz);
  const a = THREE.MathUtils.lerp(hash(ix, iz, seed), hash(ix + 1, iz, seed), tx);
  const b = THREE.MathUtils.lerp(hash(ix, iz + 1, seed), hash(ix + 1, iz + 1, seed), tx);
  return THREE.MathUtils.lerp(a, b, tz);
}

function makeAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILES * TILE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const palettes = [
    [113, 157, 66], [143, 103, 69], [148, 108, 76], [143, 152, 144],
    [114, 82, 49], [184, 147, 91], [77, 120, 52], [226, 207, 159],
    [186, 143, 88], [174, 98, 76], [185, 225, 223], [97, 178, 195],
  ];
  for (let tile = 0; tile < palettes.length; tile++) {
    const ox = (tile % TILES) * TILE_SIZE;
    const oy = Math.floor(tile / TILES) * TILE_SIZE;
    const base = palettes[tile];
    for (let y = 0; y < TILE_SIZE; y++) {
      for (let x = 0; x < TILE_SIZE; x++) {
        let delta = Math.floor((hash(x + tile * 17, y, 9128) - 0.5) * 28);
        let rgb = base;
        if (tile === 1 && y < 3 + Math.floor(hash(x, 0, 83) * 3)) rgb = palettes[0];
        if (tile === 3) {
          delta += Math.floor((hash(Math.floor(x / 3), Math.floor(y / 2), 753) - 0.5) * 23);
        }
        if (tile === 4) {
          delta += (x % 5 === 0 || x % 7 === 1) ? -25 : 6;
          if (y % 7 === 0 && x % 5 === 1) delta -= 17;
        }
        if (tile === 5) {
          const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
          delta += Math.floor(r) % 3 === 0 ? -30 : 6;
          if (r > 6) rgb = palettes[4];
        }
        if (tile === 6) {
          delta += hash(Math.floor(x / 2), Math.floor(y / 2), 814) < 0.25 ? -27 : 8;
        }
        if (tile === 8 && (y % 4 === 0 || (x + (Math.floor(y / 4) % 2) * 7) % 16 === 0)) delta -= 34;
        if (tile === 9 && (y % 5 === 0 || (x + (Math.floor(y / 5) % 2) * 8) % 16 === 0)) rgb = [201, 187, 163];
        if (tile === 10) {
          delta = 0;
          if (x === 0 || y === 0 || x === 15 || y === 15) rgb = [107, 159, 161];
          else if (x + y === 9 || x + y === 10 || x + y === 19) rgb = [229, 249, 242];
        }
        if (tile === 11) delta = y % 7 === 0 && x % 8 < 5 ? 20 : Math.floor(delta / 3);
        const colors = rgb.map(c => THREE.MathUtils.clamp(c + delta, 0, 255));
        ctx.fillStyle = `rgb(${colors[0]},${colors[1]},${colors[2]})`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function tileFor(id: number, face: number): number {
  if (id === 1) return face === 2 ? 0 : face === 3 ? 2 : 1;
  if (id === 4) return face === 2 || face === 3 ? 5 : 4;
  return ({ 2: 2, 3: 3, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11 } as Record<number, number>)[id] ?? 3;
}

type Buffers = { positions: number[]; normals: number[]; uvs: number[]; colors: number[]; indices: number[] };
const buffers = (): Buffers => ({ positions: [], normals: [], uvs: [], colors: [], indices: [] });

/** A deterministic, editable, chunk-meshed little valley. Block coordinates denote lower corners. */
export class VoxelWorld {
  readonly size = SIZE;
  readonly seed: number;
  private readonly scene: THREE.Scene;
  private readonly blocks = new Uint8Array(SIZE * SIZE * HEIGHT);
  private readonly edits = new Map<string, number>();
  private readonly dirty = new Set<string>();
  private readonly chunks = new Map<string, THREE.Mesh[]>();
  private readonly atlas: THREE.CanvasTexture;
  private readonly solidMaterial: THREE.MeshLambertMaterial;
  private readonly glassMaterial: THREE.MeshLambertMaterial;
  private readonly waterMaterial: THREE.MeshLambertMaterial;
  private spawnHeight = 13;

  constructor(scene: THREE.Scene, seed = 38176, edits: Array<[string, number]> = []) {
    this.scene = scene;
    this.seed = seed;
    this.atlas = makeAtlas();
    this.solidMaterial = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true });
    this.glassMaterial = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, transparent: true, opacity: 0.46, depthWrite: false });
    this.waterMaterial = new THREE.MeshLambertMaterial({ map: this.atlas, vertexColors: true, transparent: true, opacity: 0.68, depthWrite: false });
    this.generate();
    for (const [key, id] of edits) {
      const parts = key.split(',').map(Number);
      if (parts.length === 3 && parts.every(Number.isInteger)) this.setBlock(parts[0], parts[1], parts[2], id);
    }
    for (let x = 0; x < SIZE / CHUNK; x++) {
      for (let z = 0; z < SIZE / CHUNK; z++) this.dirty.add(`${x},${z}`);
    }
    this.rebuildDirty();
  }

  private index(x: number, y: number, z: number): number {
    return (x - MIN) + (z - MIN) * SIZE + y * SIZE * SIZE;
  }

  private inBounds(x: number, y: number, z: number): boolean {
    return Number.isInteger(x) && Number.isInteger(y) && Number.isInteger(z) && x >= MIN && x < MIN + SIZE && z >= MIN && z < MIN + SIZE && y >= 0 && y < HEIGHT;
  }

  getBlock(x: number, y: number, z: number): number {
    return this.inBounds(x, y, z) ? this.blocks[this.index(x, y, z)] : 0;
  }

  isSolid(x: number, y: number, z: number): boolean {
    const id = this.getBlock(x, y, z);
    return id > 0 && id !== 10;
  }

  setBlock(x: number, y: number, z: number, id: number): boolean {
    if (!this.inBounds(x, y, z) || !Number.isInteger(id) || id < 0 || id > 10) return false;
    if (this.getBlock(x, y, z) === id) return false;
    this.blocks[this.index(x, y, z)] = id;
    this.edits.set(`${x},${y},${z}`, id);
    this.markDirty(x, z);
    if ((x - MIN) % CHUNK === 0) this.markDirty(x - 1, z);
    if ((x - MIN) % CHUNK === CHUNK - 1) this.markDirty(x + 1, z);
    if ((z - MIN) % CHUNK === 0) this.markDirty(x, z - 1);
    if ((z - MIN) % CHUNK === CHUNK - 1) this.markDirty(x, z + 1);
    return true;
  }

  /** Highest solid block's integer Y; add one to obtain the standing surface. */
  getHeight(x: number, z: number): number {
    x = Math.floor(x);
    z = Math.floor(z);
    for (let y = HEIGHT - 1; y >= 0; y--) if (this.isSolid(x, y, z)) return y;
    return -1;
  }

  getSpawn(): THREE.Vector3 {
    // The clearing is intentionally kept free of trees and overlooks the river to the north.
    return new THREE.Vector3(10.5, Math.max(this.spawnHeight, this.getHeight(10, 22)) + 1.01, 22.5);
  }

  getMeshes(): THREE.Object3D[] {
    return [...this.chunks.values()].flatMap(meshes => meshes.filter(mesh => mesh.userData.blockType !== 'water'));
  }

  getEdits(): Array<[string, number]> {
    return [...this.edits.entries()];
  }

  private markDirty(x: number, z: number): void {
    if (x < MIN || x >= MIN + SIZE || z < MIN || z >= MIN + SIZE) return;
    this.dirty.add(`${Math.floor((x - MIN) / CHUNK)},${Math.floor((z - MIN) / CHUNK)}`);
  }

  private riverX(z: number): number {
    return -12 + Math.sin(z * 0.053) * 9 + Math.sin(z * 0.115 + 1) * 2.8;
  }

  private rawHeight(x: number, z: number): number {
    const distance = Math.abs(x - this.riverX(z));
    const lakeWidth = 3.2 + Math.exp(-((z + 16) ** 2) / 85) * 5;
    const broad = noise(x * 0.033, z * 0.033, this.seed);
    const detail = noise(x * 0.095, z * 0.095, this.seed + 52);
    const northernRidge = Math.max(0, -z - 15) * 0.29 * THREE.MathUtils.smoothstep(distance, 12, 28);
    let height = 10 + broad * 8 + detail * 3 + northernRidge;
    if (distance < lakeWidth) height = 4 + detail * 2;
    else if (distance < lakeWidth + 9) height = THREE.MathUtils.lerp(7, height, (distance - lakeWidth) / 9);
    // A low grassy terrace provides an unobstructed, comfortable starting viewpoint.
    const spawnDistance = Math.hypot(x - 10, z - 22);
    if (spawnDistance < 9) height = THREE.MathUtils.lerp(15, height, THREE.MathUtils.smoothstep(spawnDistance, 3, 9));
    return Math.max(3, Math.min(31, Math.floor(height)));
  }

  private put(x: number, y: number, z: number, id: number): void {
    if (this.inBounds(x, y, z)) this.blocks[this.index(x, y, z)] = id;
  }

  private generate(): void {
    for (let z = MIN; z < MIN + SIZE; z++) {
      for (let x = MIN; x < MIN + SIZE; x++) {
        const height = this.rawHeight(x, z);
        const sandy = height < 9 || (height < 10 && Math.abs(x - this.riverX(z)) < 10);
        for (let y = 0; y <= Math.max(height, WATER_Y); y++) {
          let id: number;
          if (y > height) id = 10;
          else if (y === height) id = sandy ? 6 : 1;
          else if (y >= height - 3) id = sandy ? 6 : 2;
          else id = 3;
          this.put(x, y, z, id);
        }
      }
    }
    this.spawnHeight = this.rawHeight(10, 22);
    for (let gz = -9; gz <= 8; gz++) {
      for (let gx = -9; gx <= 8; gx++) {
        const chance = hash(gx, gz, this.seed + 92);
        if (chance < 0.34) continue;
        const x = gx * 5 + Math.floor(hash(gx, gz, this.seed + 10) * 4);
        const z = gz * 5 + Math.floor(hash(gx, gz, this.seed + 20) * 4);
        const y = this.rawHeight(x, z);
        if (x < -44 || x > 43 || z < -44 || z > 43 || y < 10) continue;
        if (Math.hypot(x - 10, z - 22) < 8) continue;
        if (z > 0 && z < 22 && x > 4 && x < 18 && chance < 0.91) continue;
        if (Math.abs(this.rawHeight(x + 2, z) - this.rawHeight(x - 2, z)) > 3) continue;
        this.tree(x, y + 1, z, chance);
      }
    }
    // A few river stones break up the sandy banks without obstructing the walking route.
    for (let z = -40; z < 40; z += 11) {
      const x = Math.floor(this.riverX(z) + 8 + hash(z, 7, this.seed) * 3);
      const y = this.rawHeight(x, z);
      if (y > 7 && y < 12) {
        this.put(x, y + 1, z, 3);
        this.put(x + 1, y + 1, z, 3);
        if (hash(x, z, this.seed) > 0.5) this.put(x, y + 2, z, 3);
      }
    }
    this.cabin();
  }

  private cabin(): void {
    const x0 = -9;
    const z0 = -23;
    const floor = this.rawHeight(x0 + 3, z0 + 3) + 1;
    // This little homestead is made entirely from ordinary editable blocks.
    for (let z = z0 - 2; z <= z0 + 8; z++) {
      for (let x = x0 - 2; x <= x0 + 8; x++) {
        for (let y = floor; y < HEIGHT; y++) this.put(x, y, z, 0);
        if (x >= x0 && x <= x0 + 6 && z >= z0 && z <= z0 + 6) {
          for (let y = Math.min(this.rawHeight(x, z), floor - 1); y < floor; y++) this.put(x, y, z, 3);
          this.put(x, floor, z, 7);
        }
      }
    }
    for (let y = 1; y <= 3; y++) {
      for (let z = 0; z <= 6; z++) {
        for (let x = 0; x <= 6; x++) {
          if (x !== 0 && x !== 6 && z !== 0 && z !== 6) continue;
          const corner = (x === 0 || x === 6) && (z === 0 || z === 6);
          let id = corner ? 4 : 7;
          if (y === 2 && ((z === 6 && (x === 1 || x === 5)) || ((x === 0 || x === 6) && (z === 2 || z === 3)))) id = 9;
          if (z === 6 && x === 3 && y < 3) id = 0;
          this.put(x0 + x, floor + y, z0 + z, id);
        }
      }
    }
    for (let tier = 0; tier < 4; tier++) {
      const left = x0 - 1 + tier;
      const right = x0 + 7 - tier;
      for (let z = z0 - 1; z <= z0 + 7; z++) {
        this.put(left, floor + 4 + tier, z, 8);
        this.put(right, floor + 4 + tier, z, 8);
        if (tier === 3) this.put(left + 1, floor + 4 + tier, z, 8);
      }
      if (tier < 3) {
        for (let x = left + 1; x < right; x++) {
          this.put(x, floor + 4 + tier, z0, 7);
          this.put(x, floor + 4 + tier, z0 + 6, 7);
        }
      }
    }
    for (let y = floor + 4; y <= floor + 8; y++) this.put(x0 + 5, y, z0 + 1, 3);
    // Front porch, with a short stone stair that meets the natural hillside.
    for (let x = x0 + 1; x <= x0 + 5; x++) this.put(x, floor, z0 + 7, 7);
    for (let step = 0; step < 3; step++) {
      for (let x = x0 + 2; x <= x0 + 4; x++) {
        const z = z0 + 8 + step;
        const level = Math.max(this.rawHeight(x, z), floor - 1 - step);
        this.put(x, level, z, 3);
      }
    }
    // A small jetty reaches out over the turquoise water below the house.
    for (let x = -22; x <= -14; x++) {
      for (let z = -14; z <= -12; z++) this.put(x, 8, z, 7);
    }
    for (const x of [-22, -17]) {
      for (const z of [-14, -12]) {
        for (let y = 5; y <= 9; y++) this.put(x, y, z, 4);
      }
    }
  }

  private tree(x: number, y: number, z: number, variation: number): void {
    const trunk = 4 + Math.floor(variation * 3);
    const radius = variation > 0.65 ? 3 : 2;
    for (let dy = trunk - 2; dy <= trunk + 2; dy++) {
      const r = dy === trunk + 2 ? 1 : dy === trunk + 1 ? radius - 1 : radius;
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) === r && Math.abs(dz) === r && hash(x + dx, z + dz, this.seed + dy) < 0.85) continue;
          if (!this.getBlock(x + dx, y + dy, z + dz)) this.put(x + dx, y + dy, z + dz, 5);
        }
      }
    }
    for (let dy = 0; dy < trunk + 1; dy++) this.put(x, y + dy, z, 4);
    if (radius === 3) {
      this.put(x + 1, y + trunk - 1, z, 4);
      this.put(x - 1, y + trunk - 2, z, 4);
    }
  }

  rebuildDirty(): void {
    for (const key of this.dirty) this.buildChunk(key);
    this.dirty.clear();
  }

  private buildChunk(key: string): void {
    for (const mesh of this.chunks.get(key) ?? []) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    const [cx, cz] = key.split(',').map(Number);
    const batches = [buffers(), buffers(), buffers()];
    for (let z = MIN + cz * CHUNK; z < MIN + (cz + 1) * CHUNK; z++) {
      for (let x = MIN + cx * CHUNK; x < MIN + (cx + 1) * CHUNK; x++) {
        for (let y = 0; y < HEIGHT; y++) {
          const id = this.getBlock(x, y, z);
          if (!id) continue;
          const batch = batches[id === 10 ? 2 : id === 9 ? 1 : 0];
          for (let f = 0; f < FACES.length; f++) {
            const face = FACES[f];
            const adjacent = this.getBlock(x + face.d[0], y + face.d[1], z + face.d[2]);
            if (adjacent && adjacent !== 9 && adjacent !== 10) continue;
            if (adjacent === id && (id === 9 || id === 10)) continue;
            if (id === 10 && adjacent === 9) continue;
            if (y === 0 && f === 3) continue;
            const tile = tileFor(id, f);
            const u0 = ((tile % TILES) * TILE_SIZE + 0.05) / (TILES * TILE_SIZE);
            const u1 = ((tile % TILES + 1) * TILE_SIZE - 0.05) / (TILES * TILE_SIZE);
            const v0 = 1 - (Math.floor(tile / TILES) * TILE_SIZE + 0.05) / (TILES * TILE_SIZE);
            const v1 = 1 - ((Math.floor(tile / TILES) + 1) * TILE_SIZE - 0.05) / (TILES * TILE_SIZE);
            const base = batch.positions.length / 3;
            const tint = 0.95 + hash(x, z + y * 67, this.seed + 94) * 0.10;
            for (let i = 0; i < 4; i++) {
              const vertex = face.v[i];
              batch.positions.push(x + vertex[0], y + vertex[1], z + vertex[2]);
              batch.normals.push(...face.d);
              const shade = face.shade * tint;
              batch.colors.push(shade, shade, shade);
            }
            batch.uvs.push(u0, v1, u1, v1, u1, v0, u0, v0);
            batch.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
          }
        }
      }
    }
    const materials = [this.solidMaterial, this.glassMaterial, this.waterMaterial];
    const meshes: THREE.Mesh[] = [];
    batches.forEach((batch, i) => {
      if (!batch.indices.length) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(batch.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(batch.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(batch.uvs, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
      geometry.setIndex(batch.indices);
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, materials[i]);
      mesh.name = `chunk-${key}-${i}`;
      mesh.castShadow = i === 0;
      mesh.receiveShadow = true;
      mesh.userData.blockType = i === 2 ? 'water' : 'solid';
      if (i === 2) mesh.renderOrder = 1;
      this.scene.add(mesh);
      meshes.push(mesh);
    });
    this.chunks.set(key, meshes);
  }

  dispose(): void {
    for (const meshes of this.chunks.values()) {
      for (const mesh of meshes) {
        this.scene.remove(mesh);
        mesh.geometry.dispose();
      }
    }
    this.chunks.clear();
    this.atlas.dispose();
    this.solidMaterial.dispose();
    this.glassMaterial.dispose();
    this.waterMaterial.dispose();
  }
}
