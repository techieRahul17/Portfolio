import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { jerseyBack, jerseyFabric, jerseyFront } from "./textures";

/**
 * A stylised footballer built from primitives and animated procedurally — no
 * model file, no skeleton, no mixer. Every joint is a Group whose rotation is
 * written each frame from a run cycle plus whatever action (kick, celebration,
 * wave, dive) is playing on top of it.
 *
 * The look is "designer toy": toon shading, a slightly large head, faceted
 * hair clumps and an inverted-hull outline around the silhouette.
 *
 * Local +Z is the character's front.
 */

export type Kit = {
  skin: string;
  /** A slightly deeper skin tone for the nose, cheeks and ears. */
  skinShade?: string;
  hair: string;
  /** Faded sides; defaults to the hair colour. */
  hairFade?: string;
  shirt: string;
  trim: string;
  shorts: string;
  socks: string;
  boots: string;
  gloves?: string;
  beard?: boolean;
  /** Hair style: a swept-up quiff, or a short crop. */
  style?: "quiff" | "crop";
  back?: { name: string; number: string };
};

type ActionName = "kick" | "celebrate" | "wave" | "dive" | "airplane" | "fistpump" | "stretch" | "bounce" | "skid";

/** Extra context from the engine that shapes the pose each frame. */
export type Pose = {
  /** Turning rate, rad/s — the body banks into the turn. */
  turn?: number;
  /** Change in speed, units/s² — lean forward to accelerate, back to brake. */
  accel?: number;
  /** Where the nearest ball is, relative to facing (rad), or null. */
  look?: number | null;
  /** 0..1: ball at your feet — crouch over it, shorter stride. */
  dribble?: number;
};
type Action = { name: ActionName; t: number; dur: number; dir: number };

const damp = (a: number, b: number, rate: number, dt: number) =>
  a + (b - a) * (1 - Math.exp(-rate * dt));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

/* The face is two ellipsoids — cranium and a rounder jaw — and every feature
   is placed on whichever surface is in front at that point. */
type Ellipsoid = { cy: number; cz: number; a: number; b: number; c: number };
const CRANIUM: Ellipsoid = { cy: 0, cz: 0, a: 0.232, b: 0.252, c: 0.236 };
const JAW: Ellipsoid = { cy: -0.08, cz: 0.014, a: 0.214, b: 0.19, c: 0.206 };

function surfaceZ(x: number, y: number) {
  const on = (e: Ellipsoid) => {
    const q = 1 - (x / e.a) ** 2 - ((y - e.cy) / e.b) ** 2;
    return q > 0 ? e.cz + e.c * Math.sqrt(q) : -1;
  };
  return Math.max(on(CRANIUM), on(JAW));
}

const OUTLINE = 0.011;

/**
 * A sphere trimmed by a boundary that varies around the head: every vertex on
 * the wrong side of `limit(θ)` is slid along its meridian onto the boundary.
 * θ is the angle around the vertical axis, 0 at the front. Used for a hairline
 * (keep above) and a beard line (keep below) — smooth edges, no seams.
 */
