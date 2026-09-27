import * as THREE from "three";
import { circle, type Collider } from "./physics";
import type { Ball } from "./physics";

type Pin = {
  x: number;
  z: number;
  group: THREE.Group;
  col: Extract<Collider, { kind: "circle" }>;
  state: "up" | "falling" | "down" | "rising";
  t: number;
  dirX: number;
  dirZ: number;
  slide: number;
  chainIn: number;
};

const SPACING = 0.62;
const FALL_TIME = 0.45;

/**
 * Ten pins racked in a triangle, the tip toward the spawn. A ball (or the
 * player) knocks them over; falling pins topple their neighbours. Knock all
 * ten down for a STRIKE — then they re-rack themselves.
 *
 * Not real rigid bodies: a fall is a scripted topple along the hit direction,
 * which reads as physics at this scale and can never jitter or tunnel.
 */
export class Pins {
  private pins: Pin[] = [];
  private rackIn = -1;
  private axis = new THREE.Vector3();
  private q = new THREE.Quaternion();

  constructor(
    scene: THREE.Scene,
    ramp: THREE.Texture,
    colliders: Collider[],
    cx: number,
    cz: number,
  ) {
    const profile = [
      [0.0, 0],
      [0.09, 0],
      [0.13, 0.12],
      [0.14, 0.3],
      [0.1, 0.52],
      [0.06, 0.64],
      [0.065, 0.72],
      [0.08, 0.82],
      [0.06, 0.92],
      [0.0, 0.96],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const body = new THREE.LatheGeometry(profile, 18);
    const stripe = new THREE.CylinderGeometry(0.066, 0.066, 0.035, 18);
    const white = new THREE.MeshToonMaterial({ color: "#f4f4f6", gradientMap: ramp });
    const red = new THREE.MeshToonMaterial({ color: "#ff5c3d", gradientMap: ramp });

    for (let row = 0; row < 4; row++) {
      for (let i = 0; i <= row; i++) {
        const x = cx + row * SPACING * 0.87;
        const z = cz + (i - row / 2) * SPACING;
        const group = new THREE.Group();
        const m = new THREE.Mesh(body, white);
        m.castShadow = true;
        const s1 = new THREE.Mesh(stripe, red);
        s1.position.y = 0.66;
        const s2 = new THREE.Mesh(stripe, red);
        s2.position.y = 0.72;
        group.add(m, s1, s2);
        group.position.set(x, 0, z);
        scene.add(group);
        const col = circle(x, z, 0.13, 0.95, { bounce: 0.35 }) as Pin["col"];
        colliders.push(col);
        this.pins.push({ x, z, group, col, state: "up", t: 0, dirX: 1, dirZ: 0, slide: 0, chainIn: -1 });
      }
    }
  }

  get standing() {
    return this.pins.filter((p) => p.state === "up").length;
  }

  private knock(p: Pin, dx: number, dz: number, force: number) {
    if (p.state !== "up") return;
    const len = Math.hypot(dx, dz) || 1;
    p.state = "falling";
    p.t = 0;
    p.dirX = dx / len;
    p.dirZ = dz / len;
    p.slide = Math.min(1.6, force * 0.12);
    // Out of the physics: a toppling pin no longer blocks anything.
    p.col.h = -1;
    p.col.player = false;
  }

  /** @returns "knock" on the first pin to fall this frame, "strike" when the last one does. */
  update(dt: number, balls: Ball[], px: number, pz: number, pvx: number, pvz: number): "knock" | "strike" | null {
    let event: "knock" | "strike" | null = null;
    const before = this.standing;
    const playerSpeed = Math.hypot(pvx, pvz);

    for (const p of this.pins) {
      if (p.state === "up") {
        for (const b of balls) {
          const speed = Math.hypot(b.vel.x, b.vel.z);
          if (speed > 2 && b.pos.y < 1.2 && Math.hypot(b.pos.x - p.x, b.pos.z - p.z) < b.r + 0.24) {
            this.knock(p, b.vel.x, b.vel.z, speed);
          }
        }
        if (playerSpeed > 2.2 && Math.hypot(px - p.x, pz - p.z) < 0.62) this.knock(p, pvx, pvz, playerSpeed);
        if (p.chainIn > 0) {
          p.chainIn -= dt;
          if (p.chainIn <= 0) this.knock(p, p.dirX, p.dirZ, 4);
        }
      }

      if (p.state === "falling") {
        p.t = Math.min(1, p.t + dt / FALL_TIME);
        // Topple pins in the way, a beat later.
        if (p.t > 0.4 && p.t - dt / FALL_TIME <= 0.4) {
          for (const o of this.pins) {
            if (o.state !== "up" || o.chainIn > 0) continue;
            const ox = o.x - p.x;
            const oz = o.z - p.z;
            const d = Math.hypot(ox, oz);
            if (d < SPACING * 1.25 && (ox * p.dirX + oz * p.dirZ) / d > 0.2) {
              o.chainIn = 0.05 + Math.random() * 0.08;
              o.dirX = p.dirX * 0.7 + (ox / d) * 0.3;
              o.dirZ = p.dirZ * 0.7 + (oz / d) * 0.3;
            }
          }
        }
        if (p.t >= 1) p.state = "down";
      }

      if (p.state === "rising") {
        p.t = Math.max(0, p.t - dt * 2.2);
        if (p.t <= 0) {
          p.state = "up";
          p.col.h = 0.95;
          p.col.player = true;
        }
      }

      // pose
      const e = p.state === "rising" ? p.t : 1 - Math.pow(1 - p.t, 3);
      const slide = p.slide * e;
      p.group.position.set(p.x + p.dirX * slide, 0, p.z + p.dirZ * slide);
      this.axis.set(p.dirZ, 0, -p.dirX);
      this.q.setFromAxisAngle(this.axis, e * Math.PI * 0.48);
      p.group.quaternion.copy(this.q);
    }

    const after = this.standing;
    if (after < before) event = after === 0 ? "strike" : "knock";
    const allDown = this.pins.every((p) => p.state === "down");
    if (allDown && (this.rackIn < 0 || this.rackIn > 3.5)) this.rackIn = 3.5;

    // Re-rack when all are down, or quietly after a while if some were left.
    const anyDown = this.pins.some((p) => p.state === "down");
    if (this.rackIn < 0 && anyDown && after > 0) this.rackIn = 9;
    if (this.rackIn > 0) {
      this.rackIn -= dt;
      if (this.rackIn <= 0) {
        this.rackIn = -1;
        for (const p of this.pins) {
          if (p.state === "down") p.state = "rising";
        }
      }
    }
    return event;
  }

  dispose() {
    const first = this.pins[0]?.group.children as THREE.Mesh[] | undefined;
    first?.forEach((m) => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
}
