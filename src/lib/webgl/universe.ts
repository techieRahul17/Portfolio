import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { buildStars, buildUniverse } from "./shapes";
import { particleFragment, particleVertex, starFragment, starVertex } from "./shaders";

/**
 * The home page's WebGL backdrop: one particle cloud that re-forms into a new
 * shape for every section, driven by where those sections sit in the viewport.
 *
 * It reads section rects directly each frame rather than wiring ScrollTriggers,
 * so it can never disagree with the pinned experience rail about where things
 * are — whatever the DOM says is where the universe goes.
 */

/** Section ids, in page order. Shape `i` belongs to section `i`. */
export const SECTION_IDS = [
  "top",
  "intro",
  "experience",
  "work",
  "skills",
  "achievements",
  "contact",
] as const;

type Vec3 = [number, number, number];

type Stage = {
  pos: Vec3;
  rot: Vec3;
  scale: number;
  opacity: number;
  turbulence: number;
  /** Travel across the section's own scroll, in world units (start → end). */
  drift: Vec3;
  colors: [string, string, string];
};

const ACID = "#e8ff4f";
const VIOLET = "#6e5bff";
const EMBER = "#ff5c3d";
const ICE = "#7fd4ff";
const WHITE = "#f3f3f6";

const DESKTOP: Stage[] = [
  // hero — ringed planet, right of the name
  {
    pos: [2.55, 0.1, 0],
    rot: [0, 0, 0],
    scale: 1,
    opacity: 1,
    turbulence: 0.1,
    drift: [0, 1.4, 0],
    colors: [VIOLET, ACID, EMBER],
  },
  // intro — torus knot
  {
    pos: [0.55, 0, -0.5],
    rot: [0.2, 0, 0],
    scale: 1.15,
    opacity: 0.55,
    turbulence: 0.12,
    drift: [0, 1.6, 0],
    colors: [ACID, VIOLET, WHITE],
  },
  // experience — DNA helix sliding with the horizontal rail
  {
    pos: [0, -0.1, -0.5],
    rot: [0.12, -0.28, 0],
    scale: 1,
    opacity: 0.8,
    turbulence: 0.07,
    drift: [7, 0, 0],
    colors: [VIOLET, ICE, ACID],
  },
  // work — galaxy
  {
    // left, so it drifts behind the see-through project covers
    pos: [-2.9, 0, -2],
    rot: [0, 0, 0],
    scale: 1.25,
    opacity: 0.72,
    turbulence: 0.1,
    drift: [0, 2.4, 0],
    colors: [EMBER, VIOLET, ACID],
  },
  // skills — flying over a wireframe landscape
  {
    pos: [0, 0, 0],
    rot: [0, 0, 0],
    scale: 1,
    opacity: 0.65,
    turbulence: 0.04,
    drift: [0, 0.5, 3.2],
    colors: [VIOLET, ACID, ICE],
  },
  // achievements — gyroscope
  {
    pos: [4.4, 0.1, -2.5],
    rot: [0, 0, 0],
    scale: 1,
    opacity: 0.45,
    turbulence: 0.1,
    drift: [0, 1.6, 0],
    colors: [ACID, EMBER, WHITE],
  },
  // contact — black hole
  {
    pos: [0.4, -1.7, -3],
    rot: [0, 0, 0],
    scale: 1,
    opacity: 0.85,
    turbulence: 0.05,
    drift: [0, 0.8, 0],
    colors: [EMBER, ACID, VIOLET],
  },
];

const MOBILE: Stage[] = [
  { ...DESKTOP[0], pos: [0, 1.3, -1], scale: 0.6, opacity: 0.85 },
  { ...DESKTOP[1], pos: [0, 0.4, -1], scale: 0.62, opacity: 0.45 },
  { ...DESKTOP[2], pos: [0, 0, -1], scale: 0.7, opacity: 0.55, drift: [5, 0, 0] },
  { ...DESKTOP[3], pos: [0, 0.5, -2], scale: 0.8, opacity: 0.5 },
  { ...DESKTOP[4], scale: 0.8, opacity: 0.55, drift: [0, 0.4, 2] },
  { ...DESKTOP[5], pos: [0, 1, -2], scale: 0.6, opacity: 0.4 },
  { ...DESKTOP[6], pos: [0, 0.8, -1], scale: 0.7, opacity: 0.75 },
];

const hex = (h: string): Vec3 => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Frame-rate independent easing toward a target. */
const damp = (current: number, target: number, rate: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-rate * dt));

export type Universe = {
  /** Play the arrival: the cloud implodes from deep space into the planet. */
  intro: () => void;
  dispose: () => void;
};

