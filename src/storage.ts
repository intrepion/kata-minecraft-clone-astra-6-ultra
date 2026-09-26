export const SAVE_KEY = 'blockfield.world.v1';

export interface WorldSave {
  version: 1;
  seed: number;
  edits: Array<[string, number]>;
  position: [number, number, number];
  yaw: number;
  pitch: number;
  selected: number;
  flying: boolean;
  daytime: boolean;
}

export function parseSave(raw: string | null): WorldSave | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1 || !Number.isSafeInteger(data.seed)) return null;
    if (!Array.isArray(data.edits) || data.edits.length > 96 * 96 * 45) return null;
    if (!data.edits.every((entry: unknown) => {
      if (!Array.isArray(entry) || entry.length !== 2) return false;
      const [key, id] = entry;
      if (typeof key !== 'string' || !/^-?\d+,-?\d+,-?\d+$/.test(key)) return false;
      const [x, y, z] = key.split(',').map(Number);
      return x >= -48 && x < 48 && z >= -48 && z < 48 && y >= 0 && y < 45 && Number.isInteger(id) && id >= 0 && id <= 10;
    })) return null;
    if (!Array.isArray(data.position) || data.position.length !== 3 || !data.position.every((n: unknown) => typeof n === 'number' && Number.isFinite(n))) return null;
    const [x, y, z] = data.position;
    if (x < -48 || x > 48 || z < -48 || z > 48 || y < -15 || y > 60) return null;
    if (!Number.isFinite(data.yaw) || !Number.isFinite(data.pitch)) return null;
    if (!Number.isInteger(data.selected) || data.selected < 0 || data.selected > 8) return null;
    if (typeof data.flying !== 'boolean' || typeof data.daytime !== 'boolean') return null;
    return data as WorldSave;
  } catch {
    return null;
  }
}
