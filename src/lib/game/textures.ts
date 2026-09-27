import * as THREE from "three";

/**
 * Every texture in the stadium is drawn at runtime on a 2D canvas — there are
 * no image assets to download, so the world is ready as soon as the JS is.
 */

/** The site's display face (next/font hashes the family name, so read it from CSS). */
export function fontFamily(variable: "--font-display" | "--font-mono" | "--font-sans") {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || "ui-sans-serif, system-ui, sans-serif";
}

function canvas(width: number, height: number) {
  const el = document.createElement("canvas");
  el.width = width;
  el.height = height;
  return [el, el.getContext("2d")!] as const;
}

function toTexture(el: HTMLCanvasElement, anisotropy = 4) {
  const tex = new THREE.CanvasTexture(el);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

/* ------------------------------------------------------------------- grass */

export const FIELD = { halfW: 52, halfD: 38, lineHalfW: 48, lineHalfD: 34 } as const;

/** Mown stripes, speckle and full pitch markings, 20px per world unit. */
export function grassTexture(anisotropy: number) {
  const PX = 20;
  const W = FIELD.halfW * 2 * PX;
  const H = FIELD.halfD * 2 * PX;
  const [el, ctx] = canvas(W, H);
  const u = (x: number) => (x + FIELD.halfW) * PX;
  const v = (z: number) => (z + FIELD.halfD) * PX;

  // stripes
  const stripe = 4;
  for (let i = 0; i * stripe < FIELD.halfW * 2; i++) {
    ctx.fillStyle = i % 2 ? "#1d5a2a" : "#22662f";
    ctx.fillRect(i * stripe * PX, 0, stripe * PX + 1, H);
  }
  // speckle, so the stripes read as grass rather than paint
  for (let i = 0; i < 26000; i++) {
    const light = Math.random() > 0.5;
    ctx.fillStyle = light ? "rgba(140,220,120,0.07)" : "rgba(0,20,0,0.12)";
    ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.82)";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.lineWidth = 0.16 * PX;
  const { lineHalfW: lw, lineHalfD: ld } = FIELD;

  const rect = (x0: number, z0: number, x1: number, z1: number) =>
    ctx.strokeRect(u(x0), v(z0), u(x1) - u(x0), v(z1) - v(z0));
  const dot = (x: number, z: number, r: number) => {
    ctx.beginPath();
    ctx.arc(u(x), v(z), r * PX, 0, Math.PI * 2);
    ctx.fill();
  };

  rect(-lw, -ld, lw, ld);
  ctx.beginPath();
  ctx.moveTo(u(0), v(-ld));
  ctx.lineTo(u(0), v(ld));
  ctx.stroke();
  dot(0, 0, 0.35);

  for (const side of [-1, 1]) {
    const gx = side * lw;
    rect(Math.min(gx, gx - side * 12), -10, Math.max(gx, gx - side * 12), 10);
    rect(Math.min(gx, gx - side * 4), -5, Math.max(gx, gx - side * 4), 5);
    dot(gx - side * 10, 0, 0.3);
    // the "D"
    ctx.beginPath();
    const a = Math.acos(2 / 5);
    if (side > 0) ctx.arc(u(gx - 10), v(0), 5 * PX, Math.PI - a, Math.PI + a);
    else ctx.arc(u(gx + 10), v(0), 5 * PX, -a, a);
    ctx.stroke();
  }
  for (const [cx, cz, s, e] of [
    [-lw, -ld, 0, 0.5],
    [lw, -ld, 0.5, 1],
    [lw, ld, 1, 1.5],
    [-lw, ld, 1.5, 2],
  ]) {
    ctx.beginPath();
    ctx.arc(u(cx), v(cz), 1.2 * PX, s * Math.PI, e * Math.PI);
    ctx.stroke();
  }

  return toTexture(el, anisotropy);
}

/* ---------------------------------------------------------------- football */

/**
 * A real truncated-icosahedron ball: each pixel of an equirectangular map is
 * assigned to its nearest of 32 panel centres (12 pentagons, 20 hexagons).
 * Pentagon cells are black; pixels near a cell border become the seams.
 */
export function footballTexture() {
  const W = 512;
  const H = 256;
  const [el, ctx] = canvas(W, H);
  const img = ctx.createImageData(W, H);

  const t = (1 + Math.sqrt(5)) / 2;
  const ico = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((p) => new THREE.Vector3(...(p as [number, number, number])).normalize());
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const hex = faces.map(([a, b, c]) => ico[a].clone().add(ico[b]).add(ico[c]).normalize());
  const centres = [...ico.map((p) => ({ p, black: true })), ...hex.map((p) => ({ p, black: false }))];

  const dir = new THREE.Vector3();
  for (let y = 0; y < H; y++) {
    const phi = (y / H) * Math.PI;
    for (let x = 0; x < W; x++) {
      const theta = (x / W) * Math.PI * 2;
      dir.set(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      let best = -2;
      let second = -2;
      let black = false;
      for (const c of centres) {
        const d = dir.dot(c.p);
        if (d > best) {
          second = best;
          best = d;
          black = c.black;
        } else if (d > second) second = d;
      }
      const seam = best - second < 0.012;
      const i = (y * W + x) * 4;
      const value = seam ? 70 : black ? 22 : 238;
      img.data[i] = value;
      img.data[i + 1] = value;
      img.data[i + 2] = black && !seam ? 30 : value;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(el);
}

/* -------------------------------------------------------------- floor text */

export type Line = { text: string; size: number; color?: string; font?: string; spacing?: number };

/**
 * Lettering painted on the grass. Returns the texture plus the world-space
 * height that keeps its aspect for a given world width.
 */
export function floorText(lines: Line[], width = 1024) {
  const pad = 24;
  const height = lines.reduce((h, l) => h + l.size * 1.12, 0) + pad * 2;
  const [el, ctx] = canvas(width, Math.ceil(height));

  let y = pad;
  for (const line of lines) {
    const font = `${line.font ? "500" : "600"} ${line.size}px ${line.font ?? fontFamily("--font-display")}`;
    ctx.font = font;
    ctx.fillStyle = line.color ?? "rgba(255,255,255,0.9)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${line.spacing ?? 0}px`;
    }
    ctx.fillText(line.text, width / 2, y, width - pad * 2);
    y += line.size * 1.12;
  }

  return { texture: toTexture(el, 8), aspect: el.height / el.width };
}

/** A round target face: project title on a dark disc, or ticked off once hit. */
export function targetTexture(title: string, index: number, done: boolean) {
  const S = 512;
  const [el, ctx] = canvas(S, S);
  ctx.fillStyle = done ? "#e8ff4f" : "#11111a";
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = done ? "rgba(10,10,12,0.35)" : "rgba(232,255,79,0.35)";
  ctx.lineWidth = 6;
  for (const r of [0.36, 0.24]) {
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S * r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = done ? "#0a0a0c" : "#8f8fa3";
  ctx.font = `500 30px ${fontFamily("--font-mono")}`;
  ctx.fillText(done ? "UNLOCKED" : `PROJECT 0${index + 1}`, S / 2, S * 0.3);
  ctx.fillStyle = done ? "#0a0a0c" : "#f3f3f6";
  ctx.font = `600 78px ${fontFamily("--font-display")}`;
  ctx.fillText(title, S / 2, S / 2, S * 0.8);
  return toTexture(el);
}

/** Billboard label for floating objects. */
export function labelTexture(text: string, accent = false) {
  const [el, ctx] = canvas(512, 128);
  ctx.fillStyle = accent ? "rgba(232,255,79,0.95)" : "rgba(12,12,17,0.82)";
  ctx.beginPath();
  ctx.roundRect(8, 24, 496, 80, 40);
  ctx.fill();
  ctx.strokeStyle = accent ? "rgba(0,0,0,0)" : "rgba(232,255,79,0.5)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = accent ? "#0a0a0c" : "#f3f3f6";
  ctx.font = `600 44px ${fontFamily("--font-display")}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 66, 460);
  return toTexture(el);
}

/* ----------------------------------------------------------------- LED ads */

export function ledTexture(message: string) {
  const [el, ctx] = canvas(2048, 64);
  ctx.fillStyle = "#07070b";
  ctx.fillRect(0, 0, 2048, 64);
  ctx.font = `600 40px ${fontFamily("--font-display")}`;
  ctx.textBaseline = "middle";
  let x = 0;
  let i = 0;
  while (x < 2048) {
    ctx.fillStyle = i % 2 ? "#6e5bff" : "#e8ff4f";
    ctx.fillText(message, x, 34);
    x += ctx.measureText(message).width + 60;
    i++;
  }
  // LED pixel grid
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  for (let gx = 0; gx < 2048; gx += 4) ctx.fillRect(gx, 0, 1, 64);
  for (let gy = 0; gy < 64; gy += 4) ctx.fillRect(0, gy, 2048, 1);
  const tex = toTexture(el);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

/* -------------------------------------------------------------------- kit */

/** Name and number for the back of the shirt. */
export function jerseyBack(name: string, number: string) {
  const [el, ctx] = canvas(256, 320);
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8ff4f";
  ctx.font = `700 52px ${fontFamily("--font-display")}`;
  ctx.fillText(name, 128, 70, 230);
  ctx.font = `700 190px ${fontFamily("--font-display")}`;
  ctx.fillText(number, 128, 270);
  return toTexture(el);
}

/** Three-step ramp for the toon materials. */
export function toonRamp() {
  const tex = new THREE.DataTexture(new Uint8Array([95, 170, 255]), 3, 1, THREE.RedFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Shirt fabric: the kit colour with fine diagonal pinstripes and a soft shoulder-to-hem shade. */
export function jerseyFabric(color: string) {
  const [el, ctx] = canvas(256, 256);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  const shade = ctx.createLinearGradient(0, 0, 0, 256);
  shade.addColorStop(0, "rgba(255,255,255,0.10)");
  shade.addColorStop(1, "rgba(0,0,0,0.16)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = 3;
  for (let i = -256; i < 512; i += 18) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 256, 256);
    ctx.stroke();
  }
  const tex = toTexture(el);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Chest decal: a round crest on the left, the number on the right. */
export function jerseyFront(number: string, accent: string) {
  const [el, ctx] = canvas(256, 128);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(64, 64, 40, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#101018";
  ctx.font = `700 30px ${fontFamily("--font-display")}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RVS", 64, 66);
  ctx.fillStyle = accent;
  ctx.font = `700 64px ${fontFamily("--font-display")}`;
  ctx.fillText(number, 192, 68);
  return toTexture(el);
}
