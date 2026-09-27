/**
 * Point clouds for the home-page universe. Every shape has exactly `count`
 * points so the particle system can blend between them on the GPU — particle
 * `i` of one shape flies to particle `i` of the next.
 *
 * Each shape is shuffled independently, so a transition is a cloud dissolving
 * and re-forming rather than a tidy index-order sweep.
 */

type Rand = () => number;

/** Small seeded PRNG: the universe looks identical on every visit. */
function mulberry32(seed: number): Rand {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr: Float32Array, stride: number, rand: Rand) {
  const n = arr.length / stride;
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    for (let k = 0; k < stride; k++) {
      const a = i * stride + k;
      const b = j * stride + k;
      const tmp = arr[a];
      arr[a] = arr[b];
      arr[b] = tmp;
    }
  }
  return arr;
}

/** Random point inside a unit ball, scaled — cheap volumetric jitter. */
function jitter(rand: Rand, amount: number): [number, number, number] {
  let x, y, z;
  do {
    x = rand() * 2 - 1;
    y = rand() * 2 - 1;
    z = rand() * 2 - 1;
  } while (x * x + y * y + z * z > 1);
  return [x * amount, y * amount, z * amount];
}

/** Hero: a ringed planet. Sphere shell + a banded ring, stored untilted. */
function planet(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  const shell = Math.floor(count * 0.68);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    let x, y, z;
    if (i < shell) {
      const yy = 1 - (2 * (i + 0.5)) / shell;
      const r = Math.sqrt(1 - yy * yy);
      const th = golden * i;
      const R = 1.75 * (1 + (rand() - 0.5) * 0.035);
      x = Math.cos(th) * r * R;
      y = yy * R;
      z = Math.sin(th) * r * R;
    } else {
      // Rings with a Cassini-style gap.
      let r;
      do r = 2.35 + Math.pow(rand(), 1.3) * 1.55;
      while (r > 3.02 && r < 3.14);
      const th = rand() * Math.PI * 2;
      x = Math.cos(th) * r;
      y = (rand() - 0.5) * 0.045;
      z = Math.sin(th) * r;
    }
    out.set([x, y, z], i * 3);
  }
  return shuffle(out, 3, rand);
}

/** Intro: a (2,3) torus knot with a soft volumetric tube. */
function torusKnot(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  const p = 2;
  const q = 3;
  const s = 0.62;

  for (let i = 0; i < count; i++) {
    const phi = rand() * Math.PI * 2;
    const r = Math.cos(q * phi) + 2;
    const [jx, jy, jz] = jitter(rand, 0.4 * Math.sqrt(rand()));
    out.set(
      [
        (r * Math.cos(p * phi) + jx) * s,
        (r * Math.sin(p * phi) + jy) * s,
        (-Math.sin(q * phi) + jz) * s * 1.4,
      ],
      i * 3,
    );
  }
  return shuffle(out, 3, rand);
}

/** Experience: a DNA double helix laid along X, matching the sideways rail. */
function helix(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  const half = 7.5;
  const turn = 1.05;
  const R = 1.05;
  const rungGap = 0.42;

  for (let i = 0; i < count; i++) {
    let x = (rand() * 2 - 1) * half;
    let y, z;
    if (rand() < 0.72) {
      const strand = rand() < 0.5 ? 0 : Math.PI;
      const a = x * turn + strand;
      const [jx, jy, jz] = jitter(rand, 0.07);
      x += jx;
      y = Math.cos(a) * R + jy;
      z = Math.sin(a) * R + jz;
    } else {
      x = Math.round(x / rungGap) * rungGap;
      const a = x * turn;
      const f = rand() * 2 - 1;
      const [jx, jy, jz] = jitter(rand, 0.025);
      x += jx;
      y = Math.cos(a) * R * f + jy;
      z = Math.sin(a) * R * f + jz;
    }
    out.set([x, y, z], i * 3);
  }
  return shuffle(out, 3, rand);
}

