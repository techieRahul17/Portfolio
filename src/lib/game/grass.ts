import * as THREE from "three";
import { FIELD } from "./textures";

/**
 * Real grass around the player: tens of thousands of blades in one instanced
 * draw call. The blades are fixed in the world — the patch follows the player
 * by wrapping each blade to its nearest copy around them (a torus tiling), and
 * blades fade out toward the patch edge so nothing ever pops in.
 *
 * Everything moves on the GPU: wind gusts, and blades bending away from the
 * player's feet and from rolling balls.
 */
export function createGrass({ count, radius }: { count: number; radius: number }) {
  // One blade: a tapered strip, 3 segments tall, y in 0..1.
  const blade = new THREE.BufferGeometry();
  const w = 0.5;
  const verts = [-w, 0, 0, w, 0, 0, -w * 0.78, 0.33, 0, w * 0.78, 0.33, 0, -w * 0.5, 0.66, 0, w * 0.5, 0.66, 0, 0, 1, 0];
  blade.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  blade.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]);

  const geo = new THREE.InstancedBufferGeometry();
  geo.index = blade.index;
  geo.attributes.position = blade.attributes.position;
  geo.instanceCount = count;

  const offsets = new Float32Array(count * 2);
  const params = new Float32Array(count * 4); // height, width, rotation, shade
  const size = radius * 2;
  for (let i = 0; i < count; i++) {
    offsets[i * 2] = (Math.random() - 0.5) * size;
    offsets[i * 2 + 1] = (Math.random() - 0.5) * size;
    params[i * 4] = 0.1 + Math.pow(Math.random(), 1.6) * 0.16;
    params[i * 4 + 1] = 0.028 + Math.random() * 0.02;
    params[i * 4 + 2] = Math.random() * Math.PI * 2;
    params[i * 4 + 3] = Math.random();
  }
  geo.setAttribute("aOffset", new THREE.InstancedBufferAttribute(offsets, 2));
  geo.setAttribute("aParams", new THREE.InstancedBufferAttribute(params, 4));
  // The patch moves with the player; never let the CPU cull it.
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);

  const pushers = Array.from({ length: 6 }, () => new THREE.Vector4(9999, 9999, 0, 0));
  const uniforms = {
    uTime: { value: 0 },
    uCenter: { value: new THREE.Vector2() },
    uRadius: { value: radius },
    uPush: { value: pushers },
    uHalf: { value: new THREE.Vector2(FIELD.halfW - 0.4, FIELD.halfD - 0.4) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec2 aOffset;
      attribute vec4 aParams;
      uniform float uTime;
      uniform vec2 uCenter;
      uniform float uRadius;
      uniform vec4 uPush[6];
      uniform vec2 uHalf;
      varying float vTip;
      varying float vShade;
      varying vec2 vWorld;
      varying float vFar;

      void main() {
        float size = uRadius * 2.0;
        // nearest copy of this blade to the player: world-fixed, patch-follows
        vec2 world = aOffset + size * floor((uCenter - aOffset) / size + 0.5);

        float d = length(world - uCenter) / uRadius;
        float fade = 1.0 - smoothstep(0.7, 1.0, d);
        // only on the pitch
        fade *= step(abs(world.x), uHalf.x) * step(abs(world.y), uHalf.y);

        float h = aParams.x * fade;
        float t = position.y;
        float c = cos(aParams.z);
        float s = sin(aParams.z);
        // Keep far blades at least ~a pixel wide: sub-pixel geometry
        // sparkles on and off as the camera moves (shimmer).
        float camDist = length(cameraPosition.xz - world);
        vec2 side = vec2(c, s) * position.x * aParams.y * (0.4 + 0.6 * fade) * (1.0 + camDist * 0.085);

        // wind: a slow gust front rolling across the pitch, plus flutter
        float gust = sin(world.x * 0.18 + world.y * 0.11 - uTime * 1.3) * 0.5 + 0.5;
        vec2 wind = vec2(0.8, 0.45) * (0.05 + 0.12 * gust) + vec2(sin(uTime * 3.1 + world.x * 2.3), cos(uTime * 2.7 + world.y * 2.1)) * 0.02;

        // bend away from feet and rolling balls (xy = position, z = radius, w = strength)
        vec2 push = vec2(0.0);
        for (int i = 0; i < 6; i++) {
          vec2 dv = world - uPush[i].xy;
          float dist = length(dv);
          float k = smoothstep(uPush[i].z, 0.0, dist) * uPush[i].w;
          push += (dv / max(dist, 0.001)) * k;
        }

        vec2 bend = (wind + push * 0.32) * t * t;
        vec3 p = vec3(world.x + side.x + bend.x, t * h * (1.0 - 0.35 * length(push)), world.y + side.y + bend.y);

        vTip = t;
        vFar = smoothstep(9.0, 20.0, camDist);
        vShade = aParams.w;
        vWorld = world;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vTip;
      varying float vShade;
      varying vec2 vWorld;
      varying float vFar;

      void main() {
        // match the mown stripes painted on the pitch below
        float stripe = mod(floor((vWorld.x + 52.0) / 4.0), 2.0);
        vec3 base = mix(vec3(0.075, 0.24, 0.1), vec3(0.09, 0.27, 0.115), stripe);
        vec3 tip = mix(vec3(0.3, 0.56, 0.24), vec3(0.36, 0.62, 0.28), stripe);
        vec3 col = mix(base, tip, pow(vTip, 1.3)) * (0.85 + vShade * 0.3);
        // distant blades settle toward the turf colour: less contrast, no sparkle
        col = mix(col, mix(base, tip, 0.35), vFar * 0.7);
        // authored in sRGB; hand three a linear value so the output encoding
        // is right whether we render direct to screen or through post
        gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
        #include <colorspace_fragment>
      }`,
  });

  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;

  return {
    mesh,
    /** Player at index 0, then balls. Each: x, z, radius, strength (0..1). */
    setPusher(i: number, x: number, z: number, radius: number, strength: number) {
      pushers[i]?.set(x, z, radius, strength);
    },
    /** Fraction of blades to draw (auto-quality turns this down on slow GPUs). */
    setDensity(f: number) {
      geo.instanceCount = Math.max(1, Math.floor(count * f));
    },
    update(time: number, cx: number, cz: number) {
      uniforms.uTime.value = time;
      uniforms.uCenter.value.set(cx, cz);
    },
    dispose() {
      blade.dispose();
      geo.dispose();
      material.dispose();
    },
  };
}
