import * as THREE from "three";
import { box, circle, type Collider } from "./physics";
import {
  FIELD,
  floorText,
  grassTexture,
  labelTexture,
  ledTexture,
  targetTexture,
  type Line,
} from "./textures";
import { ABOUT, CONTACT, EXPERIENCE, GOAL, PINS, SKILLS, STARS, TROPHIES, WORK } from "./layout";

const ACID = "#e8ff4f";
const VIOLET = "#6e5bff";
const EMBER = "#ff5c3d";

export type WorldOptions = {
  ramp: THREE.Texture;
  anisotropy: number;
  lowPower: boolean;
  touch: boolean;
  gateLabels: string[];
  projects: { id: string; title: string }[];
  skills: { id: string; title: string }[];
};

export type Target = { id: string; x: number; y: number; ring: THREE.Mesh; disc: THREE.Mesh; pulse: number; done: boolean };
export type Orb = { id: string; x: number; z: number; group: THREE.Group; taken: boolean; t: number };
export type Gate = { x: number; strip: THREE.Mesh; done: boolean };

/**
 * Builds the stadium: pitch, stands and crowd, floodlights, LED boards, and
 * every interactive prop the zones need. Returns handles for the engine and
 * the static colliders for the physics.
 */
/** Hand the main thread back to the browser for a moment (works in hidden tabs too). */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Async so the build can pause between heavy sections: the loading screen
 * keeps animating instead of freezing while the stadium goes up.
 */
