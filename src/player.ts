import { Vector3 } from 'three';

export interface SolidWorld {
  isSolid(x: number, y: number, z: number): boolean;
  getSpawn(): Vector3;
  readonly size: number;
}

const RADIUS = 0.28;
const HEIGHT = 1.75;
const EYE_HEIGHT = 1.62;
const EPSILON = 0.0001;
const WALK_SPEED = 4.6;
const RUN_SPEED = 7.2;
const FLIGHT_SPEED = 8.5;
const GRAVITY = 24;
const JUMP_SPEED = 8.2;
const CEILING = 55;

/** A feet-based player body; rendered camera position is exposed separately. */
export class Player {
  readonly position = new Vector3();
  readonly velocity = new Vector3();
  yaw = 0;
  pitch = -0.12;
  flying = false;
  grounded = false;

  private world: SolidWorld;
  private jumpHeld = false;

  constructor(world: SolidWorld, spawn?: Vector3) {
    this.world = world;
    this.reset(spawn);
  }

  get eyePosition(): Vector3 {
    return this.position.clone().add(new Vector3(0, EYE_HEIGHT, 0));
  }

  look(dx: number, dy: number, sensitivity = 1): void {
    this.yaw -= dx * 0.002 * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, this.pitch - dy * 0.002 * sensitivity));
  }

  toggleFlight(): boolean {
    this.flying = !this.flying;
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    return this.flying;
  }

  reset(spawn?: Vector3): void {
    this.position.copy(spawn ?? this.world.getSpawn());
    // Stored positions may sit on the world's edge or intersect edited terrain.
    const limit = Math.max(0, this.world.size / 2 - RADIUS);
    this.position.x = Math.max(-limit, Math.min(limit, this.position.x));
    this.position.z = Math.max(-limit, Math.min(limit, this.position.z));
    this.position.y = Math.min(CEILING - HEIGHT, this.position.y);
    while (this.position.y < CEILING - HEIGHT
      && this.collides(this.position.x, this.position.y, this.position.z)) {
      this.position.y = Math.min(CEILING - HEIGHT, Math.floor(this.position.y) + 1);
    }
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.12;
    this.flying = false;
    this.grounded = false;
    this.jumpHeld = false;
  }

  setWorld(world: SolidWorld): void {
    this.world = world;
    this.reset();
  }

  overlapsBlock(x: number, y: number, z: number): boolean {
    return this.position.x + RADIUS > x + EPSILON
      && this.position.x - RADIUS < x + 1 - EPSILON
      && this.position.y + HEIGHT > y + EPSILON
      && this.position.y < y + 1 - EPSILON
      && this.position.z + RADIUS > z + EPSILON
      && this.position.z - RADIUS < z + 1 - EPSILON;
  }

  update(dt: number, keys: ReadonlySet<string>): void {
    const space = keys.has('Space');
    const jumpPressed = space && !this.jumpHeld;
    this.jumpHeld = space;
    if (!Number.isFinite(dt) || dt <= 0) return;

    // A resumed browser tab must not simulate seconds of falling in one frame.
    const elapsed = Math.min(dt, 0.1);
    const steps = Math.max(1, Math.ceil(elapsed / (1 / 120)));
    const step = elapsed / steps;
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
    const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    const shift = keys.has('ShiftLeft') || keys.has('ShiftRight');
    const speed = this.flying ? FLIGHT_SPEED : shift ? RUN_SPEED : WALK_SPEED;
    const horizontalLength = Math.hypot(forward, strafe) || 1;

    const desiredX = (strafe * Math.cos(this.yaw) - forward * Math.sin(this.yaw))
      / horizontalLength * speed;
    const desiredZ = (-forward * Math.cos(this.yaw) - strafe * Math.sin(this.yaw))
      / horizontalLength * speed;

    if (!this.flying) {
      this.grounded = this.velocity.y <= 0 && this.collides(
        this.position.x, this.position.y - 0.025, this.position.z,
      );
      if (jumpPressed && this.grounded) {
        this.velocity.y = JUMP_SPEED;
        this.grounded = false;
      }
    }

    for (let i = 0; i < steps; i++) {
      this.velocity.x = desiredX;
      this.velocity.z = desiredZ;
      if (this.flying) {
        this.velocity.y = (Number(space) - Number(shift)) * FLIGHT_SPEED;
        // Keep diagonal flight consistent with forward flight.
        if (forward !== 0 || strafe !== 0) {
          const scale = this.velocity.y === 0 ? 1 : Math.SQRT1_2;
          this.velocity.multiplyScalar(scale);
        }
      } else {
        this.velocity.y -= GRAVITY * step;
      }

      const mayStep = !this.flying && this.grounded && this.velocity.y <= 0;
      this.move('x', this.velocity.x * step, mayStep);
      this.move('z', this.velocity.z * step, mayStep);
      const falling = this.velocity.y < 0;
      const verticalCollision = this.move('y', this.velocity.y * step, false);
      this.grounded = !this.flying && falling && verticalCollision;

      if (this.position.y < -15) {
        this.reset();
        return;
      }
    }
  }

  private collides(x: number, y: number, z: number): boolean {
    const halfSize = this.world.size / 2;
    if (x - RADIUS < -halfSize || x + RADIUS > halfSize
      || z - RADIUS < -halfSize || z + RADIUS > halfSize
      || y + HEIGHT > CEILING) return true;

    for (let bx = Math.floor(x - RADIUS + EPSILON); bx <= Math.floor(x + RADIUS - EPSILON); bx++) {
      for (let by = Math.floor(y + EPSILON); by <= Math.floor(y + HEIGHT - EPSILON); by++) {
        for (let bz = Math.floor(z - RADIUS + EPSILON); bz <= Math.floor(z + RADIUS - EPSILON); bz++) {
          if (this.world.isSolid(bx, by, bz)) return true;
        }
      }
    }
    return false;
  }

  /** Returns whether motion hit a solid surface. Small steps prevent tunneling. */
  private move(axis: 'x' | 'y' | 'z', amount: number, mayStep: boolean): boolean {
    if (amount === 0) return false;
    const start = this.position[axis];
    this.position[axis] = start + amount;
    if (!this.collides(this.position.x, this.position.y, this.position.z)) return false;
    this.position[axis] = start;

    if (axis !== 'y' && mayStep && this.tryStep(axis, amount)) return false;

    let clear = 0;
    let blocked = 1;
    for (let i = 0; i < 12; i++) {
      const fraction = (clear + blocked) / 2;
      this.position[axis] = start + amount * fraction;
      if (this.collides(this.position.x, this.position.y, this.position.z)) blocked = fraction;
      else clear = fraction;
    }
    this.position[axis] = start + amount * clear;
    this.velocity[axis] = 0;
    return true;
  }

  private tryStep(axis: 'x' | 'z', amount: number): boolean {
    const start = this.position.clone();
    this.position.y += 1 + EPSILON;
    if (this.collides(this.position.x, this.position.y, this.position.z)) {
      this.position.copy(start);
      return false;
    }

    this.position[axis] += amount;
    if (this.collides(this.position.x, this.position.y, this.position.z)) {
      this.position.copy(start);
      return false;
    }

    this.move('y', -(1 + EPSILON), false);
    if (this.position.y < start.y + EPSILON) {
      this.position.copy(start);
      return false;
    }
    this.velocity.y = 0;
    this.grounded = true;
    return true;
  }
}
