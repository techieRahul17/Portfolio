import * as THREE from "three";

/**
 * Just enough physics for football on a flat pitch.
 *
 * The world is a ground plane plus vertical prisms (circles and boxes with a
 * height) in XZ. The ball is a true 3D sphere under gravity; the players are
 * circles on the ground. That's the whole model — no engine, no WASM, and
 * everything stays deterministic and cheap enough to sub-step.
 */

export type Collider =
  | { kind: "circle"; x: number; z: number; r: number; h: number; bounce: number; ball: boolean; player: boolean }
  | {
      kind: "box";
      minX: number;
      maxX: number;
      minZ: number;
      maxZ: number;
      h: number;
      bounce: number;
      ball: boolean;
      player: boolean;
    };

export const circle = (x: number, z: number, r: number, h: number, opts: Partial<Collider> = {}): Collider => ({
  kind: "circle",
  x,
  z,
  r,
  h,
  bounce: 0.6,
  ball: true,
  player: true,
  ...(opts as object),
});

export const box = (
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  h: number,
  opts: Partial<Collider> = {},
): Collider => ({ kind: "box", minX, maxX, minZ, maxZ, h, bounce: 0.55, ball: true, player: true, ...(opts as object) });

const _n = { x: 0, z: 0, depth: 0 };

/** Penetration of a circle (px, pz, pr) into a collider, or null. Writes into a shared result. */
export function penetration(px: number, pz: number, pr: number, c: Collider) {
  if (c.kind === "circle") {
    const dx = px - c.x;
    const dz = pz - c.z;
    const d = Math.hypot(dx, dz);
    const min = pr + c.r;
    if (d >= min) return null;
    _n.x = d > 1e-5 ? dx / d : 1;
    _n.z = d > 1e-5 ? dz / d : 0;
    _n.depth = min - d;
    return _n;
  }

  const cx = Math.max(c.minX, Math.min(px, c.maxX));
  const cz = Math.max(c.minZ, Math.min(pz, c.maxZ));
  const dx = px - cx;
  const dz = pz - cz;
  const d = Math.hypot(dx, dz);

  if (d > 1e-5) {
    if (d >= pr) return null;
    _n.x = dx / d;
    _n.z = dz / d;
    _n.depth = pr - d;
    return _n;
  }

  // Centre is inside the box: leave along the shortest axis.
  const left = px - c.minX;
  const right = c.maxX - px;
  const top = pz - c.minZ;
  const bottom = c.maxZ - pz;
  const m = Math.min(left, right, top, bottom);
  _n.x = m === left ? -1 : m === right ? 1 : 0;
  _n.z = m === top ? -1 : m === bottom ? 1 : 0;
  _n.depth = m + pr;
  return _n;
}

export type BallEvents = {
  onBounce?: (speed: number) => void;
};

export class Ball {
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  readonly home = new THREE.Vector3();
  readonly mesh: THREE.Mesh;
  readonly r = 0.3;
  /** Seconds until this ball may score / hit again (debounce after an event). */
  cooldown = 0;
  /** Set when the ball should be put back on its spot after a short delay. */
  resetIn = -1;

  constructor(
    public zone: string,
    x: number,
    z: number,
    material: THREE.Material,
    private events: BallEvents = {},
  ) {
    this.home.set(x, this.r, z);
    this.pos.copy(this.home);
    this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(this.r, 4), material);
    this.mesh.castShadow = true;
    this.mesh.position.copy(this.pos);
  }

  get grounded() {
    return this.pos.y <= this.r + 0.02;
  }

  reset() {
    this.pos.copy(this.home);
    this.vel.set(0, 0, 0);
    this.resetIn = -1;
    this.cooldown = 0.4;
  }

  step(dt: number, colliders: Collider[]) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.resetIn > 0) {
      this.resetIn -= dt;
      if (this.resetIn <= 0) this.reset();
    }

    const speed = this.vel.length();
    const steps = Math.min(8, Math.max(1, Math.ceil((speed * dt) / (this.r * 0.5))));
    const h = dt / steps;

    for (let s = 0; s < steps; s++) {
      this.vel.y -= 20 * h;
      this.pos.addScaledVector(this.vel, h);

      // ground
      if (this.pos.y < this.r) {
        this.pos.y = this.r;
        if (this.vel.y < -1.6) {
          this.events.onBounce?.(-this.vel.y);
          this.vel.y *= -0.52;
          // a bounce scrubs a little horizontal speed too
          this.vel.x *= 0.92;
          this.vel.z *= 0.92;
        } else {
          this.vel.y = 0;
        }
      }

      // walls, posts, cones…
      for (const c of colliders) {
        if (!c.ball || this.pos.y - this.r > c.h) continue;
        const n = penetration(this.pos.x, this.pos.z, this.r, c);
        if (!n) continue;
        this.pos.x += n.x * n.depth;
        this.pos.z += n.z * n.depth;
        const vn = this.vel.x * n.x + this.vel.z * n.z;
        if (vn < 0) {
          this.vel.x -= (1 + c.bounce) * vn * n.x;
          this.vel.z -= (1 + c.bounce) * vn * n.z;
          if (-vn > 3) this.events.onBounce?.(-vn * 0.7);
        }
      }
    }

    // rolling resistance on the grass, a whisper of drag in the air
    const k = this.grounded ? Math.exp(-1.35 * dt) : Math.exp(-0.08 * dt);
    this.vel.x *= k;
    this.vel.z *= k;
    if (this.grounded && Math.hypot(this.vel.x, this.vel.z) < 0.04) {
      this.vel.x = 0;
      this.vel.z = 0;
    }

    // Spin to match travel, so it visibly rolls rather than slides.
    const horiz = Math.hypot(this.vel.x, this.vel.z);
    if (horiz > 1e-3) {
      _axis.set(this.vel.z, 0, -this.vel.x).normalize();
      _q.setFromAxisAngle(_axis, (horiz * dt) / this.r);
      this.mesh.quaternion.premultiply(_q);
    }
    this.mesh.position.copy(this.pos);
  }
}

const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();
