import * as THREE from "three";
import { gsap } from "gsap";
import { Character, type Kit } from "./avatar";
import { createAudio } from "./audio";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";
import { Confetti, Dust, Trails, chargeRing } from "./effects";
import { ABOUT, CONTACT, EXPERIENCE, GOAL, PINS, SKILLS, SPAWN, TROPHIES, WORK, ZONE_ANCHORS } from "./layout";
import { Pins } from "./pins";
import { createGrass } from "./grass";
import { Ball, circle, penetration, type Collider } from "./physics";
import { footballTexture, toonRamp } from "./textures";
import { buildWorld } from "./world";
import { medalFor, type AchievementId, type ChallengeId, type Medal } from "./challenges";

export type ZoneDef = { id: string; name: string; task: string; ids: string[] };

export type GameConfig = {
  zones: ZoneDef[];
  gateLabels: string[];
  projects: { id: string; title: string }[];
  skills: { id: string; title: string }[];
  unlocked: string[];
  /** Indices of golden stars already collected (restored from storage). */
  stars?: number[];
  /** Achievements already earned (so they aren't announced twice). */
  achieved?: string[];
  touch: boolean;
  onReady: () => void;
  onProgress?: (progress: number, label: string) => void;
  onReveal: (id: string, fresh: boolean) => void;
  onEvent: (event: GameEvent) => void;
};

/** Moments the HUD reacts to: banners, the scoreboard, notifications. */
export type GameEvent =
  | { type: "goal"; zone: "about" | "trophies" }
  | { type: "save" }
  | { type: "bullseye" }
  | { type: "unlock"; id: string; fresh: boolean }
  | { type: "strike" }
  | { type: "star"; index: number; count: number; total: number }
  | { type: "challenge"; id: ChallengeId; value: number; medal: Medal }
  | { type: "achievement"; id: AchievementId }
  | { type: "crossbar" };

/** Live state the HUD polls each frame (minimap, prompts, mission tracker). */
export type Snapshot = {
  x: number;
  z: number;
  yaw: number;
  /** 0..1 while a shot is charging, otherwise 0. */
  charge: number;
  /** A ball is within kicking reach. */
  near: boolean;
  /** Zone the player is standing in, if any. */
  zone: string | null;
  /** First zone with something still locked. */
  next: string | null;
  nextDist: number;
  playTime: number;
  keeperZ: number;
  balls: { x: number; z: number }[];
  /** Golden stars still out there. */
  stars: { x: number; z: number; taken: boolean }[];
  started: boolean;
  paused: boolean;
  /** Live readout for the mission being attempted, e.g. "2.4s · gate 1/3". */
  challenge: { id: ChallengeId; text: string } | null;
  /** Metres run this match. */
  distance: number;
};

export type Game = Awaited<ReturnType<typeof createGame>>;

const PLAYER_KIT: Kit = {
  skin: "#8f5c3e",
  skinShade: "#7b4b31",
  hair: "#15100e",
  hairFade: "#1e1613",
  style: "quiff",
  shirt: "#6e5bff",
  trim: "#e8ff4f",
  shorts: "#101018",
  socks: "#e8ff4f",
  boots: "#f4f4f6",
  beard: true,
  back: { name: "RAHUL", number: "17" },
};

const KEEPER_KIT: Kit = {
  style: "crop",
  skin: "#c98f68",
  skinShade: "#b27a55",
  hair: "#3a2a1c",
  shirt: "#ff5c3d",
  trim: "#101018",
  shorts: "#101018",
  socks: "#ff5c3d",
  boots: "#101018",
  gloves: "#e8ff4f",
};

const PLAYER_R = 0.42;
const WALK = 6.4;
const SPRINT = 10;

const damp = (a: number, b: number, rate: number, dt: number) => a + (b - a) * (1 - Math.exp(-rate * dt));
const angleDelta = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/** Hand the main thread back between build phases (works in hidden tabs too). */
const breathe = () => new Promise<void>((r) => setTimeout(r, 0));

/**
 * Builds the stadium and starts the game. Async so the build yields between
 * phases: the loading screen stays smooth and the page never locks up.
 */