export function createUniverse(
  canvas: HTMLCanvasElement,
  { reduced, onFirstFrame }: { reduced: boolean; onFirstFrame?: () => void },
): Universe {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x07070a, 1);

  const isSmall = () => window.innerWidth < 768;
  const COUNT = isSmall() ? 10000 : 24000;

  let dpr = Math.min(window.devicePixelRatio || 1, isSmall() ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0, 11);

  /* -------------------------------------------------------------- particles */
  const data = buildUniverse(COUNT);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.planet, 3));
  geometry.setAttribute("aKnot", new THREE.BufferAttribute(data.knot, 3));
  geometry.setAttribute("aHelix", new THREE.BufferAttribute(data.helix, 3));
  geometry.setAttribute("aGalaxy", new THREE.BufferAttribute(data.galaxy, 3));
  geometry.setAttribute("aTerrain", new THREE.BufferAttribute(data.terrain, 3));
  geometry.setAttribute("aGyro", new THREE.BufferAttribute(data.gyroscope, 3));
  geometry.setAttribute("aVortex", new THREE.BufferAttribute(data.blackHole, 3));
  geometry.setAttribute("aRandom", new THREE.BufferAttribute(data.random, 4));
  // Shapes move in the shader, so the CPU-side bounds are meaningless.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const uniforms = {
    uTime: { value: 0 },
    uMorph: { value: 0 },
    uIntro: { value: reduced ? 1 : 0 },
    uSize: { value: isSmall() ? 30 : 36 },
    uPixelRatio: { value: dpr },
    uTurbulence: { value: 0.1 },
    uVelocity: { value: 0 },
    uOpacity: { value: 1 },
    uMouse: { value: new THREE.Vector3(999, 999, 0) },
    uMouseForce: { value: 0 },
    uColorA: { value: new THREE.Vector3() },
    uColorB: { value: new THREE.Vector3() },
    uColorC: { value: new THREE.Vector3() },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const cloud = new THREE.Points(geometry, material);
  scene.add(cloud);

  /* ------------------------------------------------------------------ stars */
  const starData = buildStars(isSmall() ? 900 : 2200);
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starData.positions, 3));
  starGeometry.setAttribute("aSeed", new THREE.BufferAttribute(starData.seeds, 1));
  const starUniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: dpr },
    uIntro: uniforms.uIntro,
  };
  const starMaterial = new THREE.ShaderMaterial({
    vertexShader: starVertex,
    fragmentShader: starFragment,
    uniforms: starUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  /* ------------------------------------------------------------------ state */
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const state = {
    time: 0,
    morph: -1, // -1 = "snap on first frame"
    velocity: 0,
    lastScroll: window.scrollY,
    camZ: reduced ? 11 : 15.5,
    mx: 0,
    my: 0,
    mouseForce: 0,
  };
  const pointer = { x: 0, y: 0, active: false };
  const mouseWorld = new THREE.Vector3();
  const ray = new THREE.Vector3();

  let stages = isSmall() ? MOBILE : DESKTOP;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    stages = isSmall() ? MOBILE : DESKTOP;
    dirty = true;
  };

  /* ----------------------------------------------------------------- scroll */
  const sections: (HTMLElement | null)[] = [];
  const locals = new Array<number>(SECTION_IDS.length).fill(0.5);

  const measure = () => {
    const vh = window.innerHeight;
    let morph = 0;
    for (let k = 0; k < SECTION_IDS.length; k++) {
      let el = sections[k];
      if (!el || !el.isConnected) el = sections[k] = document.getElementById(SECTION_IDS[k]);
      if (!el) continue;

      // A pinned section's real extent is its pin-spacer.
      const box = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
      const rect = box.getBoundingClientRect();

      // 0 as the section's top enters the bottom, 1 as its bottom leaves the top.
      locals[k] = clamp01((vh - rect.top) / (rect.height + vh));

      if (k > 0) {
        const top = el.getBoundingClientRect().top;
        morph += clamp01((vh * 0.85 - top) / (vh * 0.7));
      }
    }
    return morph;
  };

  const layout = {
    pos: [0, 0, 0] as Vec3,
    rot: [0, 0, 0] as Vec3,
    scale: 1,
    opacity: 1,
    turbulence: 0.1,
  };
  const colors = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ] as Vec3[];

  const blendStages = (morph: number) => {
    const i = Math.min(Math.floor(morph), stages.length - 1);
    const j = Math.min(i + 1, stages.length - 1);
    const raw = morph - i;
    const f = raw * raw * (3 - 2 * raw);
    const a = stages[i];
    const b = stages[j];
    const la = locals[i] - 0.5;
    const lb = locals[j] - 0.5;

    for (let k = 0; k < 3; k++) {
      // Drift runs opposite the scroll on X so the helix travels with the rail.
      const da = k === 0 ? -a.drift[k] * la : a.drift[k] * la;
      const db = k === 0 ? -b.drift[k] * lb : b.drift[k] * lb;
      layout.pos[k] = lerp(a.pos[k] + da, b.pos[k] + db, f);
      layout.rot[k] = lerp(a.rot[k], b.rot[k], f);
    }
    layout.scale = lerp(a.scale, b.scale, f);
    layout.opacity = lerp(a.opacity, b.opacity, f);
    layout.turbulence = lerp(a.turbulence, b.turbulence, f);

    for (let c = 0; c < 3; c++) {
      const ca = hex(a.colors[c]);
      const cb = hex(b.colors[c]);
      colors[c] = [lerp(ca[0], cb[0], f), lerp(ca[1], cb[1], f), lerp(ca[2], cb[2], f)];
    }
  };

  /* ---------------------------------------------------------------- pointer */
  const onPointerMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    pointer.active = e.pointerType === "mouse";
  };
  const onPointerLeave = () => {
    pointer.active = false;
  };

  /* ------------------------------------------------------------------ frame */
  let dirty = true;
  let first = true;
  let frames = 0;
  let slowFrames = 0;

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    const scrollY = window.scrollY;

    if (reduced) {
      // Static universe: only redraw when the scroll position actually moved.
      if (!dirty && scrollY === state.lastScroll) return;
      state.lastScroll = scrollY;
      dirty = false;
    }

    const target = measure();
    state.morph = state.morph < 0 || reduced ? target : damp(state.morph, target, 5, dt);

    if (!reduced) {
      state.time += dt;

      const speed = Math.abs(scrollY - state.lastScroll) / Math.max(dt, 1e-3);
      state.lastScroll = scrollY;
      state.velocity = damp(state.velocity, Math.min(speed / 4500, 1), 4, dt);

      state.mx = damp(state.mx, pointer.x, 3, dt);
      state.my = damp(state.my, pointer.y, 3, dt);
      state.mouseForce = damp(state.mouseForce, pointer.active && finePointer ? 1 : 0, 3, dt);
    }

    blendStages(state.morph);

    /* camera: a little parallax off the pointer and a lens kick on fast scroll */
    camera.position.set(state.mx * 0.6, state.my * 0.35, state.camZ);
    camera.lookAt(0, 0, 0);
    const fov = 35 + state.velocity * 7;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    /* cloud transform */
    const bob = reduced ? 0 : Math.sin(state.time * 0.6) * 0.08;
    cloud.position.set(layout.pos[0], layout.pos[1] + bob, layout.pos[2]);
    cloud.rotation.set(
      layout.rot[0] + state.my * 0.12,
      layout.rot[1] + state.mx * 0.22,
      layout.rot[2],
    );
    cloud.scale.setScalar(layout.scale);

    /* pointer in world space, on the plane the cloud sits in */
    ray.set(pointer.x, pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
    const distance = (layout.pos[2] - camera.position.z) / ray.z;
    mouseWorld.copy(camera.position).addScaledVector(ray, distance);

    uniforms.uTime.value = state.time;
    uniforms.uMorph.value = state.morph;
    uniforms.uTurbulence.value = layout.turbulence;
    uniforms.uOpacity.value = layout.opacity;
    uniforms.uVelocity.value = state.velocity;
    uniforms.uMouse.value.copy(mouseWorld);
    uniforms.uMouseForce.value = state.mouseForce;
    uniforms.uColorA.value.set(...colors[0]);
    uniforms.uColorB.value.set(...colors[1]);
    uniforms.uColorC.value.set(...colors[2]);

    stars.rotation.set(scrollY * 0.00005, state.time * 0.008, 0);
    starUniforms.uTime.value = state.time;

    renderer.render(scene, camera);

    if (first) {
      first = false;
      onFirstFrame?.();
    }

    /* If this machine can't hold ~40fps, give up some resolution — once. */
    if (!reduced && uniforms.uIntro.value >= 1 && frames < 240) {
      frames++;
      if (deltaMs > 25) slowFrames++;
      if (frames === 240 && slowFrames > 120 && dpr > 1) {
        dpr = 1;
        renderer.setPixelRatio(dpr);
        uniforms.uPixelRatio.value = dpr;
        starUniforms.uPixelRatio.value = dpr;
        resize();
      }
    }
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  document.addEventListener("pointerleave", onPointerLeave);
  gsap.ticker.add(tick);

  let introTween: gsap.core.Timeline | null = null;

  return {
    intro() {
      if (reduced || introTween) return;
      introTween = gsap
        .timeline()
        .to(uniforms.uIntro, { value: 1, duration: 3.4, ease: "power2.inOut" }, 0)
        .to(state, { camZ: 11, duration: 3.6, ease: "expo.inOut" }, 0);
    },
    dispose() {
      introTween?.kill();
      gsap.ticker.remove(tick);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      geometry.dispose();
      material.dispose();
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    },
  };
}
