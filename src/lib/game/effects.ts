import * as THREE from "three";

const PALETTE = ["#e8ff4f", "#6e5bff", "#ff5c3d", "#ffffff", "#7fd4ff"].map((c) => new THREE.Color(c));

/**
 * Confetti: one InstancedMesh, simulated on the CPU. A few hundred flakes is
 * nothing, and it keeps every burst fully deterministic in feel.
 */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private pos: Float32Array;
  private vel: Float32Array;
  private rot: Float32Array;
  private life: Float32Array;
  private cursor = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private s = new THREE.Vector3(1, 1, 1);
  private p = new THREE.Vector3();

  constructor(private count = 420) {
    const geo = new THREE.PlaneGeometry(0.14, 0.24);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, count);
    this.mesh.frustumCulled = false;
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.rot = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      this.mesh.setColorAt(i, PALETTE[i % PALETTE.length]);
      this.hide(i);
    }
  }

  private hide(i: number) {
    this.m.makeScale(0, 0, 0);
    this.mesh.setMatrixAt(i, this.m);
  }

  burst(x: number, y: number, z: number, n = 160, spread = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const up = 6 + Math.random() * 8;
      const out = (1.5 + Math.random() * 4) * spread;
      this.pos.set([x, y, z], i * 3);
      this.vel.set([Math.cos(a) * out, up, Math.sin(a) * out], i * 3);
      this.rot.set([Math.random() * 6, Math.random() * 6, Math.random() * 6], i * 3);
      this.life[i] = 2.6 + Math.random() * 1.2;
    }
  }

  update(dt: number) {
    let any = false;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.hide(i);
        continue;
      }
      const j = i * 3;
      this.vel[j + 1] -= 9 * dt;
      // flutter: heavy drag once falling
      const drag = Math.exp(-(this.vel[j + 1] < 0 ? 2.6 : 0.6) * dt);
      this.vel[j] *= drag;
      this.vel[j + 1] *= drag;
      this.vel[j + 2] *= drag;
      this.pos[j] += this.vel[j] * dt;
      this.pos[j + 1] = Math.max(0.03, this.pos[j + 1] + this.vel[j + 1] * dt);
      this.pos[j + 2] += this.vel[j + 2] * dt;
      this.rot[j] += dt * 5;
      this.rot[j + 2] += dt * 3;
      this.p.set(this.pos[j], this.pos[j + 1], this.pos[j + 2]);
      this.q.setFromEuler(this.e.set(this.rot[j], this.rot[j + 1], this.rot[j + 2]));
      this.s.setScalar(Math.min(1, this.life[i]));
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    }
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Little puffs of turf kicked up by sprinting and shooting. */
export class Dust {
  readonly group = new THREE.Group();
  private puffs: { mesh: THREE.Mesh; life: number; vx: number; vz: number }[] = [];
  private i = 0;

  constructor() {
    const geo = new THREE.IcosahedronGeometry(0.16, 0);
    for (let k = 0; k < 28; k++) {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ color: "#9fd48a", transparent: true, opacity: 0, depthWrite: false }),
      );
      mesh.visible = false;
      this.group.add(mesh);
      this.puffs.push({ mesh, life: 0, vx: 0, vz: 0 });
    }
  }

  emit(x: number, z: number, n = 1) {
    for (let k = 0; k < n; k++) {
      const p = this.puffs[this.i];
      this.i = (this.i + 1) % this.puffs.length;
      p.life = 0.55;
      p.vx = (Math.random() - 0.5) * 1.4;
      p.vz = (Math.random() - 0.5) * 1.4;
      p.mesh.position.set(x + (Math.random() - 0.5) * 0.3, 0.1, z + (Math.random() - 0.5) * 0.3);
      p.mesh.visible = true;
    }
  }

  update(dt: number) {
    for (const p of this.puffs) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const t = 1 - p.life / 0.55;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.position.y += dt * 0.7;
      p.mesh.scale.setScalar(0.6 + t * 1.6);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.35;
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  dispose() {
    this.puffs[0]?.mesh.geometry.dispose();
    this.puffs.forEach((p) => (p.mesh.material as THREE.Material).dispose());
  }
}

/** Ring at the player's feet that fills while a shot is charging. */
export function chargeRing() {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.62, 0.78, 48, 1, 0, Math.PI * 2),
    new THREE.MeshBasicMaterial({ color: "#e8ff4f", transparent: true, opacity: 0, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  // above the grass blades, so the power ring stays readable
  mesh.position.y = 0.3;
  let last = -1;
  return {
    mesh,
    set(power: number) {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = power > 0 ? 0.85 : 0;
      const q = Math.round(power * 40) / 40;
      if (q !== last && power > 0) {
        last = q;
        mesh.geometry.dispose();
        mesh.geometry = new THREE.RingGeometry(0.62, 0.78, 48, 1, Math.PI / 2, Math.max(0.01, q) * Math.PI * 2);
      }
    },
    dispose() {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    },
  };
}

/**
 * Comet trails behind fast balls: a short history of positions per ball,
 * drawn as additive glowing points that shrink and fade toward the tail.
 * One draw call for every ball on the pitch.
 */
export class Trails {
  readonly points: THREE.Points;
  private readonly len = 18;
  private history: Float32Array;
  private heat: Float32Array;
  private positions: Float32Array;
  private alphas: Float32Array;

  constructor(private count: number) {
    const n = count * this.len;
    this.history = new Float32Array(n * 3);
    this.heat = new Float32Array(count);
    this.positions = new Float32Array(n * 3);
    this.alphas = new Float32Array(n);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1));
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) sizes[i] = 1 - (i % this.len) / this.len;
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    this.points = new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uScale: { value: window.devicePixelRatio || 1 } },
        vertexShader: /* glsl */ `
          attribute float aAlpha;
          attribute float aSize;
          uniform float uScale;
          varying float vAlpha;
          void main() {
            vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (40.0 + 60.0 * aSize) * uScale / -mv.z;
          }`,
        fragmentShader: /* glsl */ `
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            gl_FragColor = vec4(vec3(0.91, 1.0, 0.31), pow(1.0 - d * 2.0, 1.6) * vAlpha);
          }`,
      }),
    );
    this.points.frustumCulled = false;
  }

  update(i: number, x: number, y: number, z: number, speed: number, dt: number) {
    const h = this.history;
    const base = i * this.len * 3;
    // shift the history one slot toward the tail
    h.copyWithin(base + 3, base, base + (this.len - 1) * 3);
    h[base] = x;
    h[base + 1] = y;
    h[base + 2] = z;
    const target = THREE.MathUtils.clamp((speed - 9) / 12, 0, 1);
    this.heat[i] += (target - this.heat[i]) * (1 - Math.exp(-(target > this.heat[i] ? 20 : 4) * dt));
    for (let k = 0; k < this.len; k++) {
      const j = i * this.len + k;
      this.positions[j * 3] = h[base + k * 3];
      this.positions[j * 3 + 1] = h[base + k * 3 + 1];
      this.positions[j * 3 + 2] = h[base + k * 3 + 2];
      this.alphas[j] = this.heat[i] * (1 - k / this.len) * 0.55;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAlpha.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