export async function buildWorld(scene: THREE.Scene, o: WorldOptions) {
  const colliders: Collider[] = [];
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(d: T) => (disposables.push(d), d);

  const toon = (color: string, extra: THREE.MeshToonMaterialParameters = {}) =>
    track(new THREE.MeshToonMaterial({ color, gradientMap: o.ramp, ...extra }));

  const uniforms = { uTime: { value: 0 }, uCheer: { value: 0 } };

  /* ================================================================ sky */
  scene.background = new THREE.Color("#07060d");
  scene.fog = new THREE.Fog("#110e20", 75, 200);

  const sky = new THREE.Mesh(
    track(new THREE.SphereGeometry(260, 32, 16)),
    track(
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            float h = clamp(vDir.y, 0.0, 1.0);
            vec3 horizon = vec3(0.14, 0.09, 0.28);
            vec3 zenith = vec3(0.02, 0.02, 0.04);
            gl_FragColor = vec4(mix(horizon, zenith, pow(h, 0.45)), 1.0);
          }`,
      }),
    ),
  );
  scene.add(sky);

  {
    const n = o.lowPower ? 700 : 1600;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const y = 0.15 + Math.random() * 0.85;
      const r = Math.sqrt(1 - y * y);
      pos.set([Math.cos(th) * r * 240, y * 240, Math.sin(th) * r * 240], i * 3);
    }
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(
      g,
      // ≥2px so stars hold steady instead of twinkling in and out between pixels
      track(new THREE.PointsMaterial({ color: "#c9c8ff", size: 2.2 * Math.min(window.devicePixelRatio || 1, 2), sizeAttenuation: false, fog: false })),
    );
    scene.add(stars);
  }

  /* ============================================================= lights */
  scene.add(new THREE.HemisphereLight("#8a84d8", "#0f2a16", 1.1));
  scene.add(new THREE.AmbientLight("#ffffff", 0.25));

  const sun = new THREE.DirectionalLight("#fff4de", 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(o.lowPower ? 1024 : 2048, o.lowPower ? 1024 : 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -26;
  sc.right = sc.top = 26;
  sc.near = 1;
  sc.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  /* ============================================================= ground */
  const outer = new THREE.Mesh(track(new THREE.PlaneGeometry(260, 220)), track(new THREE.MeshLambertMaterial({ color: "#0c0d14" })));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.02;
  outer.receiveShadow = true;
  scene.add(outer);

  const grass = new THREE.Mesh(
    track(new THREE.PlaneGeometry(FIELD.halfW * 2, FIELD.halfD * 2)),
    track(new THREE.MeshLambertMaterial({ map: track(grassTexture(o.anisotropy)) })),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  scene.add(grass);

  await breathe();

  /* ======================================================= floor lettering */
  const paint = (lines: Line[], x: number, z: number, width: number, px = 1024) => {
    const { texture, aspect } = floorText(lines, px);
    track(texture);
    const m = new THREE.Mesh(
      track(new THREE.PlaneGeometry(width, width * aspect)),
      track(
        new THREE.MeshLambertMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          // Pull decals toward the camera in depth, so they never z-fight the grass.
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      ),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.015, z);
    m.receiveShadow = true;
    m.renderOrder = 1;
    scene.add(m);
    return m;
  };

  const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
  const zoneLabel = (title: string, task: string, x: number, z: number, width = 13) =>
    paint(
      [
        { text: title, size: 150, spacing: -4 },
        { text: task.toUpperCase(), size: 44, color: "rgba(232,255,79,0.9)", font: mono, spacing: 6 },
      ],
      x,
      z,
      width,
    );

  paint([{ text: "RAHUL V S", size: 230, spacing: -10 }], 0, -2.2, 31, 1600);
  paint(
    [{ text: "FRONTEND DEVELOPER  ·  THREE.JS × GSAP  ·  #17", size: 54, color: "rgba(232,255,79,0.92)", font: mono, spacing: 8 }],
    0,
    3.4,
    27,
    1600,
  );
  paint(
    [
      {
        text: o.touch
          ? "STICK — MOVE    ·    KICK BUTTON — SHOOT (HOLD FOR POWER)"
          : "WASD / ARROWS — MOVE    ·    SHIFT — SPRINT    ·    SPACE — KICK (HOLD FOR POWER)",
        size: 40,
        color: "rgba(243,243,246,0.55)",
        font: mono,
        spacing: 5,
      },
    ],
    0,
    17.2,
    24,
    1800,
  );

  zoneLabel("ABOUT", "Score in the net", ABOUT.label.x, ABOUT.label.z);
  zoneLabel("EXPERIENCE", "Dribble through every gate", EXPERIENCE.label.x, EXPERIENCE.label.z, 16);
  zoneLabel("WORK", "Hit a target", WORK.label.x, WORK.label.z, 11);
  zoneLabel("SKILLS", "Grab the orbs", SKILLS.label.x, SKILLS.label.z, 10);
  zoneLabel("TROPHIES", "Beat the keeper", TROPHIES.label.x, TROPHIES.label.z);
  zoneLabel("CONTACT", "Step on the pad", CONTACT.label.x, CONTACT.label.z, 11);
  zoneLabel("STRIKE", "Knock all ten down", PINS.label.x, PINS.label.z, 8);

  await breathe();

  /* ====================================================== stands + crowd */
  const standMats = [toon("#15151f"), toon("#1b1b28")];
  const seats: THREE.Vector3[] = [];
  const ROWS = 7;
  const STEP = 1.6;
  const RISE = 0.85;
  const standBox = new THREE.BoxGeometry(1, 1, 1);
  track(standBox);

  const addRow = (cx: number, cz: number, sx: number, sz: number, h: number, row: number) => {
    const m = new THREE.Mesh(standBox, standMats[row % 2]);
    m.scale.set(sx, h, sz);
    m.position.set(cx, h / 2, cz);
    m.receiveShadow = true;
    scene.add(m);
  };

  const density = o.lowPower ? 0.45 : 0.85;
  for (let r = 0; r < ROWS; r++) {
    const h = (r + 1) * RISE;
    const off = 1.2 + r * STEP + STEP / 2;
    // north & south
    for (const s of [-1, 1]) {
      const z = s * (FIELD.halfD + off);
      addRow(0, z, 2 * (FIELD.halfW + 1.2 + ROWS * STEP), STEP, h, r);
      for (let x = -FIELD.halfW - 2; x <= FIELD.halfW + 2; x += 0.95) {
        if (Math.random() < density) seats.push(new THREE.Vector3(x + (Math.random() - 0.5) * 0.2, h, z));
      }
    }
    // east & west
    for (const s of [-1, 1]) {
      const x = s * (FIELD.halfW + off);
      addRow(x, 0, STEP, 2 * (FIELD.halfD + 1.2), h, r);
      for (let z = -FIELD.halfD; z <= FIELD.halfD; z += 0.95) {
        if (Math.random() < density) seats.push(new THREE.Vector3(x, h, z + (Math.random() - 0.5) * 0.2));
      }
    }
  }

  {
    const fan = track(new THREE.CapsuleGeometry(0.2, 0.34, 2, 6));
    fan.translate(0, 0.37, 0);
    const mat = track(new THREE.MeshLambertMaterial());
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uCheer = uniforms.uCheer;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uCheer;")
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float seed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.61;
           transformed.y += 0.035 * sin(uTime * 2.3 + seed * 5.0)
                          + uCheer * max(0.0, sin(uTime * 10.0 + seed * 13.0)) * 0.5;`,
        );
    };
    const crowd = new THREE.InstancedMesh(fan, mat, seats.length);
    const palette = ["#6e5bff", "#e8ff4f", "#ff5c3d", "#e9e9f2", "#2b2b38", "#7fd4ff", "#8f8fa3", "#6e5bff"].map(
      (c) => new THREE.Color(c),
    );
    const m4 = new THREE.Matrix4();
    seats.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      crowd.setMatrixAt(i, m4);
      crowd.setColorAt(i, palette[Math.floor(Math.random() * palette.length)]);
    });
    crowd.frustumCulled = false;
    scene.add(crowd);

    // Heads, bobbing with the same shader (they share the instance positions).
    const headGeo = track(new THREE.SphereGeometry(0.15, 8, 6));
    headGeo.translate(0, 0.9, 0);
    const heads = new THREE.InstancedMesh(headGeo, mat, seats.length);
    const skins = ["#5a3a28", "#8a5a3c", "#b07a55", "#d8a680", "#3a2418"].map((c) => new THREE.Color(c));
    seats.forEach((p, i) => {
      m4.makeTranslation(p.x, p.y, p.z);
      heads.setMatrixAt(i, m4);
      heads.setColorAt(i, skins[Math.floor(Math.random() * skins.length)]);
    });
    heads.frustumCulled = false;
    scene.add(heads);
  }

  await breathe();

  /* ========================================================== LED boards */
  const boards: THREE.Texture[] = [];
  const message = "RAHUL V S   /   FRONTEND DEVELOPER   /   THREE.JS × GSAP   /   OPEN TO WORK   /";
  const boardMat = toon("#0d0d14");
  const addBoard = (x: number, z: number, length: number, rotY: number) => {
    const tex = track(ledTexture(message));
    tex.repeat.x = length / 35;
    boards.push(tex);
    const face = new THREE.Mesh(track(new THREE.PlaneGeometry(length, 1.1)), track(new THREE.MeshBasicMaterial({ map: tex })));
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(length, 1.25, 0.35)), boardMat);
    const g = new THREE.Group();
    face.position.set(0, 0.7, 0.18);
    body.position.set(0, 0.63, 0);
    body.castShadow = true;
    g.add(face, body);
    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    scene.add(g);
  };
  addBoard(0, -FIELD.halfD, FIELD.halfW * 2, 0);
  addBoard(0, FIELD.halfD, FIELD.halfW * 2, Math.PI);
  addBoard(FIELD.halfW, 0, FIELD.halfD * 2, -Math.PI / 2);
  addBoard(-FIELD.halfW, 0, FIELD.halfD * 2, Math.PI / 2);

  // Invisible glass above the boards keeps the balls in play.
  const W = FIELD.halfW;
  const D = FIELD.halfD;
  colliders.push(
    box(-W - 1, W + 1, -D - 1, -D + 0.2, 12, { bounce: 0.5 }),
    box(-W - 1, W + 1, D - 0.2, D + 1, 12, { bounce: 0.5 }),
    box(-W - 1, -W + 0.2, -D, D, 12, { bounce: 0.5 }),
    box(W - 0.2, W + 1, -D, D, 12, { bounce: 0.5 }),
  );

  /* ========================================================= floodlights */
  const beamMat = track(
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      fog: false,
      vertexShader: /* glsl */ `
        varying float vH;
        void main() {
          vH = uv.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vH;
        void main() {
          gl_FragColor = vec4(vec3(1.0, 0.96, 0.85), pow(vH, 2.2) * 0.075);
        }`,
    }),
  );
  const poleMat = toon("#2b2b38");
  const lampMat = track(new THREE.MeshBasicMaterial({ color: "#fffbe8" }));
  for (const [sx, sz] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const x = sx * (W + 14);
    const z = sz * (D + 13);
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.35, 0.6, 28, 8)), poleMat);
    pole.position.set(x, 14, z);
    scene.add(pole);

    const head = new THREE.Group();
    head.position.set(x, 28.5, z);
    head.lookAt(0, 0, 0);
    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(7, 3.4, 0.5)), poleMat);
    head.add(frame);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 2; j++) {
        const lamp = new THREE.Mesh(track(new THREE.CircleGeometry(0.55, 16)), lampMat);
        lamp.position.set(-2.4 + i * 1.6, -0.7 + j * 1.4, 0.26);
        head.add(lamp);
      }
    }
    scene.add(head);

    const len = 52;
    const beam = new THREE.Mesh(track(new THREE.ConeGeometry(15, len, 28, 1, true)), beamMat);
    const dir = new THREE.Vector3(-x * 0.55, -28.5, -z * 0.55).normalize();
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
    beam.position.copy(head.position).addScaledVector(dir, len / 2);
    beam.renderOrder = 8;
    scene.add(beam);
  }

  await breathe();

  /* =============================================================== goals */
  const white = toon("#f4f4f6");
  const netMat = track(new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.32 }));

  const netGrid = (w: number, h: number, step: number) => {
    const pts: number[] = [];
    for (let x = -w / 2; x <= w / 2 + 1e-3; x += step) pts.push(x, 0, 0, x, h, 0);
    for (let y = 0; y <= h + 1e-3; y += step) pts.push(-w / 2, y, 0, w / 2, y, 0);
    const g = track(new THREE.BufferGeometry());
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, netMat);
  };

  const netSprings: { side: number; nets: THREE.Group; x: number; v: number }[] = [];
  const makeGoal = (side: 1 | -1) => {
    const gx = side * GOAL.lineX;
    const hw = GOAL.halfWidth;
    const back = gx + side * GOAL.depth;
    const g = new THREE.Group();
    const postGeo = track(new THREE.CylinderGeometry(0.12, 0.12, GOAL.height, 12));
    for (const s of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, white);
      post.position.set(gx, GOAL.height / 2, s * hw);
      post.castShadow = true;
      g.add(post);
      colliders.push(circle(gx, s * hw, 0.12, GOAL.height, { bounce: 0.7 }));
    }
    const bar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.12, hw * 2 + 0.24, 12)), white);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(gx, GOAL.height, 0);
    bar.castShadow = true;
    g.add(bar);

    // Nets live in their own group anchored on the goal line, so scaling it
    // along X makes the whole net billow outward when the ball hits.
    const nets = new THREE.Group();
    nets.position.set(gx, 0, 0);
    const backNet = netGrid(hw * 2, GOAL.height, 0.3);
    backNet.position.set(side * GOAL.depth, 0, 0);
    backNet.rotation.y = Math.PI / 2;
    nets.add(backNet);
    for (const s of [-1, 1]) {
      const sideNet = netGrid(GOAL.depth, GOAL.height, 0.3);
      sideNet.position.set((side * GOAL.depth) / 2, 0, s * hw);
      nets.add(sideNet);
    }
    // Built upright (depth × width), then laid flat: local +Y becomes −Z.
    const roof = netGrid(GOAL.depth, hw * 2, 0.3);
    roof.rotation.x = -Math.PI / 2;
    roof.position.set((side * GOAL.depth) / 2, GOAL.height, hw);
    nets.add(roof);
    g.add(nets);
    scene.add(g);
    netSprings.push({ side, nets, x: 0, v: 0 });

    const lo = Math.min(gx, back);
    const hi = Math.max(gx, back);
    // Soft nets: they swallow the ball rather than firing it back out.
    colliders.push(
      box(Math.min(back, back + side * 0.3), Math.max(back, back + side * 0.3), -hw, hw, GOAL.height, { bounce: 0.12, player: false }),
      box(lo, hi, -hw - 0.3, -hw, GOAL.height, { bounce: 0.12, player: false }),
      box(lo, hi, hw, hw + 0.3, GOAL.height, { bounce: 0.12, player: false }),
      // players can't walk into the goal
      box(lo, hi + (side > 0 ? 0.3 : 0), -hw, hw, GOAL.height, { ball: false }),
    );
  };
  makeGoal(-1);
  makeGoal(1);

  /* ========================================================= experience */
  const coneGeo = track(new THREE.ConeGeometry(0.3, 0.8, 14));
  const coneMat = toon(EMBER);
  const stripeGeo = track(new THREE.CylinderGeometry(0.19, 0.23, 0.12, 14));
  const gates: Gate[] = EXPERIENCE.gates.map((gx, i) => {
    for (const s of [-1, 1]) {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      const z = EXPERIENCE.z + s * EXPERIENCE.halfWidth;
      cone.position.set(gx, 0.4, z);
      cone.castShadow = true;
      const stripe = new THREE.Mesh(stripeGeo, white);
      stripe.position.set(gx, 0.45, z);
      scene.add(cone, stripe);
      colliders.push(circle(gx, z, 0.28, 0.8, { bounce: 0.5 }));
    }
    const strip = new THREE.Mesh(
      track(new THREE.PlaneGeometry(0.22, EXPERIENCE.halfWidth * 2 - 0.6)),
      track(new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45 })),
    );
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(gx, 0.02, EXPERIENCE.z);
    strip.renderOrder = 2;
    scene.add(strip);
    paint(
      [{ text: (o.gateLabels[i] ?? `GATE ${i + 1}`).toUpperCase(), size: 64, color: "rgba(243,243,246,0.85)", font: mono, spacing: 4 }],
      gx,
      EXPERIENCE.z + EXPERIENCE.halfWidth + 1.3,
      5.5,
    );
    return { x: gx, strip, done: false };
  });

  /* =============================================================== work */
  const { wall } = WORK;
  const wallMesh = new THREE.Mesh(track(new THREE.BoxGeometry(wall.maxX - wall.minX, wall.height, wall.depth)), toon("#151522"));
  wallMesh.position.set(0, wall.height / 2, wall.z);
  wallMesh.castShadow = wallMesh.receiveShadow = true;
  const trim = new THREE.Mesh(track(new THREE.BoxGeometry(wall.maxX - wall.minX, 0.14, wall.depth + 0.04)), toon(ACID));
  trim.position.set(0, wall.height, wall.z);
  scene.add(wallMesh, trim);
  colliders.push(
    box(wall.minX, wall.maxX, wall.z - wall.depth / 2, wall.z + wall.depth / 2, wall.height, { bounce: 0.5 }),
  );

  const face = wall.z + wall.depth / 2 + 0.02;
  const ringGeo = track(new THREE.TorusGeometry(WORK.targetR, 0.09, 8, 48));
  const discGeo = track(new THREE.CircleGeometry(WORK.targetR - 0.05, 48));
  const targets: Target[] = o.projects.slice(0, WORK.targets.length).map((p, i) => {
    const x = WORK.targets[i];
    const ring = new THREE.Mesh(ringGeo, track(new THREE.MeshBasicMaterial({ color: ACID })));
    ring.position.set(x, WORK.targetY, face + 0.05);
    const disc = new THREE.Mesh(discGeo, track(new THREE.MeshBasicMaterial({ map: track(targetTexture(p.title, i, false)) })));
    disc.position.set(x, WORK.targetY, face);
    scene.add(ring, disc);
    return { id: p.id, x, y: WORK.targetY, ring, disc, pulse: 0, done: false };
  });

  const markTarget = (t: Target, i: number) => {
    if (t.done) return;
    t.done = true;
    const mat = t.disc.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
    mat.map = track(targetTexture(o.projects[i].title, i, true));
    mat.needsUpdate = true;
    (t.ring.material as THREE.MeshBasicMaterial).color.set("#ffffff");
  };

  await breathe();

  /* ============================================================= skills */
  const orbGeo = track(new THREE.IcosahedronGeometry(0.5, 0));
  const glowGeo = track(new THREE.SphereGeometry(0.9, 16, 12));
  const orbs: Orb[] = o.skills.map((s, i) => {
    const a = (i / o.skills.length) * Math.PI * 2 - Math.PI / 2;
    const x = SKILLS.centre.x + Math.cos(a) * SKILLS.ring;
    const z = SKILLS.centre.z + Math.sin(a) * SKILLS.ring;
    const g = new THREE.Group();
    g.position.set(x, 1.3, z);
    const core = new THREE.Mesh(orbGeo, toon(i % 2 ? VIOLET : ACID, { emissive: i % 2 ? "#2a1f7a" : "#4a5410" }));
    core.castShadow = true;
    const glow = new THREE.Mesh(
      glowGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: i % 2 ? VIOLET : ACID,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      ),
    );
    const label = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(labelTexture(s.title)), depthWrite: false })));
    label.scale.set(2.6, 0.65, 1);
    label.position.y = 1.3;
    g.add(core, glow, label);
    scene.add(g);
    return { id: s.id, x, z, group: g, taken: false, t: Math.random() * 10 };
  });

  /* ============================================================ contact */
  const pad = new THREE.Mesh(
    track(new THREE.CylinderGeometry(CONTACT.padR, CONTACT.padR, 0.08, 48)),
    track(new THREE.MeshBasicMaterial({ color: ACID, transparent: true, opacity: 0.22 })),
  );
  pad.position.set(CONTACT.pad.x, 0.04, CONTACT.pad.z);
  pad.renderOrder = 2;
  scene.add(pad);

  const envelope = new THREE.Group();
  {
    const paper = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.9, 0.06)), toon("#f3f3f6"));
    paper.castShadow = true;
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-0.7, 0.45);
    flapShape.lineTo(0.7, 0.45);
    flapShape.lineTo(0, -0.08);
    flapShape.closePath();
    const flapGeo = track(new THREE.ShapeGeometry(flapShape));
    const flapMat = toon(VIOLET, { side: THREE.DoubleSide });
    const front = new THREE.Mesh(flapGeo, flapMat);
    front.position.z = 0.035;
    const back = new THREE.Mesh(flapGeo, flapMat);
    back.position.z = -0.035;
    envelope.add(paper, front, back);
  }
  envelope.position.set(CONTACT.pad.x, 1.9, CONTACT.pad.z);
  scene.add(envelope);

  /* ========================================================= zone rings */
  const zoneRing = (x: number, z: number, r: number) => {
    const m = new THREE.Mesh(
      track(new THREE.RingGeometry(r - 0.12, r, 96)),
      track(
        new THREE.MeshBasicMaterial({
          color: VIOLET,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    m.renderOrder = 2;
    scene.add(m);
    return m;
  };

  /* ============================================================== stars */
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 0.42 : 0.18;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  starShape.closePath();
  const starGeo = track(new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 }));
  starGeo.center();
  const starMat = toon("#ffd24a", { emissive: "#6a4a00" });
  const starGlow = track(
    new THREE.SpriteMaterial({
      map: track(glowTexture()),
      color: "#ffd24a",
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const stars = STARS.map((p, i) => {
    const group = new THREE.Group();
    group.position.set(p.x, 1.1, p.z);
    const star = new THREE.Mesh(starGeo, starMat);
    star.castShadow = true;
    const glow = new THREE.Sprite(starGlow);
    glow.scale.setScalar(2.2);
    glow.renderOrder = 7;
    group.add(star, glow);
    scene.add(group);
    return { x: p.x, z: p.z, group, taken: false, t: i * 0.7 };
  });

  return {
    colliders,
    stars,
    /** Kick the net on the given side (−1 west, 1 east) so it billows. */
    bulgeNet(side: number, strength = 1) {
      const n = netSprings.find((s) => s.side === side);
      if (n) n.v += 2.6 * strength;
    },
    uniforms,
    sun,
    targets,
    markTarget,
    orbs,
    gates,
    pad,
    envelope,
    zoneRing,
    update(time: number, dt: number) {
      uniforms.uTime.value = time;
      boards.forEach((b) => (b.offset.x = (b.offset.x + dt * 0.035) % 1));
      envelope.rotation.y = time * 1.3;
      envelope.position.y = 1.9 + Math.sin(time * 2) * 0.18;
      (pad.material as THREE.MeshBasicMaterial).opacity = 0.16 + Math.sin(time * 3) * 0.06;
      for (const orb of orbs) {
        if (orb.taken) continue;
        orb.t += dt;
        orb.group.position.y = 1.3 + Math.sin(orb.t * 2.2) * 0.22;
        orb.group.children[0].rotation.set(orb.t * 0.7, orb.t * 1.1, 0);
      }
      for (const t of targets) {
        t.pulse = Math.max(0, t.pulse - dt * 1.8);
        t.ring.scale.setScalar(1 + t.pulse * 0.35);
      }
      for (const st of stars) {
        if (st.taken) continue;
        st.t += dt;
        st.group.position.y = 1.1 + Math.sin(st.t * 2) * 0.15;
        st.group.children[0].rotation.y = st.t * 2.2;
      }
      // damped spring: nets billow out, overshoot a touch, settle
      for (const n of netSprings) {
        n.v += (-60 * n.x - 7 * n.v) * dt;
        n.x += n.v * dt;
        n.nets.scale.x = 1 + Math.max(-0.1, n.x) * 0.35;
      }
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export type World = Awaited<ReturnType<typeof buildWorld>>;

/** Soft radial glow for sprites. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.25)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
