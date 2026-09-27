/**
 * GLSL for the home-page universe.
 *
 * All the motion lives on the GPU: the CPU only nudges a handful of uniforms
 * per frame (time, morph, pointer), so the particle count is limited by fill
 * rate, not by JavaScript.
 */

/* Classic 3D simplex noise — Ashima Arts / Stefan Gustavson, MIT. */
const noise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

const rotations = /* glsl */ `
mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rotZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
`;

export const particleVertex = /* glsl */ `
uniform float uTime;
uniform float uMorph;
uniform float uIntro;
uniform float uSize;
uniform float uPixelRatio;
uniform float uTurbulence;
uniform float uVelocity;
uniform float uOpacity;
uniform vec3 uMouse;
uniform float uMouseForce;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;

attribute vec3 aKnot;
attribute vec3 aHelix;
attribute vec3 aGalaxy;
attribute vec3 aTerrain;
attribute vec3 aGyro;
attribute vec3 aVortex;
attribute vec4 aRandom;

varying vec3 vColor;
varying float vAlpha;

${noise}
${rotations}

const float PI = 3.141592653589793;

/* How far this particle has travelled into shape k. Staggered per particle,
   so a transition ripples through the cloud instead of moving in lockstep. */
float weight(float k) {
  float w = clamp((uMorph - (k - 1.0)) * 1.6 - aRandom.x * 0.6, 0.0, 1.0);
  return w * w * (3.0 - 2.0 * w);
}

void main() {
  float t = uTime;

  /* ---------------------------------------------------------------- shapes */
  vec3 s0 = rotX(0.36) * rotZ(0.24) * (rotY(t * 0.12) * position);
  vec3 s1 = rotX(0.4) * rotY(t * 0.2) * aKnot;
  vec3 s2 = rotX(t * 0.42) * aHelix;
  vec3 s3 = rotX(1.02) * rotZ(0.18) * (rotY(t * 0.09) * aGalaxy);

  vec3 s4 = aTerrain;
  s4.y += sin(s4.x * 0.65 + t * 0.9) * 0.16 + cos(s4.z * 0.8 + t * 0.7) * 0.14;

  vec3 s5 = rotY(t * 0.26) * rotX(t * 0.12) * aGyro;

  // Black hole: an accretion disk whose particles spiral inward, wind up
  // faster near the centre, sink into the gravity well and wrap back out.
  float depth = fract(aVortex.y - t * 0.05);
  float wr = 0.55 + 4.9 * pow(depth, 1.5) + aVortex.z * (0.3 + depth);
  float wa = aVortex.x + t * 0.3 + 2.6 / (wr + 0.15);
  float well = -0.55 / (wr + 0.1) + aVortex.z * 0.25 * depth;
  vec3 s6 = rotX(0.42) * vec3(cos(wa) * wr, well, sin(wa) * wr);

  float w1 = weight(1.0);
  float w2 = weight(2.0);
  float w3 = weight(3.0);
  float w4 = weight(4.0);
  float w5 = weight(5.0);
  float w6 = weight(6.0);

  vec3 p = s0;
  p = mix(p, s1, w1);
  p = mix(p, s2, w2);
  p = mix(p, s3, w3);
  p = mix(p, s4, w4);
  p = mix(p, s5, w5);
  p = mix(p, s6, w6);

  /* Peaks mid-transition: the cloud bursts apart and re-forms. */
  float burst = sin(w1 * PI) + sin(w2 * PI) + sin(w3 * PI)
              + sin(w4 * PI) + sin(w5 * PI) + sin(w6 * PI);

  /* ------------------------------------------------------------------ flow */
  vec3 q = p * 0.42 + vec3(0.0, 0.0, t * 0.12);
  vec3 flow = vec3(
    snoise(q),
    snoise(q + vec3(31.4, 11.2, 0.0)),
    snoise(q + vec3(0.0, 17.7, 23.1))
  );
  p += flow * (uTurbulence + burst * 1.3 + uVelocity * 0.55);
  p += normalize(p + 0.0001) * burst * (0.4 + aRandom.z * 1.4);

  /* ----------------------------------------------------------------- intro */
  float intro = clamp(uIntro * 1.6 - aRandom.y * 0.6, 0.0, 1.0);
  intro = 1.0 - pow(1.0 - intro, 3.0);
  vec3 scatter = normalize(aRandom.xyz - 0.5 + 0.0001) * (12.0 + aRandom.w * 22.0);
  scatter = rotZ((1.0 - intro) * 2.4) * scatter;
  p = mix(scatter, p, intro);

  /* --------------------------------------------------------------- pointer */
  vec4 world = modelMatrix * vec4(p, 1.0);
  vec3 away = world.xyz - uMouse;
  float dist = length(away);
  float force = smoothstep(2.4, 0.0, dist) * uMouseForce;
  world.xyz += normalize(away + 0.0001) * force * 1.15;
  world.xy += vec2(-away.y, away.x) * force * 0.35;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;

  /* ------------------------------------------------------------------ size */
  float size = uSize * (0.3 + aRandom.w * 1.05);
  size *= aRandom.w > 0.975 ? 2.4 : 1.0;
  size *= 1.0 + burst * 0.5 + force * 1.2;
  gl_PointSize = size * uPixelRatio / -mv.z;

  /* ----------------------------------------------------------------- color */
  float n = snoise(p * 0.28 + vec3(t * 0.05)) * 0.5 + 0.5;
  vec3 col = mix(uColorA, uColorB, smoothstep(0.25, 0.85, aRandom.y * 0.55 + n * 0.6));
  col = mix(col, uColorC, smoothstep(0.72, 1.0, n) * 0.85);
  col += vec3(0.55) * force + vec3(0.18) * burst;
  vColor = col;

  float alpha = uOpacity * (0.3 + aRandom.z * 0.7) * intro;
  alpha *= smoothstep(-0.6, -3.5, mv.z);                 // don't blind the camera
  alpha *= mix(1.0, smoothstep(0.0, 0.05, depth) * smoothstep(1.0, 0.75, depth), w6);
  vAlpha = alpha;
}
`;

export const particleFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  // A hot core with a soft halo reads as light rather than as a disc.
  float glow = pow(smoothstep(0.5, 0.0, d), 1.7);
  gl_FragColor = vec4(vColor, glow * vAlpha);
}
`;

export const starVertex = /* glsl */ `
uniform float uTime;
uniform float uPixelRatio;
uniform float uIntro;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (0.7 + aSeed * 1.8) * uPixelRatio;
  float twinkle = 0.5 + 0.5 * sin(uTime * (0.4 + aSeed * 2.2) + aSeed * 60.0);
  vAlpha = (0.18 + 0.62 * twinkle) * (0.35 + 0.65 * uIntro);
}
`;

export const starFragment = /* glsl */ `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  gl_FragColor = vec4(vec3(0.86, 0.88, 1.0), smoothstep(0.5, 0.0, d) * vAlpha);
}
`;