export async function createGame(canvas: HTMLCanvasElement, config: GameConfig) {
  const touch = config.touch;
  const lowPower = touch || (navigator.hardwareConcurrency ?? 8) <= 4;

  /* =============================================================== renderer */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: "high-performance" });
  let dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 600);

  // Bloom on the bright stuff only: floodlights, LED boards, beacons, trails.
  // Post-processing renders off-screen, where the canvas's own MSAA doesn't
  // apply, so edges are smoothed by an SMAA pass at the end instead. (A
  // multisampled half-float target would be neater, but some Direct3D drivers
  // render it solid black.)
  let composer: EffectComposer | null = lowPower ? null : new EffectComposer(renderer);
  const smaa = new SMAAPass();
  if (composer) {
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.86));
    composer.addPass(new OutputPass());
    composer.addPass(smaa);
  }

  /**
   * Safety net: if post-processing ever produces a black frame on some GPU,
   * drop it and render directly. Checked on the first frames only — the sky
   * and the pitch are never pure black, so all-zero pixels mean it failed.
   */
  function composerLooksBroken() {
    const gl = renderer.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const px = new Uint8Array(4);
    let lit = 0;
    for (const [fx, fy] of [
      [0.5, 0.5],
      [0.25, 0.3],
      [0.75, 0.3],
      [0.5, 0.85],
      [0.2, 0.8],
    ]) {
      gl.readPixels(Math.floor(w * fx), Math.floor(h * fy), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (px[0] + px[1] + px[2] > 6) lit++;
    }
    return lit === 0;
  }
  function dropComposer() {
    composer?.dispose();
    composer = null;
  }

  // A lost context (driver reset, GPU memory pressure) would otherwise leave a
  // black canvas behind a working HUD. Keep it recoverable, and come back
  // without post-processing, the likeliest culprit.
  const onContextLost = (e: Event) => e.preventDefault();
  const onContextRestored = () => {
    dropComposer();
    resize();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  const ramp = toonRamp();
  const audio = createAudio();

  config.onProgress?.(0.7, "Filling the stands");
  await breathe();
  performance.mark("rvs:world-start");
  const world = await buildWorld(scene, {
    ramp,
    anisotropy: renderer.capabilities.getMaxAnisotropy(),
    lowPower,
    touch,
    gateLabels: config.gateLabels,
    projects: config.projects,
    skills: config.skills,
  });

  const unlocked = new Set(config.unlocked);
  const zoneById = new Map(config.zones.map((z) => [z.id, z]));
  const idsOf = (zone: string) => zoneById.get(zone)?.ids ?? [];

  /* ================================================================ player */
  performance.measure("rvs:world", "rvs:world-start");
  await breathe();
  const player = new Character(PLAYER_KIT);
  scene.add(player.root);
  const pos = new THREE.Vector3(SPAWN.x, 0, SPAWN.z);
  let skidCooldown = 0;
  // Every foot plant: a soft step, and a puff of turf when really running.
  player.onStep = (foot, s) => {
    audio.step(s);
    if (s > 0.55) {
      const side = foot === 0 ? 1 : -1;
      dust.emit(pos.x + Math.cos(yaw) * 0.12 * side, pos.z - Math.sin(yaw) * 0.12 * side, s > 0.85 ? 2 : 1);
    }
  };
  const vel = new THREE.Vector3();
  let yaw = Math.PI; // facing north
  player.root.position.copy(pos);
  player.root.rotation.y = yaw;

  const ring = chargeRing();
  scene.add(ring.mesh);
  const dust = new Dust();
  const confetti = new Confetti(lowPower ? 260 : 420);
  scene.add(dust.group, confetti.mesh);

  /* ================================================================ keeper */
  const keeper = new Character(KEEPER_KIT);
  keeper.root.rotation.y = -Math.PI / 2;
  keeper.root.position.set(TROPHIES.keeperX, 0, 0);
  scene.add(keeper.root);
  const keeperCol = circle(TROPHIES.keeperX, 0, 0.5, 2.3, { bounce: 0.65, player: true }) as Extract<
    Collider,
    { kind: "circle" }
  >;
  let keeperZ = 0;
  let keeperDived = false;

  const colliders: Collider[] = [...world.colliders, keeperCol];
  /** The player as a collider for ball contact, moved each frame (not re-created). */
  const playerBody = circle(0, 0, PLAYER_R, 2) as Extract<Collider, { kind: "circle" }>;
  const pins = new Pins(scene, ramp, colliders, PINS.x, PINS.z);
  const grass = createGrass(lowPower ? { count: 22000, radius: 10 } : { count: 64000, radius: 13 });
  scene.add(grass.mesh);

  /* ================================================================= balls */
  const ballMat = new THREE.MeshToonMaterial({ map: footballTexture(), gradientMap: ramp });
  const bounceSound = (s: number) => audio.bounce(s);
  const balls = [
    new Ball("free", 1.3, 8.9, ballMat, { onBounce: bounceSound }),
    new Ball("about", ABOUT.ball.x, ABOUT.ball.z, ballMat, { onBounce: bounceSound }),
    new Ball("experience", EXPERIENCE.ball.x, EXPERIENCE.ball.z, ballMat, { onBounce: bounceSound }),
    new Ball("work", WORK.ball.x, WORK.ball.z, ballMat, { onBounce: bounceSound }),
    new Ball("trophies", TROPHIES.ball.x, TROPHIES.ball.z, ballMat, { onBounce: bounceSound }),
  ];
  balls.forEach((b) => scene.add(b.mesh));
  await breathe();
  const trails = new Trails(balls.length);
  trails.points.renderOrder = 6;
  scene.add(trails.points);
  const prevX = new Map(balls.map((b) => [b, b.pos.x]));
  const expBall = balls.find((b) => b.zone === "experience")!;
  const prevVX = new Map(balls.map((b) => [b, 0]));

  /* ============================================================ guidance */
  const zoneRings = new Map(
    config.zones.map((z) => {
      const a = ZONE_ANCHORS[z.id];
      return [z.id, world.zoneRing(a.x, a.z, z.id === "contact" ? CONTACT.padR + 0.5 : 2.3)];
    }),
  );

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 40, 24, 1, true),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: world.uniforms.uTime, uAlpha: { value: 1 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uAlpha; varying vec2 vUv;
        void main() {
          float fade = pow(1.0 - vUv.y, 1.6);
          float bands = 0.75 + 0.25 * sin(vUv.y * 60.0 - uTime * 6.0);
          gl_FragColor = vec4(vec3(0.91, 1.0, 0.31), fade * bands * 0.45 * uAlpha);
        }`,
    }),
  );
  beacon.position.y = 20;
  beacon.renderOrder = 5;
  scene.add(beacon);

  const arrowShape = new THREE.Shape();
  arrowShape.moveTo(0, 0.55);
  arrowShape.lineTo(0.42, 0);
  arrowShape.lineTo(0.15, 0);
  arrowShape.lineTo(0.15, -0.45);
  arrowShape.lineTo(-0.15, -0.45);
  arrowShape.lineTo(-0.15, 0);
  arrowShape.lineTo(-0.42, 0);
  arrowShape.closePath();
  const arrow = new THREE.Mesh(
    new THREE.ShapeGeometry(arrowShape),
    new THREE.MeshBasicMaterial({ color: "#e8ff4f", transparent: true, opacity: 0, depthWrite: false }),
  );
  arrow.rotation.order = "YXZ";
  arrow.renderOrder = 3;
  scene.add(arrow);

  /* ====================================================== restore progress */
  const syncProps = () => {
    world.targets.forEach((t, i) => unlocked.has(t.id) && world.markTarget(t, i));
    world.gates.forEach((g, i) => {
      const id = idsOf("experience")[i];
      if (id && unlocked.has(id)) markGate(i);
    });
    // Skills finished in an earlier visit: leave the orbs out for time trials.
    const skillsDone = idsOf("skills").every((id) => unlocked.has(id));
    world.orbs.forEach((o) => {
      if (!skillsDone && unlocked.has(o.id) && !o.taken) {
        o.taken = true;
        o.group.visible = false;
      }
    });
  };
  const markGate = (i: number) => {
    const g = world.gates[i];
    if (!g || g.done) return;
    g.done = true;
    const m = g.strip.material as THREE.MeshBasicMaterial;
    m.color.set("#e8ff4f");
    m.opacity = 0.95;
  };
  syncProps();
  for (const i of config.stars ?? []) {
    const st = world.stars[i];
    if (st) {
      st.taken = true;
      st.group.visible = false;
    }
  }

  /* ================================================================= input */
  const keys = new Set<string>();
  const joy = { x: 0, y: 0 };
  let kickHeld = false;
  let paused = true;
  let started = false;

  const GAME_KEYS = new Set([
    "KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "Space", "ShiftLeft", "ShiftRight", "KeyR",
  ]);
  const onKeyDown = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (!GAME_KEYS.has(e.code) || paused) return;
    e.preventDefault();
    if (e.code === "KeyR" && !e.repeat) resetNearestBall();
    keys.add(e.code);
    if (e.code === "Space") kickHeld = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys.delete(e.code);
    if (e.code === "Space") kickHeld = false;
  };
  const onBlur = () => {
    keys.clear();
    kickHeld = false;
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  let zoom = 1;
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    zoom = THREE.MathUtils.clamp(zoom + Math.sign(e.deltaY) * 0.08, 0.7, 1.45);
  };
  canvas.addEventListener("wheel", onWheel, { passive: false });

  function inputVector() {
    if (paused) return { x: 0, z: 0, sprint: false };
    let x = joy.x;
    let z = joy.y;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) x += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) z -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) z += 1;
    const len = Math.hypot(x, z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    // Joystick pushed to the rim sprints on touch.
    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") || Math.hypot(joy.x, joy.y) > 0.92;
    return { x, z, sprint };
  }

  /* ================================================================ reveal */
  let celebrateCam = 0;
  function reveal(id: string, at?: THREE.Vector3, announced = false) {
    const fresh = announced || !unlocked.has(id);
    unlocked.add(id);
    if (!announced) config.onEvent({ type: "unlock", id, fresh });
    player.celebrate();
    if (at) confetti.burst(at.x, at.y + 0.5, at.z, fresh ? 170 : 60);
    if (fresh) {
      audio.unlockChime();
      audio.cheer(true);
      world.uniforms.uCheer.value = 1;
      cheerHold = 1;
    }
    celebrateCam = 1;
    // Let the celebration land before the panel slides in.
    pendingReveals.push({ id, fresh, t: fresh ? 1.45 : 0.35 });
  }

  /* ============================================================ challenges */
  // Mastery layer: every mission is also a scored challenge with a medal.
  let aboutShots = 0;
  let expRun: { start: number; next: number } | null = null;
  const workRun = { shots: 0, hits: new Set<number>() };
  let orbRun: number | null = null;
  const shootOut = { goals: 0, saves: 0, streak: 0 };
  let distance = 0;
  const kickFrom = new Map<Ball, { x: number; z: number }>();
  const achieved = new Set(config.achieved ?? []);
  /** Unlock cards held back while a timed run is in progress. */
  const deferred: { id: string; at: THREE.Vector3 }[] = [];

  function award(id: ChallengeId, value: number) {
    config.onEvent({ type: "challenge", id, value, medal: medalFor(id, value) });
    audio.fanfare();
    // Let the medal have its moment before any unlock card slides in.
    for (const r of pendingReveals) r.t = Math.max(r.t, 2.4);
  }

  function achieve(id: AchievementId) {
    if (achieved.has(id)) return;
    achieved.add(id);
    config.onEvent({ type: "achievement", id });
  }

  /** Release the cards held back during a timed run. */
  function flushDeferred() {
    for (const d of deferred.splice(0)) reveal(d.id, d.at, true);
  }

  function challengeText(): { id: ChallengeId; text: string } | null {
    if (!started) return null;
    if (expRun) return { id: "experience", text: `${(playTime - expRun.start).toFixed(1)}s · gate ${expRun.next}/3` };
    if (orbRun !== null) {
      const got = world.orbs.filter((o) => o.taken).length;
      return { id: "skills", text: `${(playTime - orbRun).toFixed(1)}s · ${got}/${world.orbs.length} orbs` };
    }
    switch (snap.zone) {
      case "about":
        return { id: "about", text: `${aboutShots} ${aboutShots === 1 ? "shot" : "shots"} taken` };
      case "work":
        return { id: "work", text: `${workRun.hits.size}/4 hit · ${workRun.shots} ${workRun.shots === 1 ? "shot" : "shots"}` };
      case "trophies":
        return { id: "trophies", text: `${shootOut.goals}/4 goals · ${shootOut.saves} saved` };
      case "experience":
        return { id: "experience", text: "Clock starts on your first touch" };
      case "skills":
        return { id: "skills", text: "Clock starts on the first orb" };
    }
    return null;
  }

  /* All timing runs on the simulation clock (not wall-clock tweens), so the
     game pauses cleanly and can be stepped deterministically. */
  const pendingReveals: { id: string; fresh: boolean; t: number }[] = [];
  let cheerHold = 0;
  let strikeIn = -1;
  let strikePower = 0;
  let introT = -1;

  function tickTimers(dt: number) {
    // Oldest first, so queued cards open in the order they were earned.
    for (const r of pendingReveals) r.t -= dt;
    while (pendingReveals.length && pendingReveals[0].t <= 0) {
      const r = pendingReveals.shift()!;
      paused = true;
      keys.clear();
      kickHeld = false;
      config.onReveal(r.id, r.fresh);
    }
    // A later card may be due before an earlier one; release any that are.
    for (let i = 0; i < pendingReveals.length; ) {
      const r = pendingReveals[i];
      if (r.t <= 0) {
        pendingReveals.splice(i, 1);
        paused = true;
        config.onReveal(r.id, r.fresh);
      } else i++;
    }

    if (cheerHold > 0) cheerHold -= dt;
    else world.uniforms.uCheer.value *= Math.exp(-1.3 * dt);

    if (strikeIn > 0) {
      strikeIn -= dt;
      if (strikeIn <= 0) strike(strikePower);
    }

    if (introT >= 0) {
      introT += dt;
      const p = Math.min(introT / 2.4, 1);
      camBlend = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      if (p >= 1) {
        introT = -1;
        paused = false;
      }
    }
  }

  /** Slow motion for a beat after a goal: seconds of real time left. */
  let slowMo = 0;

  /* ================================================================== kick */
  let charge = 0;
  let wasHeld = false;
  let kickCooldown = 0;
  const facing = new THREE.Vector3();

  function aim(ball: Ball, power: number) {
    facing.set(Math.sin(yaw), 0, Math.cos(yaw));
    type Cand = { x: number; y: number; z: number; pri: number };
    const cands: Cand[] = [];
    const hw = GOAL.halfWidth;
    // Aim at the post the keeper is furthest from.
    const far = keeperZ > 0 ? -1 : 1;
    cands.push({ x: GOAL.lineX + 0.8, y: 0.9, z: far * (hw - 0.85), pri: 0 });
    cands.push({ x: -GOAL.lineX - 0.8, y: 1.0, z: (Math.random() - 0.5) * (hw - 1), pri: 0 });
    const face = WORK.wall.z + WORK.wall.depth / 2;
    world.targets.forEach((t) => cands.push({ x: t.x, y: t.y, z: face, pri: t.done ? 1 : 0 }));

    let best: Cand | null = null;
    let bestScore = Infinity;
    for (const c of cands) {
      const dx = c.x - ball.pos.x;
      const dz = c.z - ball.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 2 || d > 32) continue;
      const ang = Math.acos(THREE.MathUtils.clamp((dx * facing.x + dz * facing.z) / d, -1, 1));
      if (ang > 0.46) continue;
      const score = ang + c.pri * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }

    if (!best) {
      const s = 9 + 17 * power;
      return { vx: facing.x * s, vy: 1 + 5.5 * power * power, vz: facing.z * s, assisted: false };
    }
    const dx = best.x - ball.pos.x;
    const dz = best.z - ball.pos.z;
    const d = Math.hypot(dx, dz);
    const s = 14 + 12 * power;
    const T = d / s;
    const vy = Math.min(13, (best.y - ball.r + 0.5 * 20 * T * T) / T);
    return { vx: (dx / d) * s, vy, vz: (dz / d) * s, assisted: true };
  }

  function strike(power: number) {
    facing.set(Math.sin(yaw), 0, Math.cos(yaw));
    const footX = pos.x + facing.x * 0.55;
    const footZ = pos.z + facing.z * 0.55;
    // Reach: anything close to the boot, or a little further out if it's in
    // front of you — a dribbled ball runs a stride ahead.
    let target: Ball | null = null;
    let bestD = Infinity;
    for (const b of balls) {
      if (b.pos.y > 1.3 || b.resetIn > 0) continue;
      const dx = b.pos.x - pos.x;
      const dz = b.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      const ahead = d > 1e-3 ? (dx * facing.x + dz * facing.z) / d : 1;
      const inReach = Math.hypot(b.pos.x - footX, b.pos.z - footZ) < 1.4 || (d < 2.5 && ahead > 0.4);
      if (inReach && d < bestD) {
        bestD = d;
        target = b;
      }
    }
    if (!target) {
      dust.emit(footX, footZ, 3);
      return;
    }
    const v = aim(target, power);
    target.vel.set(v.vx, v.vy, v.vz);
    target.cooldown = 0;
    kickFrom.set(target, { x: target.pos.x, z: target.pos.z });
    if (target.zone === "about") aboutShots++;
    if (target.zone === "work") workRun.shots++;
    audio.kick(power);
    dust.emit(target.pos.x, target.pos.z, 6);
    shake = 0.12 + power * 0.25;
    // A big, aimed shot gets the broadcast treatment: the camera rides with it.
    if (v.assisted && power > 0.7 && !lowPower) shotCam = { ball: target, t: 0 };
  }

  function resetNearestBall() {
    let best: Ball | null = null;
    let bestD = Infinity;
    for (const b of balls) {
      const d = Math.hypot(b.home.x - pos.x, b.home.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    best?.reset();
  }

  /* ================================================================ zones */
  const nextZone = () => config.zones.find((z) => !z.ids.every((id) => unlocked.has(id)));
  const ZONES = { about: ABOUT, experience: EXPERIENCE, work: WORK, skills: SKILLS, trophies: TROPHIES, contact: CONTACT };
  const insideBy = (id: string, margin: number) => {
    const z = ZONES[id as keyof typeof ZONES];
    return !!z && Math.hypot(pos.x - z.centre.x, pos.z - z.centre.z) < z.radius + margin;
  };
  const inside = (id: string) => insideBy(id, 0);
  let nearHold = 0;

  /** Is any ball close enough (and in front enough) to be kicked right now? */
  function ballInReach() {
    facing.set(Math.sin(yaw), 0, Math.cos(yaw));
    const footX = pos.x + facing.x * 0.55;
    const footZ = pos.z + facing.z * 0.55;
    for (const b of balls) {
      if (b.pos.y > 1.3 || b.resetIn > 0) continue;
      const dx = b.pos.x - pos.x;
      const dz = b.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      const ahead = d > 1e-3 ? (dx * facing.x + dz * facing.z) / d : 1;
      if (Math.hypot(b.pos.x - footX, b.pos.z - footZ) < 1.4 || (d < 2.5 && ahead > 0.4)) return true;
    }
    return false;
  }

  /* ================================================================ camera */
  let shake = 0;
  let camBlend = 0;
  let orbitT = 0;
  const camPos = new THREE.Vector3(0, 24, 42);
  const camLook = new THREE.Vector3();
  const followPos = new THREE.Vector3();
  const followLook = new THREE.Vector3();
  const orbitPos = new THREE.Vector3();
  const orbitLook = new THREE.Vector3(0, 0, 0);
  // scratch vectors: the camera runs every frame and must not allocate
  const _camA = new THREE.Vector3();
  const _camB = new THREE.Vector3();

  const portrait = () => canvas.clientHeight > canvas.clientWidth;

  let shotCam: { ball: Ball; t: number } | null = null;

  /** Dev-only: pin the camera somewhere specific (for inspecting the avatar). */
  let debugCam: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;

  function updateCamera(dt: number) {
    if (debugCam) {
      camera.position.copy(debugCam.pos);
      camera.lookAt(debugCam.look);
      return;
    }
    orbitT += dt;
    const a = orbitT * 0.07 + 0.4;
    orbitPos.set(Math.sin(a) * 46, 22, Math.cos(a) * 46);

    const z = zoom * (portrait() ? 1.35 : 1) * (1 - celebrateCam * 0.18);
    const lead = 0.28;
    followPos.set(pos.x + vel.x * lead, 8.2 * z, pos.z + 9.6 * z + vel.z * lead);
    followLook.set(pos.x + vel.x * lead, 0.9, pos.z - 1.6 + vel.z * lead);

    // Shot cam: ease onto the ball in flight, hold, ease back to the player.
    if (shotCam) {
      shotCam.t += dt;
      const e = shotCam.t / 1.6;
      const w = Math.min(1, e / 0.2, (1 - e) / 0.35);
      if (e >= 1) shotCam = null;
      else if (w > 0) {
        const bp = shotCam.ball.pos;
        const k = w * w * (3 - 2 * w);
        followPos.lerp(_camA.set(bp.x - 2.5, 3.4, bp.z + 6.2), k);
        followLook.lerp(_camB.set(bp.x, bp.y * 0.5 + 0.6, bp.z - 2), k);
      }
    }

    const t = camBlend * camBlend * (3 - 2 * camBlend);
    const targetPos = _camA.copy(orbitPos).lerp(followPos, t);
    const targetLook = _camB.copy(orbitLook).lerp(followLook, t);
    const rate = camBlend >= 1 ? 5 : 30;
    camPos.set(damp(camPos.x, targetPos.x, rate, dt), damp(camPos.y, targetPos.y, rate, dt), damp(camPos.z, targetPos.z, rate, dt));
    camLook.set(damp(camLook.x, targetLook.x, rate, dt), damp(camLook.y, targetLook.y, rate, dt), damp(camLook.z, targetLook.z, rate, dt));

    camera.position.copy(camPos);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake;
      camera.position.y += (Math.random() - 0.5) * shake;
      shake = Math.max(0, shake - dt * 1.4);
    }
    camera.lookAt(camLook);
    celebrateCam = Math.max(0, celebrateCam - dt * 0.6);
  }

  /* ======================================================= stable shadows */
  const SUN_OFFSET = new THREE.Vector3(-16, 32, 12);
  const sunFwd = SUN_OFFSET.clone().negate().normalize();
  const sunRight = new THREE.Vector3().crossVectors(sunFwd, new THREE.Vector3(0, 1, 0)).normalize();
  const sunUp = new THREE.Vector3().crossVectors(sunRight, sunFwd).normalize();
  const shadowCam = world.sun.shadow.camera;
  const centre = new THREE.Vector3();

  function snapShadow(x: number, z: number) {
    const texel = (shadowCam.right - shadowCam.left) / world.sun.shadow.mapSize.x;
    centre.set(x, 0, z);
    const r = centre.dot(sunRight);
    const u = centre.dot(sunUp);
    centre.addScaledVector(sunRight, Math.round(r / texel) * texel - r);
    centre.addScaledVector(sunUp, Math.round(u / texel) * texel - u);
    world.sun.target.position.copy(centre);
    world.sun.position.copy(centre).add(SUN_OFFSET);
  }

  /* ================================================================= frame */
  let time = 0;
  let playTime = 0;
  let ready = false;
  let contactInside = false;
  let slow = 0;
  let frames = 0;
  let orbStep = 0;
  let orbRespawn = 0;
  let waveClock = 1.5;
  // THREE.Clock is deprecated in r186; Timer also zeroes delta while the tab is hidden.
  const timer = new THREE.Timer();
  timer.connect(document);

  function frame(timestamp?: number) {
    timer.update(timestamp);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    // Slow motion eases back to full speed over the goal celebration.
    slowMo = Math.max(0, slowMo - dt);
    const scale = slowMo > 0 ? 0.3 + 0.7 * Math.pow(1 - Math.min(slowMo, 0.9) / 0.9, 3) : 1;
    step(dt * scale);
    render();

    if (!ready) {
      ready = true;
      config.onProgress?.(1, "Kick off");
      config.onReady();
    }

    // Can't hold ~40fps? Trade resolution for smoothness, once. Measured only
    // once play has settled (not during the fly-in), over ~5 seconds, and only
    // on sustained slowness — a one-off hitch must never trigger it.
    if (started && playTime > 3 && frames < 300) {
      frames++;
      if (dt > 0.026) slow++;
      if (frames === 300 && slow > 200 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(1);
        resize();
      }
    }
  }

  function render() {
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function step(dt: number) {
    time += dt;
    tickTimers(dt);

    /* ---------------------------------------------------------- player */
    const input = inputVector();
    const max = input.sprint ? SPRINT : WALK;
    const tx = input.x * max;
    const tz = input.z * max;
    const prevYaw = yaw;
    const prevSpeed = Math.hypot(vel.x, vel.z);

    // Skid: yanking the stick the other way at speed plants the feet first.
    if (prevSpeed > 6.5 && skidCooldown <= 0 && tx * vel.x + tz * vel.z < -0.35 * prevSpeed * max) {
      player.play("skid");
      skidCooldown = 0.9;
      dust.emit(pos.x, pos.z, 8);
      audio.skid();
    }
    skidCooldown = Math.max(0, skidCooldown - dt);
    const accel = Math.hypot(tx, tz) > 0.01 ? 9 : 7;
    vel.x = damp(vel.x, tx, accel, dt);
    vel.z = damp(vel.z, tz, accel, dt);
    pos.x += vel.x * dt;
    pos.z += vel.z * dt;
    for (const c of colliders) {
      if (!c.player) continue;
      const n = penetration(pos.x, pos.z, PLAYER_R, c);
      if (!n) continue;
      pos.x += n.x * n.depth;
      pos.z += n.z * n.depth;
      const vn = vel.x * n.x + vel.z * n.z;
      if (vn < 0) {
        vel.x -= vn * n.x;
        vel.z -= vn * n.z;
      }
    }
    const speed = Math.hypot(vel.x, vel.z);
    if (speed > 0.4 && !player.busy) {
      const want = Math.atan2(vel.x, vel.z);
      yaw += angleDelta(yaw, want) * (1 - Math.exp(-12 * dt));
    }
    player.root.position.copy(pos);
    player.root.rotation.y = yaw;
    // Pose context: bank into turns, lean with acceleration, glance at the
    // nearest ball, crouch over it when dribbling.
    let lookAt: number | null = null;
    let nearest = Infinity;
    let atFeet = 0;
    for (const b of balls) {
      const dx = b.pos.x - pos.x;
      const dz = b.pos.z - pos.z;
      const dd = Math.hypot(dx, dz);
      if (dd < 9 && dd < nearest) {
        nearest = dd;
        lookAt = angleDelta(yaw, Math.atan2(dx, dz));
      }
      if (dd < 1.6 && speed > 1) atFeet = 1;
    }
    player.update(dt, Math.min(1, speed / SPRINT) * (speed > 0.15 ? 1 : 0), time, 0, {
      turn: angleDelta(prevYaw, yaw) / Math.max(dt, 1e-3),
      accel: (speed - prevSpeed) / Math.max(dt, 1e-3),
      look: lookAt,
      dribble: atFeet,
    });

    if (!started) {
      waveClock -= dt;
      if (waveClock <= 0) {
        player.play("wave");
        waveClock = 5.5;
      }
    }

    /* ------------------------------------------------------------ kick */
    kickCooldown = Math.max(0, kickCooldown - dt);
    if (kickHeld && !paused) {
      charge = Math.min(charge + dt, 0.9);
      ring.set(charge / 0.9);
    }
    if (!kickHeld && wasHeld) {
      if (kickCooldown <= 0 && !paused) {
        const power = 0.25 + (charge / 0.9) * 0.75;
        player.play("kick");
        kickCooldown = 0.45;
        // Contact happens as the leg swings through, not on key release.
        strikeIn = 0.19;
        strikePower = power;
      }
      charge = 0;
      ring.set(0);
    }
    wasHeld = kickHeld;
    ring.mesh.position.set(pos.x, 0.3, pos.z);

    /* ---------------------------------------------------------- keeper */
    const tb = balls[4];
    const incoming = tb.vel.x > 5 && tb.pos.x > 30 && tb.pos.x < GOAL.lineX && Math.abs(tb.pos.z) < 12;
    let kTarget = Math.sin(time * 0.9) * 1.8;
    let kSpeed = 2.2;
    if (incoming) {
      const tHit = (TROPHIES.keeperX - tb.pos.x) / tb.vel.x;
      kTarget = THREE.MathUtils.clamp(tb.pos.z + tb.vel.z * tHit, -GOAL.halfWidth + 0.4, GOAL.halfWidth - 0.4);
      kSpeed = 4.6;
      if (!keeperDived && Math.abs(kTarget - keeperZ) > 0.7 && tHit < 0.45) {
        keeperDived = true;
        // keeper faces −X, so his left (+1) is world +Z
        keeper.play("dive", kTarget > keeperZ ? 1 : -1);
      }
    } else if (tb.vel.x <= 0) {
      keeperDived = false;
    }
    const step = THREE.MathUtils.clamp(kTarget - keeperZ, -kSpeed * dt, kSpeed * dt);
    keeperZ += step;
    keeper.root.position.set(TROPHIES.keeperX, 0, keeperZ);
    keeperCol.z = keeperZ;
    keeperCol.r = keeperDived ? 0.85 : 0.5;
    keeper.update(dt, Math.min(1, Math.abs(step / dt) / 6), time, 0.8);

    /* ----------------------------------------------------------- balls */
    for (const b of balls) {
      b.step(dt, colliders);

      // dribbling: running into the ball carries it just ahead of you
      if (b.pos.y < 1.1 && b.resetIn < 0) {
        playerBody.x = pos.x;
        playerBody.z = pos.z;
        const n = penetration(b.pos.x, b.pos.z, b.r, playerBody);
        if (n) {
          b.pos.x += n.x * n.depth;
          b.pos.z += n.z * n.depth;
          const pv = Math.max(0, vel.x * n.x + vel.z * n.z);
          const vn = b.vel.x * n.x + b.vel.z * n.z;
          const want = pv * 1.08 + 0.25;
          if (vn < want) {
            b.vel.x += n.x * (want - vn);
            b.vel.z += n.z * (want - vn);
          }
        }

        // Trap: winding up a shot stops a nearby ball under your foot, so a
        // charged kick never finds the ball has rolled out of reach.
        if ((kickHeld || strikeIn > 0) && b.grounded) {
          const dx = b.pos.x - pos.x;
          const dz = b.pos.z - pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 2.4 && (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / Math.max(d, 1e-3) > 0.2) {
            const k = Math.exp(-9 * dt);
            b.vel.x *= k;
            b.vel.z *= k;
          }
        }
      }

      // lost balls come home
      if (Math.abs(b.pos.x) > 58 || Math.abs(b.pos.z) > 44 || b.pos.y < -2) b.reset();

      // The crossbar is a real bar: the ball rings off it.
      if (Math.abs(b.pos.z) < GOAL.halfWidth + 0.1) {
        for (const side of [-1, 1]) {
          const dx = b.pos.x - side * GOAL.lineX;
          const dy = b.pos.y - GOAL.height;
          const d = Math.hypot(dx, dy);
          const min = b.r + 0.12;
          if (d >= min || d < 1e-4) continue;
          const nx = dx / d;
          const ny = dy / d;
          b.pos.x = side * GOAL.lineX + nx * min;
          b.pos.y = GOAL.height + ny * min;
          const vn = b.vel.x * nx + b.vel.y * ny;
          if (vn < 0) {
            b.vel.x -= 1.6 * vn * nx;
            b.vel.y -= 1.6 * vn * ny;
            if (-vn > 3) {
              audio.ding();
              shake = 0.2;
              config.onEvent({ type: "crossbar" });
              achieve("crossbar");
            }
          }
        }
      }

      // Slalom clock: starts the moment the ball leaves its spot.
      if (b === expBall && !expRun && b.resetIn < 0) {
        const fromHome = Math.hypot(b.pos.x - b.home.x, b.pos.z - b.home.z);
        if (fromHome > 0.4 && fromHome < 3 && Math.hypot(b.vel.x, b.vel.z) > 1) expRun = { start: playTime, next: 0 };
      }
      if (b === expBall && expRun && (b.resetIn > 0 || playTime - expRun.start > 40)) {
        expRun = null;
        flushDeferred();
      }

      if (b.cooldown <= 0 && b.resetIn < 0) {
        const hw = GOAL.halfWidth;
        const underBar = b.pos.y < GOAL.height && Math.abs(b.pos.z) < hw;

        /* east goal — trophies */
        if (underBar && b.pos.x - b.r > GOAL.lineX) {
          b.resetIn = 1.6;
          b.cooldown = 2;
          const id = idsOf("trophies").find((t) => !unlocked.has(t));
          config.onEvent({ type: "goal", zone: "trophies" });
          if (b === tb) {
            shootOut.goals++;
            shootOut.streak++;
            if (shootOut.streak >= 3) achieve("hattrick");
          }
          world.bulgeNet(1, Math.min(1.4, b.vel.length() / 14));
          slowMo = 0.9;
          if (id) reveal(id, b.pos.clone());
          else {
            player.celebrate();
            confetti.burst(b.pos.x, 1, b.pos.z, 90);
            audio.cheer(true);
          }
          if (b === tb && shootOut.goals >= 4) {
            award("trophies", shootOut.saves);
            shootOut.goals = 0;
            shootOut.saves = 0;
          }
        }
        /* west goal — about */
        else if (underBar && b.pos.x + b.r < -GOAL.lineX) {
          b.resetIn = 1.6;
          b.cooldown = 2;
          config.onEvent({ type: "goal", zone: "about" });
          world.bulgeNet(-1, Math.min(1.4, b.vel.length() / 14));
          slowMo = 0.9;
          const aboutId = idsOf("about")[0] ?? "about";
          // First goal opens the card; after that it's pure celebration.
          if (!unlocked.has(aboutId)) reveal(aboutId, b.pos.clone());
          else {
            player.celebrate();
            confetti.burst(b.pos.x, 1, b.pos.z, 110);
            audio.cheer(true);
          }
          if (b.zone === "about") {
            award("about", Math.max(1, aboutShots));
            aboutShots = 0;
          }
        }

        /* keeper save */
        if (b === tb && (prevVX.get(b) ?? 0) > 5 && b.vel.x < 0 && b.pos.x > 42) {
          config.onEvent({ type: "save" });
          shootOut.saves++;
          shootOut.streak = 0;
          audio.groan();
          b.resetIn = 1.4;
          b.cooldown = 1.5;
        }

        /* gates */
        const px = prevX.get(b) ?? b.pos.x;
        world.gates.forEach((g, i) => {
          if (px > g.x && b.pos.x <= g.x && Math.abs(b.pos.z - EXPERIENCE.z) < EXPERIENCE.halfWidth && b.pos.y < 1.5) {
            const id = idsOf("experience")[i];
            const at = new THREE.Vector3(g.x, 0.5, EXPERIENCE.z);
            markGate(i);
            audio.collect(i);
            confetti.burst(g.x, 0.6, EXPERIENCE.z, 30, 0.5);

            // the slalom: gates in order, on the clock
            if (b === expBall && expRun) {
              if (i === expRun.next) expRun.next++;
              else {
                expRun = null;
                flushDeferred();
              }
            }

            if (id && !unlocked.has(id)) {
              if (expRun && b === expBall) {
                // mid-run: announce now, open the card when the run ends
                unlocked.add(id);
                config.onEvent({ type: "unlock", id, fresh: true });
                deferred.push({ id, at });
              } else reveal(id, at);
            }

            if (b === expBall && expRun && expRun.next === 3) {
              const time = playTime - expRun.start;
              expRun = null;
              player.celebrate();
              audio.cheer(true);
              flushDeferred();
              award("experience", time);
              b.resetIn = 2.2; // back on the spot for another go
            }
          }
        });

        /* targets */
        const face = WORK.wall.z + WORK.wall.depth / 2;
        if (b.pos.z - b.r <= face + 0.08 && Math.abs(b.pos.x) < 15.5) {
          world.targets.forEach((t, i) => {
            if (b.cooldown > 0) return;
            if (Math.hypot(b.pos.x - t.x, b.pos.y - t.y) < WORK.targetR + 0.12) {
              b.cooldown = 2;
              b.resetIn = 1.4;
              t.pulse = 1;
              world.markTarget(t, i);
              config.onEvent({ type: "bullseye" });
              const from = kickFrom.get(b);
              if (from && Math.hypot(from.x - t.x, from.z - face) >= 20) achieve("sniper");
              if (!unlocked.has(t.id)) reveal(t.id, new THREE.Vector3(t.x, t.y, face + 0.5));
              else {
                player.celebrate();
                confetti.burst(t.x, t.y, face + 0.5, 70);
              }
              if (b.zone === "work") {
                workRun.hits.add(i);
                if (workRun.hits.size === world.targets.length) {
                  award("work", workRun.shots);
                  workRun.shots = 0;
                  workRun.hits.clear();
                }
              }
            }
          });
        }
      }
      prevX.set(b, b.pos.x);
      prevVX.set(b, b.vel.x);
      trails.update(balls.indexOf(b), b.pos.x, b.pos.y, b.pos.z, b.vel.length(), dt);
    }

    /* ------------------------------------------------------------ pins */
    const pinEvent = pins.update(dt, balls, pos.x, pos.z, vel.x, vel.z);
    if (pinEvent === "knock") audio.bounce(8);
    if (pinEvent === "strike") {
      audio.cheer(true);
      confetti.burst(PINS.x + 1, 1, PINS.z, 120);
      player.celebrate();
      world.uniforms.uCheer.value = 1;
      cheerHold = 0.8;
      config.onEvent({ type: "strike" });
      achieve("strike");
    }

    /* ------------------------------------------------------------ orbs */
    for (const o of world.orbs) {
      if (o.taken) continue;
      if (Math.hypot(pos.x - o.x, pos.z - o.z) < 1.45) {
        o.taken = true;
        audio.collect(orbStep++);
        gsap.to(o.group.scale, { x: 0, y: 0, z: 0, duration: 0.45, ease: "back.in(2)", onComplete: () => void (o.group.visible = false) });
        confetti.burst(o.x, 1.3, o.z, 35, 0.6);
        // the rush clock starts on the first orb of a full set
        if (orbRun === null && world.orbs.every((x) => x === o || !x.taken)) orbRun = playTime;
        if (!unlocked.has(o.id)) {
          if (orbRun !== null) {
            unlocked.add(o.id);
            config.onEvent({ type: "unlock", id: o.id, fresh: true });
            deferred.push({ id: o.id, at: o.group.position.clone() });
          } else reveal(o.id, o.group.position.clone());
        }
        if (world.orbs.every((x) => x.taken)) {
          const time = orbRun !== null ? playTime - orbRun : null;
          orbRun = null;
          player.celebrate();
          audio.cheer(true);
          flushDeferred();
          if (time !== null) award("skills", time);
          orbRespawn = 6; // put them back out for another run
        }
      }
    }

    if (orbRespawn > 0) {
      orbRespawn -= dt;
      if (orbRespawn <= 0) {
        for (const o of world.orbs) {
          o.taken = false;
          o.group.visible = true;
          gsap.fromTo(o.group.scale, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(2)" });
        }
      }
    }
    if (orbRun !== null && playTime - orbRun > 90) {
      orbRun = null;
      flushDeferred();
    }

    /* ----------------------------------------------------------- stars */
    for (let i = 0; i < world.stars.length; i++) {
      const st = world.stars[i];
      if (st.taken || !started) continue;
      if (Math.hypot(pos.x - st.x, pos.z - st.z) < 1.3) {
        st.taken = true;
        const count = world.stars.filter((x) => x.taken).length;
        audio.collect(count + 3);
        confetti.burst(st.x, 1.2, st.z, 40, 0.6);
        gsap.to(st.group.scale, { x: 0, y: 0, z: 0, duration: 0.35, ease: "back.in(2)", onComplete: () => void (st.group.visible = false) });
        config.onEvent({ type: "star", index: i, count, total: world.stars.length });
        if (count === world.stars.length) achieve("goldenboot");
      }
    }

    /* --------------------------------------------------------- contact */
    const onPad = Math.hypot(pos.x - CONTACT.pad.x, pos.z - CONTACT.pad.z) < CONTACT.padR;
    if (onPad && !contactInside && started) reveal(idsOf("contact")[0] ?? "contact", new THREE.Vector3(CONTACT.pad.x, 1, CONTACT.pad.z));
    contactInside = onPad;

    /* -------------------------------------------------------- guidance */
    const next = started ? nextZone() : undefined;
    const anchor = next ? ZONE_ANCHORS[next.id] : null;
    const beaconMat = beacon.material as THREE.ShaderMaterial;
    if (anchor) {
      beacon.visible = true;
      beacon.position.x = anchor.x;
      beacon.position.z = anchor.z;
      const d = Math.hypot(anchor.x - pos.x, anchor.z - pos.z);
      beaconMat.uniforms.uAlpha.value = damp(beaconMat.uniforms.uAlpha.value, d < 6 ? 0.25 : 1, 4, dt);
      const arrowMat = arrow.material as THREE.MeshBasicMaterial;
      arrowMat.opacity = damp(arrowMat.opacity, d > 9 && !paused ? 0.85 : 0, 5, dt);
      const ang = Math.atan2(anchor.x - pos.x, anchor.z - pos.z);
      arrow.position.set(pos.x + Math.sin(ang) * 1.6, 0.32, pos.z + Math.cos(ang) * 1.6);
      // shape points +Y; laid flat it points −Z, so turn it half a revolution further
      arrow.rotation.set(-Math.PI / 2, ang + Math.PI, 0);
    } else {
      beacon.visible = false;
      (arrow.material as THREE.MeshBasicMaterial).opacity = 0;
    }
    zoneRings.forEach((m, id) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      const done = idsOf(id).every((x) => unlocked.has(x));
      if (done) {
        mat.color.set("#e8ff4f");
        mat.opacity = 0.55;
      } else if (next?.id === id) {
        mat.color.set("#ffffff");
        mat.opacity = 0.45 + Math.sin(time * 4) * 0.25;
      } else {
        mat.color.set("#6e5bff");
        mat.opacity = 0.35;
      }
    });

    /* -------------------------------------------------------- the rest */
    world.update(time, dt);
    dust.update(dt);
    confetti.update(dt);
    snapShadow(pos.x, pos.z);
    updateCamera(dt);

    // grass: follows the player, parts round feet and rolling balls
    grass.update(time, pos.x, pos.z);
    grass.setPusher(0, pos.x, pos.z, 0.95, 0.35 + Math.min(1, speed / 4) * 0.65);
    balls.forEach((b, i) => {
      const rolling = b.grounded ? Math.min(1, 0.4 + Math.hypot(b.vel.x, b.vel.z) / 6) : 0;
      grass.setPusher(i + 1, b.pos.x, b.pos.z, 0.75, rolling);
    });

    if (started && !paused) {
      playTime += dt;
      distance += speed * dt;
      if (distance >= 500) achieve("marathon");
    }
    nearHold = Math.max(0, nearHold - dt);
  }

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setPixelRatio(renderer.getPixelRatio());
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = portrait() ? 58 : 45;
    camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Compile every shader before the first frame, so the stadium never hitches
  // the first time something new comes into view.
  config.onProgress?.(0.88, "Switching on the floodlights");
  updateCamera(0);
  let disposed = false;
  // Async compile needs KHR_parallel_shader_compile; without it, compile up
  // front synchronously (no warning, same result).
  compileInPieces()
    .then(warmUp)
    .catch(() => !disposed && renderer.setAnimationLoop(frame));

  /**
   * Compile shaders one scene branch at a time, yielding in between, so a
   * slow GPU driver never freezes the page in one long block. With
   * KHR_parallel_shader_compile the driver works in the background anyway.
   */
  async function compileInPieces() {
    performance.mark("rvs:compile-start");
    if (renderer.extensions.has("KHR_parallel_shader_compile")) {
      await renderer.compileAsync(scene, camera).catch(() => undefined);
    } else {
      for (const child of [...scene.children]) {
        if (disposed) return;
        renderer.compile(child, camera, scene);
        await breathe();
      }
    }
    performance.measure("rvs:compile", "rvs:compile-start");
  }

  /**
   * Everything a first visit would otherwise pay for on screen — and a return
   * visit gets free from the browser's caches — happens here, behind the
   * loader: SMAA's lookup images decode, every texture uploads, and a few full
   * frames compile the shadow and post-processing shaders. Only then does the
   * loader lift, so the first frame anyone sees is a settled one.
   */
  async function warmUp() {
    performance.mark("rvs:warmup-start");

    // SMAA decodes two lookup images asynchronously; until they land its
    // edge blending reads empty textures and the image shimmers.
    if (composer) {
      const luts = smaa as unknown as { _areaTexture: THREE.Texture; _searchTexture: THREE.Texture };
      await Promise.all(
        [luts._areaTexture, luts._searchTexture].map(async (t) => {
          const img = t.image as HTMLImageElement;
          await img.decode().catch(() => undefined);
          t.needsUpdate = true;
        }),
      );
    }
    if (disposed) return;

    // Upload every texture now, not the first time its object scrolls into
    // view — a few at a time, so the uploads never stack into one freeze.
    const seen = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      if (!mats) return;
      for (const m of Array.isArray(mats) ? mats : [mats]) {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) seen.add(v);
      }
    });
    let n = 0;
    for (const t of seen) {
      renderer.initTexture(t);
      if (++n % 6 === 0) await breathe();
      if (disposed) return;
    }
    config.onProgress?.(0.94, "Warming up");

    // A few real frames: shadow-map shaders, bloom/SMAA programs and render
    // targets all get built here. Then check the post chain actually draws.
    for (let i = 0; i < 4; i++) {
      if (disposed) return;
      updateCamera(0);
      snapShadow(pos.x, pos.z);
      render();
      await breathe();
    }
    if (composer) {
      composer.render();
      if (composerLooksBroken()) dropComposer();
    }
    if (disposed) return;

    performance.measure("rvs:warmup", "rvs:warmup-start");
    performance.mark("rvs:quality-start");
    await autoQuality();
    performance.measure("rvs:quality", "rvs:quality-start");
    if (disposed) return;
    timer.update();
    renderer.setAnimationLoop(frame);
  }

  /**
   * Auto quality, measured rather than guessed: time real frames of the
   * heaviest view (the whole stadium, from the title orbit) and step down only
   * as far as needed for 60 fps. Fast GPUs step *up* to full sharpness.
   */
  let quality = "high";
  async function autoQuality() {
    const gl = renderer.getContext();
    const px = new Uint8Array(4);
    const bench = async () => {
      const times: number[] = [];
      for (let i = 0; i < 4; i++) {
        const t0 = performance.now();
        render();
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // wait for the GPU
        times.push(performance.now() - t0);
        await breathe();
      }
      times.sort((a, b) => a - b);
      return times[1];
    };
    const setDpr = (v: number) => {
      dpr = v;
      renderer.setPixelRatio(v);
      resize();
    };

    let ms = await bench();
    if (ms < 6 && dpr < Math.min(2, window.devicePixelRatio || 1)) {
      setDpr(Math.min(2, window.devicePixelRatio || 1));
      if ((await bench()) > 11) setDpr(Math.max(1, dpr - 0.5));
      return;
    }
    if (ms > 13 && dpr > 1) {
      setDpr(Math.max(1, dpr - 0.5));
      quality = "balanced";
      ms = await bench();
    }
    if (ms > 13) {
      grass.setDensity(0.5);
      ms = await bench();
    }
    if (ms > 15 && composer) {
      dropComposer();
      quality = "fast";
      ms = await bench();
    }
    if (ms > 17) {
      world.sun.shadow.mapSize.set(1024, 1024);
      world.sun.shadow.map?.dispose();
      world.sun.shadow.map = null;
      grass.setDensity(0.3);
      quality = "lite";
    }
  }

  /** Leave the title screen: whistle, crowd, and the camera swoops down to the player. */
  function startMatch() {
    if (started) return;
    started = true;
    audio.unlock();
    introT = 0;
  }

  /** Countdown cues from the HUD: pips, then the whistle and the roar. */
  function cue(kind: "beep" | "go") {
    if (disposed) return; // a late countdown beat after leaving the page
    audio.unlock();
    if (kind === "beep") {
      audio.beep();
      return;
    }
    audio.beep(true);
    audio.whistle();
    audio.cheer(true);
    world.uniforms.uCheer.value = 1;
    cheerHold = 1.4;
    confetti.burst(pos.x, 2.5, pos.z - 1, 150, 1.4);
    player.celebrate();
  }

  if (process.env.NODE_ENV === "development") {
    // Poke at the simulation from the console: __game.pos, __game.balls…
    (window as unknown as { __game: unknown }).__game = {
      pos,
      vel,
      balls,
      keys,
      unlocked,
      start: startMatch,
      /** Pin the camera: __game.cam([x,y,z],[lx,ly,lz]); call with no args to release. */
      cam(p?: [number, number, number], l?: [number, number, number]) {
        debugCam = p && l ? { pos: new THREE.Vector3(...p), look: new THREE.Vector3(...l) } : null;
      },
      get paused() {
        return paused;
      },
      get quality() {
        return { tier: quality, dpr, post: !!composer };
      },
      /** Is the bloom + SMAA pipeline active (or did the self-test fall back)? */
      get postProcessing() {
        return !!composer;
      },
      /** Run the simulation forward synchronously, independent of rAF. */
      advance(seconds: number) {
        for (let t = 0; t < seconds; t += 1 / 60) step(1 / 60);
        renderer.render(scene, camera);
      },
    };
  }

  const snap: Snapshot = {
    x: 0,
    z: 0,
    yaw: 0,
    charge: 0,
    near: false,
    zone: null,
    next: null,
    nextDist: 0,
    playTime: 0,
    keeperZ: 0,
    balls: balls.map(() => ({ x: 0, z: 0 })),
    stars: world.stars.map((st) => ({ x: st.x, z: st.z, taken: st.taken })),
    started: false,
    paused: true,
    challenge: null,
    distance: 0,
  };

  /** Cheap to call every frame: fills and returns one shared object. */
  function snapshot(): Snapshot {
    snap.x = pos.x;
    snap.z = pos.z;
    snap.yaw = yaw;
    snap.charge = kickHeld ? charge / 0.9 : 0;
    if (started && !paused && ballInReach()) nearHold = 0.35;
    snap.near = nearHold > 0 && !paused;
    if (!(snap.zone && insideBy(snap.zone, 2))) snap.zone = config.zones.find((z) => inside(z.id))?.id ?? null;
    const next = nextZone();
    snap.next = next?.id ?? null;
    const a = next ? ZONE_ANCHORS[next.id] : null;
    snap.nextDist = a ? Math.hypot(a.x - pos.x, a.z - pos.z) : 0;
    snap.playTime = playTime;
    snap.keeperZ = keeperZ;
    balls.forEach((b, i) => {
      snap.balls[i].x = b.pos.x;
      snap.balls[i].z = b.pos.z;
    });
    world.stars.forEach((st, i) => (snap.stars[i].taken = st.taken));
    snap.started = started;
    snap.paused = paused;
    snap.challenge = challengeText();
    snap.distance = distance;
    return snap;
  }

  /* ============================================================ public API */
  return {
    start: startMatch,
    cue,
    /** A little reaction from the avatar (title-screen fun). */
    emote(name: "fistpump" | "airplane" | "wave" | "bounce") {
      if (!started && !player.busy) player.play(name);
    },
    snapshot,
    resume() {
      if (!started) return;
      paused = false;
    },
    pause() {
      paused = true;
      keys.clear();
      kickHeld = false;
    },
    setJoystick(x: number, y: number) {
      joy.x = x;
      joy.y = y;
    },
    setKick(down: boolean) {
      if (!paused) kickHeld = down;
    },
    resetBall: resetNearestBall,
    unlockAll(ids: string[]) {
      ids.forEach((id) => unlocked.add(id));
      syncProps();
    },
    setMuted(m: boolean) {
      audio.setMuted(m);
    },
    dispose() {
      disposed = true;
      timer.dispose();
      renderer.setAnimationLoop(null);
      composer?.dispose();
      pins.dispose();
      grass.dispose();
      trails.dispose();
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      audio.dispose();
      world.dispose();
      player.dispose();
      keeper.dispose();
      balls.forEach((b) => b.mesh.geometry.dispose());
      ballMat.map?.dispose();
      ballMat.dispose();
      ring.dispose();
      dust.dispose();
      confetti.dispose();
      beacon.geometry.dispose();
      (beacon.material as THREE.Material).dispose();
      arrow.geometry.dispose();
      (arrow.material as THREE.Material).dispose();
      ramp.dispose();
      renderer.dispose();
    },
  };
}