/** Work: a three-armed spiral galaxy, flat in XZ (tilted in the shader). */
function galaxy(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  const arms = 3;

  for (let i = 0; i < count; i++) {
    if (rand() < 0.12) {
      const [x, y, z] = jitter(rand, 0.55);
      out.set([x, y * 0.6, z], i * 3);
      continue;
    }
    const r = Math.pow(rand(), 1.55) * 4.7 + 0.1;
    const branch = ((i % arms) / arms) * Math.PI * 2;
    const spin = r * 1.15;
    const spread = 0.55 * (0.35 + r * 0.16);
    const sx = Math.pow(rand(), 2.6) * (rand() < 0.5 ? 1 : -1) * spread;
    const sy = Math.pow(rand(), 2.6) * (rand() < 0.5 ? 1 : -1) * spread * 0.35;
    const sz = Math.pow(rand(), 2.6) * (rand() < 0.5 ? 1 : -1) * spread;
    out.set([Math.cos(branch + spin) * r + sx, sy, Math.sin(branch + spin) * r + sz], i * 3);
  }
  return shuffle(out, 3, rand);
}

/** Skills: a wireframe landscape — every point snaps to a grid line. */
function terrain(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  const gap = 0.55;

  for (let i = 0; i < count; i++) {
    let x = (rand() * 2 - 1) * 10.5;
    let z = -8 + rand() * 11.5;
    if (rand() < 0.5) x = Math.round(x / gap) * gap;
    else z = Math.round(z / gap) * gap;
    const h =
      0.6 * Math.sin(x * 0.42) * Math.cos(z * 0.55) +
      0.32 * Math.sin(x * 1.05 + z * 0.7) +
      // Lift the far edge into ridges so the horizon has a silhouette.
      Math.max(0, -z - 3) * 0.22 * (1 + Math.sin(x * 0.8));
    out.set([x, -2.1 + h, z], i * 3);
  }
  return shuffle(out, 3, rand);
}

/** Recognition: a gyroscope — three tilted orbits around a bright core. */
function gyroscope(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  const radii = [1.85, 2.4, 2.95];

  for (let i = 0; i < count; i++) {
    const pick = rand();
    if (pick < 0.16) {
      const [x, y, z] = jitter(rand, 0.6);
      out.set([x, y, z], i * 3);
      continue;
    }
    const k = pick < 0.44 ? 0 : pick < 0.72 ? 1 : 2;
    const th = rand() * Math.PI * 2;
    const [jx, jy, jz] = jitter(rand, 0.045);
    let x = Math.cos(th) * radii[k] + jx;
    let y = jy;
    let z = Math.sin(th) * radii[k] + jz;
    // Tilt each orbit onto its own plane.
    const ax = k * 1.05 + 0.3;
    const az = k * 0.62;
    const y1 = y * Math.cos(ax) - z * Math.sin(ax);
    const z1 = y * Math.sin(ax) + z * Math.cos(ax);
    y = y1;
    z = z1;
    const x2 = x * Math.cos(az) - y * Math.sin(az);
    const y2 = x * Math.sin(az) + y * Math.cos(az);
    x = x2;
    y = y2;
    out.set([x, y, z], i * 3);
  }
  return shuffle(out, 3, rand);
}

/**
 * Contact: a black hole's accretion disk. Stored as parameters, not positions — the shader
 * spirals particles inward over time, so the shape is computed there.
 *   x: angle, y: orbit phase 0..1 (outer → inner), z: radial jitter
 */
function blackHole(count: number, rand: Rand) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out.set([rand() * Math.PI * 2, rand(), (rand() - 0.5) * 0.4], i * 3);
  }
  return out;
}

export function buildUniverse(count: number) {
  const rand = mulberry32(1703);

  const random = new Float32Array(count * 4);
  for (let i = 0; i < random.length; i++) random[i] = rand();

  return {
    planet: planet(count, rand),
    knot: torusKnot(count, rand),
    helix: helix(count, rand),
    galaxy: galaxy(count, rand),
    terrain: terrain(count, rand),
    gyroscope: gyroscope(count, rand),
    blackHole: blackHole(count, rand),
    random,
  };
}

/** A shell of distant stars for depth; parallaxes against the main cloud. */
export function buildStars(count: number) {
  const rand = mulberry32(42);
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const th = rand() * Math.PI * 2;
    const r = 22 + rand() * 40;
    const s = Math.sqrt(1 - u * u);
    positions.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r - 10], i * 3);
    seeds[i] = rand();
  }
  return { positions, seeds };
}