function trimmedSphere(limit: (theta: number) => number, keep: "above" | "below", w = 40, h = 30) {
  const geo = new THREE.SphereGeometry(1, w, h);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const edge = limit(Math.atan2(x, z));
    if ((keep === "above" && y < edge) || (keep === "below" && y > edge)) {
      const r = Math.sqrt(Math.max(0, 1 - edge * edge));
      const flat = Math.hypot(x, z) || 1;
      p.setXYZ(i, (x / flat) * r, edge, (z / flat) * r);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

const smoothstep = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

/** Hairline: high at the forehead, receding at the temples, level above the ears, low at the nape. */
const hairline = (theta: number) => {
  const c = Math.cos(theta);
  return c >= 0 ? 0.52 * Math.pow(c, 1.5) - 0.03 : -0.5 * Math.pow(-c, 1.1) - 0.03;
};

/** Beard line: up to the sideburns at the sides, clear of the mouth at the front, gone behind the jaw. */
const beardline = (theta: number) => {
  const t = Math.abs(theta);
  if (t > 1.95) return -1;
  return -0.34 + 0.9 * smoothstep(0.28, 1.55, t);
};

export class Character {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private spine = new THREE.Group();
  private head = new THREE.Group();
  /** index 0 = left (+x), 1 = right (−x) */
  private hips = [new THREE.Group(), new THREE.Group()];
  private knees = [new THREE.Group(), new THREE.Group()];
  private shoulders = [new THREE.Group(), new THREE.Group()];
  private elbows = [new THREE.Group(), new THREE.Group()];
  private eyes: THREE.Group[] = [];

  private phase = 0;
  private run = 0;
  private roll = 0;
  private lean = 0;
  private lookYaw = 0;
  private hunch = 0;
  private lastSw = 0;
  private idleClock = 4;
  /** Called as each foot plants while moving (0 = left, 1 = right). */
  onStep?: (foot: number, speed: number) => void;
  private blink = 2 + Math.random() * 3;
  private action: Action | null = null;
  private materials = new Map<string, THREE.Material>();
  private textures: THREE.Texture[] = [];
  private outlineMat: THREE.MeshBasicMaterial;
  /** People get a gentler light ramp than the world, so faces don't band. */
  private ramp: THREE.DataTexture;

  constructor(private kit: Kit) {
    this.ramp = new THREE.DataTexture(new Uint8Array([150, 200, 236, 255]), 4, 1, THREE.RedFormat);
    this.ramp.minFilter = this.ramp.magFilter = THREE.NearestFilter;
    this.ramp.generateMipmaps = false;
    this.ramp.needsUpdate = true;
    // Inverted hull: back faces, pushed out along the normal, drawn flat dark.
    this.outlineMat = new THREE.MeshBasicMaterial({ color: "#0c0a16", side: THREE.BackSide });
    this.outlineMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>\n transformed += normalize(normal) * ${OUTLINE.toFixed(4)};`,
      );
    };
    this.build();
  }

  private mat(color: string) {
    let m = this.materials.get(color);
    if (!m) {
      m = new THREE.MeshToonMaterial({ color, gradientMap: this.ramp });
      this.materials.set(color, m);
    }
    return m;
  }

  private mesh(
    geo: THREE.BufferGeometry,
    material: string | THREE.Material,
    parent: THREE.Object3D,
    x = 0,
    y = 0,
    z = 0,
    outline = false,
  ) {
    const m = new THREE.Mesh(geo, typeof material === "string" ? this.mat(material) : material);
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    if (outline) m.add(new THREE.Mesh(geo, this.outlineMat));
    return m;
  }

  private tex<T extends THREE.Texture>(t: T) {
    this.textures.push(t);
    return t;
  }

  /**
   * A faceted clump for stylised hair: an icosahedron with its vertices
   * nudged. Returns a flat-normal copy to render (each facet catches the toon
   * light on its own) and the smooth one for a crack-free outline.
   */
  private clump(radius: number, seed: number) {
    const geo = mergeVertices(new THREE.IcosahedronGeometry(radius, 1));
    const p = geo.attributes.position;
    let s = seed * 9301 + 49297;
    const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280) - 0.5;
    for (let i = 0; i < p.count; i++) {
      const f = 1 + rand() * 0.22;
      p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    geo.computeVertexNormals();
    const faceted = geo.toNonIndexed();
    faceted.computeVertexNormals();
    return { faceted, smooth: geo };
  }

  private build() {
    const k = this.kit;
    const shade = k.skinShade ?? k.skin;
    this.root.add(this.body);

    const shirt = new THREE.MeshToonMaterial({ map: this.tex(jerseyFabric(k.shirt)), gradientMap: this.ramp });
    this.materials.set("shirt:fabric", shirt);

    /* ---------------------------------------------------------- legs */
    const pelvisY = 0.95;
    this.hips.forEach((hip, i) => {
      const side = i === 0 ? 1 : -1;
      hip.position.set(0.12 * side, pelvisY, 0);
      this.body.add(hip);
      this.mesh(new THREE.CapsuleGeometry(0.083, 0.3, 4, 10), k.skin, hip, 0, -0.22, 0, true);
      this.mesh(new THREE.CylinderGeometry(0.128, 0.118, 0.25, 12), k.shorts, hip, 0, -0.1, 0, true);
      this.mesh(new THREE.BoxGeometry(0.014, 0.22, 0.05), k.trim, hip, 0.125 * side, -0.1, 0);

      const knee = this.knees[i];
      knee.position.set(0, -0.44, 0);
      hip.add(knee);
      this.mesh(new THREE.CapsuleGeometry(0.078, 0.3, 4, 10), k.socks, knee, 0, -0.2, 0, true);
      this.mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.035, 12), k.shorts, knee, 0, -0.04, 0);
      this.mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.02, 12), k.shorts, knee, 0, -0.1, 0);
      // boot: body, rounded toe, contrasting sole
      this.mesh(new THREE.BoxGeometry(0.15, 0.1, 0.22), k.boots, knee, 0, -0.44, 0.02, true);
      const toe = this.mesh(new THREE.SphereGeometry(0.075, 12, 8), k.boots, knee, 0, -0.455, 0.13, true);
      toe.scale.set(1, 0.68, 1.05);
      this.mesh(new THREE.BoxGeometry(0.155, 0.026, 0.31), k.trim, knee, 0, -0.498, 0.05);
    });

    /* ---------------------------------------------------------- torso */
    this.spine.position.set(0, pelvisY, 0);
    this.body.add(this.spine);
    this.mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.18, 14), k.shorts, this.spine, 0, 0.02, 0, true);
    const torso = this.mesh(new THREE.CapsuleGeometry(0.2, 0.32, 6, 16), shirt, this.spine, 0, 0.32, 0, true);
    torso.scale.set(1.25, 1, 0.82);
    const collar = this.mesh(new THREE.TorusGeometry(0.09, 0.026, 8, 18), k.trim, this.spine, 0, 0.64, 0);
    collar.rotation.x = Math.PI / 2;
    for (const side of [1, -1]) {
      this.mesh(new THREE.BoxGeometry(0.02, 0.5, 0.2), k.trim, this.spine, 0.246 * side, 0.3, 0);
    }
    if (k.back) {
      const decal = (map: THREE.Texture, w: number, h: number, y: number, z: number, back: boolean) => {
        const m = new THREE.Mesh(
          new THREE.PlaneGeometry(w, h),
          new THREE.MeshBasicMaterial({ map: this.tex(map), transparent: true }),
        );
        m.position.set(0, y, z);
        if (back) m.rotation.y = Math.PI;
        this.spine.add(m);
      };
      decal(jerseyBack(k.back.name, k.back.number), 0.36, 0.45, 0.34, -0.168, true);
      decal(jerseyFront(k.back.number, k.trim), 0.3, 0.15, 0.44, 0.166, false);
    }

    /* ----------------------------------------------------------- arms */
    this.shoulders.forEach((sh, i) => {
      const side = i === 0 ? 1 : -1;
      sh.position.set(0.28 * side, 0.55, 0);
      this.spine.add(sh);
      this.mesh(new THREE.CapsuleGeometry(0.085, 0.1, 4, 10), shirt, sh, 0, -0.07, 0, true);
      this.mesh(new THREE.CylinderGeometry(0.087, 0.087, 0.025, 12), k.trim, sh, 0, -0.15, 0);
      this.mesh(new THREE.CapsuleGeometry(0.062, 0.2, 4, 10), k.skin, sh, 0, -0.15, 0, true);

      const elbow = this.elbows[i];
      elbow.position.set(0, -0.29, 0);
      sh.add(elbow);
      this.mesh(new THREE.CapsuleGeometry(0.056, 0.17, 4, 10), k.skin, elbow, 0, -0.12, 0, true);
      const handR = k.gloves ? 0.095 : 0.068;
      this.mesh(new THREE.SphereGeometry(handR, 12, 10), k.gloves ?? k.skin, elbow, 0, -0.28, 0, true);
      if (!k.gloves && i === 1) {
        this.mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.055, 12), k.trim, elbow, 0, -0.2, 0);
      }
    });

    /* ----------------------------------------------------------- head */
    this.mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.12, 12), k.skin, this.spine, 0, 0.66, 0, true);
    this.head.position.set(0, 0.7, 0);
    this.head.scale.setScalar(1.06);
    this.spine.add(this.head);
    const face = new THREE.Group();
    face.position.y = 0.21;
    this.head.add(face);

    const ellipsoid = (e: Ellipsoid, color: string, grow = 1, outline = true, segs = 24) => {
      const m = this.mesh(new THREE.SphereGeometry(1, segs, Math.round(segs * 0.75)), color, face, 0, e.cy, e.cz, outline);
      m.scale.set(e.a * grow, e.b * grow, e.c * grow);
      return m;
    };
    ellipsoid(CRANIUM, k.skin);
    ellipsoid(JAW, k.skin);

    // Place a feature on the face surface at (x, y), lifted by `lift`.
    const at = (x: number, y: number, lift = 0) => surfaceZ(x, y) + lift;

    // cheeks, pushed up by the smile
    for (const side of [1, -1]) {
      const cheek = this.mesh(new THREE.SphereGeometry(0.066, 14, 10), k.skin, face, 0.118 * side, -0.022, at(0.118, -0.022, -0.042));
      cheek.scale.set(1, 0.85, 0.8);
    }

    // ears
    for (const side of [1, -1]) {
      const ear = this.mesh(new THREE.SphereGeometry(0.056, 12, 8), k.skin, face, 0.226 * side, -0.005, 0, true);
      ear.scale.set(0.48, 1, 0.78);
      const inner = this.mesh(new THREE.SphereGeometry(0.03, 10, 6), shade, face, 0.245 * side, -0.005, 0.004);
      inner.scale.set(0.3, 1, 0.7);
    }

    // eyes: almond whites, dark brown iris, pupil, highlight — grouped to blink
    for (const side of [1, -1]) {
      const x = 0.084 * side;
      const y = 0.03;
      const eye = new THREE.Group();
      eye.position.set(x, y, at(x, y, -0.012));
      face.add(eye);
      this.eyes.push(eye);
      const white = this.mesh(new THREE.SphereGeometry(0.038, 18, 12), "#f4efe6", eye);
      white.scale.set(1.2, 0.68, 0.5);
      const iris = this.mesh(new THREE.SphereGeometry(0.022, 16, 10), "#3a2216", eye, -0.004 * side, 0.001, 0.014);
      iris.scale.set(1, 1, 0.45);
      const pupil = this.mesh(new THREE.SphereGeometry(0.012, 12, 8), "#0c0806", eye, -0.004 * side, 0.001, 0.021);
      pupil.scale.set(1, 1, 0.4);
      this.mesh(new THREE.SphereGeometry(0.0055, 8, 6), "#ffffff", eye, -0.01 * side, 0.009, 0.026);
      // lash line on top, and the smile pushing up the lower lid
      const lid = this.mesh(new THREE.CapsuleGeometry(0.0065, 0.066, 3, 6), "#140d0b", face, x, y + 0.021, at(x, y + 0.021, 0.001));
      lid.rotation.z = Math.PI / 2 - 0.12 * side;
      const lower = this.mesh(new THREE.CapsuleGeometry(0.012, 0.05, 3, 6), k.skin, face, x, y - 0.024, at(x, y - 0.024, 0.002));
      lower.rotation.z = Math.PI / 2 + 0.1 * side;
    }

    // thick, gently arched brows
    for (const side of [1, -1]) {
      const x = 0.088 * side;
      const brow = this.mesh(new THREE.CapsuleGeometry(0.0165, 0.072, 3, 8), k.hair, face, x, 0.092, at(x, 0.092, 0.008));
      brow.rotation.z = Math.PI / 2 - 0.16 * side;
    }

    // broad, rounded nose
    const nose = this.mesh(new THREE.SphereGeometry(0.042, 14, 10), shade, face, 0, -0.028, at(0, -0.028, -0.01));
    nose.scale.set(1.28, 0.88, 0.95);
    for (const side of [1, -1]) {
      this.mesh(new THREE.SphereGeometry(0.022, 10, 8), k.skin, face, 0.038 * side, -0.036, at(0.038, -0.036, -0.014));
    }
    const bridge = this.mesh(new THREE.CapsuleGeometry(0.017, 0.045, 3, 6), k.skin, face, 0, 0.012, at(0, 0.012, -0.004));
    bridge.rotation.x = -0.25;

    if (k.beard) {
      // Short, neat beard following the jaw — sideburns down to under the
      // chin, leaving the skin round the mouth clear.
      const beard = this.mesh(trimmedSphere(beardline, "below"), k.hair, face, 0, JAW.cy, JAW.cz, true);
      beard.scale.set(JAW.a * 1.05, JAW.b * 1.06, JAW.c * 1.05);
      for (const side of [1, -1]) {
        const burn = this.mesh(new THREE.CapsuleGeometry(0.026, 0.08, 3, 6), k.hair, face, 0.21 * side, 0.01, 0.045);
        burn.rotation.z = 0.1 * side;
      }
    }

    // A wide, open smile: dark mouth, a row of top teeth, a soft lip line.
    const mouthY = -0.087;
    const mouthZ = at(0, mouthY, 0.004);
    const mouth = this.mesh(new THREE.CircleGeometry(0.08, 28, Math.PI, Math.PI), "#3a1410", face, 0, mouthY, mouthZ);
    mouth.scale.set(1, 0.62, 1);
    const teeth = this.mesh(new THREE.CapsuleGeometry(0.011, 0.1, 3, 8), "#f1ece2", face, 0, mouthY - 0.012, mouthZ + 0.001);
    teeth.rotation.z = Math.PI / 2;
    teeth.scale.set(1, 1, 0.35);
    const lip = this.mesh(new THREE.TorusGeometry(0.08, 0.008, 6, 24, Math.PI), "#6a3024", face, 0, mouthY, mouthZ + 0.001);
    lip.rotation.z = Math.PI;
    lip.scale.set(1, 0.62, 1);
    if (k.beard) {
      for (const side of [1, -1]) {
        const stache = this.mesh(
          new THREE.CapsuleGeometry(0.013, 0.058, 3, 8),
          k.hair,
          face,
          0.036 * side,
          -0.066,
          at(0.036, -0.066, 0.008),
        );
        stache.rotation.z = Math.PI / 2 + 0.26 * side;
      }
    }

    /* ----------------------------------------------------------- hair */
    // One shell with a real hairline, then textured clumps for volume on top.
    const shell = this.mesh(trimmedSphere(hairline, "above", 40, 30), k.hairFade ?? k.hair, face, 0, 0.004, -0.004, true);
    shell.scale.set(CRANIUM.a * 1.045, CRANIUM.b * 1.05, CRANIUM.c * 1.045);

    const hairMat = this.mat(k.hair);
    const clumps: [number, number, number, number, number, number, number, number][] =
      k.style === "crop"
        ? [
            [0, 0.22, 0.03, 1.4, 0.42, 1.2, 0, 0],
            [0.07, 0.205, -0.06, 1.1, 0.42, 1.1, 0, -0.2],
            [-0.07, 0.205, -0.06, 1.1, 0.42, 1.1, 0, 0.2],
          ]
        : [
            // x, y, z, scaleX, scaleY, scaleZ, rotX, rotZ — swept up at the
            // front and across to the right, shorter toward the crown
            [0.015, 0.222, 0.128, 1.2, 0.56, 0.8, -0.7, -0.12],
            [0.085, 0.212, 0.095, 0.9, 0.5, 0.85, -0.45, -0.5],
            [-0.07, 0.208, 0.1, 0.9, 0.48, 0.8, -0.45, 0.42],
            [0.03, 0.246, 0.03, 1.3, 0.48, 1.0, -0.25, -0.25],
            [0.085, 0.215, -0.045, 0.95, 0.42, 1.0, 0.05, -0.5],
            [-0.075, 0.212, -0.035, 0.95, 0.42, 1.0, 0.05, 0.45],
          ];
    clumps.forEach(([x, y, z, sx, sy, sz, rx, rz], i) => {
      const { faceted, smooth } = this.clump(0.085, i + 1);
      const c = this.mesh(faceted, hairMat, face, x, y, z);
      c.add(new THREE.Mesh(smooth, this.outlineMat));
      c.scale.set(sx, sy, sz);
      c.rotation.set(rx, 0, rz);
    });
  }

  /* ---------------------------------------------------------------- actions */

  play(name: ActionName, dir = 1) {
    const dur = {
      kick: 0.55,
      celebrate: 1.9,
      wave: 2.4,
      dive: 0.9,
      airplane: 2.1,
      fistpump: 1.5,
      stretch: 1.7,
      bounce: 1.3,
      skid: 0.5,
    }[name];
    this.action = { name, t: 0, dur, dir };
  }

  /** One of the celebrations, picked at random so they never feel canned. */
  celebrate() {
    const options: ActionName[] = ["celebrate", "airplane", "fistpump"];
    this.play(options[Math.floor(Math.random() * options.length)]);
  }

  get busy() {
    return this.action?.name === "kick" || this.action?.name === "dive" || this.action?.name === "skid";
  }

  /**
   * @param speed 0 = standing, 1 = full sprint
   * @param crouch keeper's ready stance, 0..1
   */
  update(dt: number, speed: number, time: number, crouch = 0, pose: Pose = {}) {
    this.run = damp(this.run, speed, 10, dt);
    const s = this.run;
    this.hunch = damp(this.hunch, pose.dribble ?? 0, 6, dt);
    const d = this.hunch;
    // shorter, quicker steps with the ball at your feet
    this.phase += dt * (5 + 8 * s + 2.5 * d * s);
    const sw = Math.sin(this.phase);

    // footsteps: a plant each time the stride crosses over
    if (s > 0.2 && Math.sign(sw) !== Math.sign(this.lastSw)) this.onStep?.(sw > 0 ? 0 : 1, s);
    this.lastSw = sw;

    // bank into turns, lean with acceleration, glance at the ball
    this.roll = damp(this.roll, THREE.MathUtils.clamp(-(pose.turn ?? 0) * s * 0.07, -0.28, 0.28), 8, dt);
    this.lean = damp(this.lean, THREE.MathUtils.clamp((pose.accel ?? 0) * 0.018, -0.18, 0.2), 6, dt);
    const lookTarget = pose.look == null ? 0 : THREE.MathUtils.clamp(pose.look, -0.85, 0.85);
    this.lookYaw = damp(this.lookYaw, lookTarget, 5, dt);

    // idle fidgets, so standing still still feels alive
    if (!this.action && s < 0.05 && crouch === 0) {
      this.idleClock -= dt;
      if (this.idleClock <= 0) {
        this.idleClock = 5 + Math.random() * 4;
        const fidgets: ActionName[] = ["bounce", "stretch", "bounce"];
        this.play(fidgets[Math.floor(Math.random() * fidgets.length)]);
      }
    } else if (s >= 0.05) {
      this.idleClock = 3 + Math.random() * 3;
    }

    // Blink every few seconds: a quick squash of both eyes.
    this.blink -= dt;
    if (this.blink < -0.12) this.blink = 2.2 + Math.random() * 3.5;
    const lid = this.blink < 0 ? 0.12 : 1;
    this.eyes.forEach((e) => (e.scale.y = lid));

    /* base pose: run cycle blended with idle */
    const stride = 0.85 * (1 - 0.3 * d) * (1 + 0.15 * Math.max(0, s - 0.75) * 4);
    const lift = 1.25 + 0.35 * Math.max(0, s - 0.7) * 3.3;
    const hip = [-sw * stride * s - crouch * 0.45 - d * 0.12, sw * stride * s - crouch * 0.45 - d * 0.12];
    const knee = [
      Math.max(0, Math.sin(this.phase + 0.6)) * lift * s + crouch * 0.8 + d * 0.25,
      Math.max(0, Math.sin(this.phase + Math.PI + 0.6)) * lift * s + crouch * 0.8 + d * 0.25,
    ];
    const breathe = Math.sin(time * 2.1) * (1 - s);
    const shX = [sw * 0.8 * s + breathe * 0.04, -sw * 0.8 * s + breathe * 0.04];
    const shZ = [0.1 + crouch * 0.55 + breathe * 0.02, -0.1 - crouch * 0.55 - breathe * 0.02];
    const elX = [-0.25 - 0.8 * s - crouch * 0.5, -0.25 - 0.8 * s - crouch * 0.5];
    const elZ = [0, 0];
    let spineX = 0.16 * s + breathe * 0.02 + crouch * 0.28 + this.lean + d * 0.14;
    const spineY = sw * 0.12 * s;
    let spineZ = 0;
    let bodyY = Math.abs(Math.sin(this.phase)) * 0.07 * s - crouch * 0.12;
    let bodyYaw = 0;
    let bodyRoll = this.roll;
    // idle: a slow, easy look around
    const lookY = Math.sin(time * 0.45) * 0.22 * (1 - s);

    /* action on top */
    const a = this.action;
    if (a) {
      a.t += dt;
      const p = Math.min(a.t / a.dur, 1);
      const w = Math.min(1, p / 0.08, (1 - p) / 0.12);

      if (a.name === "kick") {
        // right leg (index 1): wind up, strike through, follow, recover
        let h: number;
        let kn: number;
        if (p < 0.32) {
          const q = smooth(p / 0.32);
          h = lerp(0, 0.95, q);
          kn = lerp(0.2, 1.45, q);
        } else if (p < 0.52) {
          const q = smooth((p - 0.32) / 0.2);
          h = lerp(0.95, -1.4, q);
          kn = lerp(1.45, 0.05, q);
        } else {
          const q = smooth((p - 0.52) / 0.48);
          h = lerp(-1.4, 0, q);
          kn = lerp(0.05, 0.1, q);
        }
        hip[1] = lerp(hip[1], h, w);
        knee[1] = lerp(knee[1], kn, w);
        hip[0] = lerp(hip[0], 0.1, w);
        shZ[0] = lerp(shZ[0], 1.1, w);
        shZ[1] = lerp(shZ[1], -0.7, w);
        shX[1] = lerp(shX[1], 0.5, w);
        spineX = lerp(spineX, -0.08, w);
      }

      if (a.name === "celebrate") {
        const jump = Math.max(0, Math.sin(p * Math.PI * 3));
        bodyY += jump * 0.5 * w;
        shX[0] = lerp(shX[0], -2.85, w);
        shX[1] = lerp(shX[1], -2.85, w);
        shZ[0] = lerp(shZ[0], 0.35, w);
        shZ[1] = lerp(shZ[1], -0.35, w);
        elX[0] = elX[1] = lerp(elX[0], -0.15, w);
        knee[0] = lerp(knee[0], jump * 1.1, w);
        knee[1] = lerp(knee[1], jump * 1.1, w);
        hip[0] = lerp(hip[0], -jump * 0.6, w);
        hip[1] = lerp(hip[1], -jump * 0.6, w);
        spineX = lerp(spineX, -0.12, w);
        if (p < 0.34) bodyYaw = smooth(p / 0.34) * Math.PI * 2;
      }

      if (a.name === "wave") {
        shZ[1] = lerp(shZ[1], -2.55, w);
        elZ[1] = lerp(0, Math.sin(a.t * 12) * 0.55, w);
        elX[1] = lerp(elX[1], -0.3, w);
        spineZ = lerp(0, 0.06, w);
      }

      if (a.name === "dive") {
        const d = a.dir;
        spineZ = lerp(0, -1.0 * d, w);
        bodyY += Math.sin(p * Math.PI) * 0.35;
        shZ[0] = lerp(shZ[0], d > 0 ? 2.6 : 0.4, w);
        shZ[1] = lerp(shZ[1], d > 0 ? -0.4 : -2.6, w);
        elX[0] = elX[1] = lerp(elX[0], -0.1, w);
      }

      if (a.name === "airplane") {
        // arms out like wings, banking left and right
        shZ[0] = lerp(shZ[0], 1.45, w);
        shZ[1] = lerp(shZ[1], -1.45, w);
        shX[0] = lerp(shX[0], 0, w);
        shX[1] = lerp(shX[1], 0, w);
        elX[0] = elX[1] = lerp(elX[0], -0.05, w);
        spineX = lerp(spineX, 0.28, w);
        bodyRoll = lerp(bodyRoll, Math.sin(a.t * 3.2) * 0.32, w);
        bodyY += Math.abs(Math.sin(a.t * 9)) * 0.05 * w;
      }

      if (a.name === "fistpump") {
        const pump = Math.sin(a.t * 16);
        shX[1] = lerp(shX[1], -2.3 + pump * 0.3, w);
        elX[1] = lerp(elX[1], -1.25 + pump * 0.25, w);
        shZ[1] = lerp(shZ[1], -0.25, w);
        shX[0] = lerp(shX[0], 0.35, w);
        bodyY += Math.max(0, Math.sin(p * Math.PI * 2)) * 0.18 * w;
        spineX = lerp(spineX, -0.1, w);
      }

      if (a.name === "stretch") {
        const up = Math.sin(p * Math.PI);
        shX[0] = lerp(shX[0], -2.9 * up, w);
        shX[1] = lerp(shX[1], -2.9 * up, w);
        elX[0] = elX[1] = lerp(elX[0], -0.1, w);
        spineX = lerp(spineX, -0.12 * up, w);
        bodyY += up * 0.03;
      }

      if (a.name === "bounce") {
        const b = Math.abs(Math.sin(a.t * 9));
        bodyY += b * 0.06 * w;
        knee[0] = lerp(knee[0], 0.25 * (1 - b), w);
        knee[1] = lerp(knee[1], 0.25 * (1 - b), w);
        shZ[0] = lerp(shZ[0], 0.25, w);
        shZ[1] = lerp(shZ[1], -0.25, w);
      }

      if (a.name === "skid") {
        spineX = lerp(spineX, -0.28, w);
        knee[0] = lerp(knee[0], 0.6, w);
        knee[1] = lerp(knee[1], 0.6, w);
        hip[0] = lerp(hip[0], -0.5, w);
        hip[1] = lerp(hip[1], 0.25, w);
        shZ[0] = lerp(shZ[0], 0.9, w);
        shZ[1] = lerp(shZ[1], -0.9, w);
        bodyY -= 0.08 * w;
      }

      if (p >= 1) this.action = null;
    }

    /* write */
    for (let i = 0; i < 2; i++) {
      this.hips[i].rotation.x = hip[i];
      this.knees[i].rotation.x = knee[i];
      this.shoulders[i].rotation.set(shX[i], 0, shZ[i]);
      this.elbows[i].rotation.set(elX[i], 0, elZ[i]);
    }
    this.spine.rotation.set(spineX, spineY, spineZ);
    // glance at the ball when there is one nearby, otherwise look about idly
    const glance = pose.look == null ? lookY : this.lookYaw;
    this.head.rotation.set(-spineX * 0.6, -spineY * 0.8 + glance, -spineZ * 0.5);
    this.body.position.y = bodyY;
    this.body.rotation.set(0, bodyYaw, bodyRoll);
  }

  dispose() {
    const geos = new Set<THREE.BufferGeometry>();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geos.add(o.geometry);
        if (o.material !== this.outlineMat && !Array.from(this.materials.values()).includes(o.material)) {
          (o.material as THREE.Material).dispose();
        }
      }
    });
    geos.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.ramp.dispose();
    this.outlineMat.dispose();
  }
}
