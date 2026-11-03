#!/usr/bin/env node
/**
 * Generates the social-share banner and the app icon as PNG files:
 *   public/ogp.png   1200x630  (Open Graph / X summary_large_image; X does not accept SVG)
 *   public/icon.png  512x512   (app icon / apple-touch-icon)
 *
 * Usage:
 *   npm install --no-save @expo-google-fonts/orbitron @expo-google-fonts/noto-sans-jp @expo-google-fonts/share-tech-mono
 *   npm run og:generate
 *
 * The fonts are only needed to regenerate the images (the PNGs are committed), so they are not
 * project dependencies. Set OG_FONT_DIR to use another node_modules folder that contains them.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fontModules = resolve(process.env.OG_FONT_DIR ?? join(root, "node_modules"));

const FONTS = [
  "@expo-google-fonts/orbitron/800ExtraBold/Orbitron_800ExtraBold.ttf",
  "@expo-google-fonts/orbitron/900Black/Orbitron_900Black.ttf",
  "@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf",
  "@expo-google-fonts/noto-sans-jp/900Black/NotoSansJP_900Black.ttf",
  "@expo-google-fonts/share-tech-mono/400Regular/ShareTechMono_400Regular.ttf",
];

const missing = FONTS.filter((f) => !existsSync(join(fontModules, f)));
if (missing.length > 0) {
  console.error(`Missing fonts in ${fontModules}:\n  ${missing.join("\n  ")}`);
  console.error(
    "Install them first:\n  npm install --no-save @expo-google-fonts/orbitron @expo-google-fonts/noto-sans-jp @expo-google-fonts/share-tech-mono",
  );
  process.exit(1);
}

// Private fontconfig setup containing only these fonts, so the output never depends on system fonts.
// It must be in place before sharp (libvips/librsvg) initializes fontconfig.
const work = mkdtempSync(join(tmpdir(), "dopyu-og-"));
const fontDir = join(work, "fonts");
mkdirSync(fontDir);
for (const f of FONTS) copyFileSync(join(fontModules, f), join(fontDir, f.split("/").pop()));
writeFileSync(
  join(work, "fonts.conf"),
  `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig><dir>${fontDir}</dir><cachedir>${join(work, "cache")}</cachedir></fontconfig>`,
);
process.env.FONTCONFIG_FILE = join(work, "fonts.conf");

const { default: sharp } = await import("sharp");

const DISPLAY = "Orbitron";
const JP = "Noto Sans JP";
const MONO = "Share Tech Mono";

/* ---------- shared pieces ---------- */

const goldDefs = (id, y1, y2) => `
  <linearGradient id="${id}" x1="0" y1="${y1}" x2="0" y2="${y2}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fffbea"/>
    <stop offset="0.26" stop-color="#ffe9a6"/>
    <stop offset="0.47" stop-color="#f3c350"/>
    <stop offset="0.53" stop-color="#a86d0f"/>
    <stop offset="0.7" stop-color="#f5cd5e"/>
    <stop offset="0.86" stop-color="#fff0bd"/>
    <stop offset="1" stop-color="#c38a1f"/>
  </linearGradient>`;

/** Stroke-style gold trophy centered at (0,0), about 48px tall. */
const trophy = `
  <g fill="url(#goldIcon)">
    <path d="M-15,-21 H15 V-9 A15,15 0 0 1 -15,-9 Z"/>
    <path d="M-15,-17 H-23 V-13 A10,10 0 0 0 -13,-3 L-11,-6 A7,7 0 0 1 -19,-13 V-13 H-15 Z"/>
    <path d="M15,-17 H23 V-13 A10,10 0 0 1 13,-3 L11,-6 A7,7 0 0 0 19,-13 V-13 H15 Z"/>
    <rect x="-3.5" y="5" width="7" height="9"/>
    <rect x="-12" y="14" width="24" height="7" rx="1.5"/>
  </g>
  <path d="M0,-17 L2.4,-12.2 L7.6,-11.5 L3.8,-7.8 L4.7,-2.6 L0,-5 L-4.7,-2.6 L-3.8,-7.8 L-7.6,-11.5 L-2.4,-12.2 Z" fill="#3a2405" fill-opacity="0.55"/>`;

/** Gold stopwatch centered at (0,0), about 48px tall. */
const stopwatch = `
  <g fill="none" stroke="url(#goldIcon)" stroke-linecap="round">
    <circle cx="0" cy="4" r="17" stroke-width="4"/>
    <path d="M-5,-20 H5 M0,-20 V-13" stroke-width="4"/>
    <path d="M13,-11 L17,-15" stroke-width="4"/>
    <path d="M0,4 L0,-6 M0,4 L7,9" stroke-width="3"/>
  </g>
  <circle cx="0" cy="4" r="2.6" fill="#ffe9a6"/>`;

/** Line globe centered at (0,0), radius 11. */
const globe = `
  <g fill="none" stroke="#ffe08a" stroke-width="2">
    <circle r="11"/>
    <ellipse rx="4.8" ry="11"/>
    <path d="M-11,0 H11 M-9.2,-6 H9.2 M-9.2,6 H9.2"/>
  </g>`;

/** L-shaped HUD corner bracket; (x,y) is the corner, (dx,dy) the direction (+1/-1). */
const bracket = (x, y, dx, dy, len = 46) =>
  `<path d="M${x + dx * len},${y} H${x} V${y + dy * len}" fill="none" stroke="#f3c350" stroke-opacity="0.85" stroke-width="3"/>`;

/** Vertical HUD scale with ticks and labels. */
function scale(x, y1, y2, side, labels) {
  const ticks = [];
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const y = y1 + ((y2 - y1) * i) / steps;
    const major = i % 6 === 0;
    const len = major ? 14 : 7;
    ticks.push(`<path d="M${x},${y.toFixed(1)} h${side * len}" stroke="#7dd3fc" stroke-opacity="${major ? 0.55 : 0.28}" stroke-width="1.5"/>`);
    if (major && labels) {
      const label = labels[i / 6];
      ticks.push(
        `<text x="${x + side * 22}" y="${(y + 5).toFixed(1)}" font-family="${MONO}" font-size="14" fill="#7dd3fc" fill-opacity="0.6" text-anchor="${side > 0 ? "start" : "end"}">${label}</text>`,
      );
    }
  }
  return `<path d="M${x},${y1} V${y2}" stroke="#7dd3fc" stroke-opacity="0.35" stroke-width="1.5"/>${ticks.join("")}`;
}

/* ---------- OGP banner 1200x630 ---------- */

function perspectiveFloor() {
  const lines = [];
  const vx = 600;
  const vy = 300;
  for (let i = -14; i <= 14; i++) {
    lines.push(`<path d="M${vx},${vy} L${vx + i * 110},630"/>`);
  }
  // Horizontal lines bunch up toward the horizon
  for (let i = 1; i <= 9; i++) {
    const t = (i / 9) ** 2.1;
    const y = 430 + (630 - 430) * t;
    lines.push(`<path d="M0,${y.toFixed(1)} H1200"/>`);
  }
  return lines.join("");
}

function rays() {
  const out = [];
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16 + 0.1;
    const spread = 0.045;
    const r = 900;
    const x1 = 600 + Math.cos(a - spread) * r;
    const y1 = 268 + Math.sin(a - spread) * r;
    const x2 = 600 + Math.cos(a + spread) * r;
    const y2 = 268 + Math.sin(a + spread) * r;
    out.push(`<path d="M600,268 L${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} Z"/>`);
  }
  return out.join("");
}

const ogp = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0d1838"/>
    <stop offset="0.55" stop-color="#070c1f"/>
    <stop offset="1" stop-color="#020309"/>
  </linearGradient>
  <radialGradient id="glow" cx="600" cy="268" r="470" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#f6c453" stop-opacity="0.42"/>
    <stop offset="0.45" stop-color="#d99a2b" stop-opacity="0.14"/>
    <stop offset="1" stop-color="#d99a2b" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="rayFade" cx="600" cy="268" r="560" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity="1"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </radialGradient>
  <mask id="rayMask"><rect width="1200" height="630" fill="url(#rayFade)"/></mask>
  <radialGradient id="vignette" cx="600" cy="315" r="760" gradientUnits="userSpaceOnUse">
    <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000000" stop-opacity="0.7"/>
  </radialGradient>
  <linearGradient id="floorFade" x1="0" y1="300" x2="0" y2="630" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="1"/>
  </linearGradient>
  <mask id="floorMask"><rect width="1200" height="630" fill="url(#floorFade)"/></mask>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M40,0 H0 V40" fill="none" stroke="#60a5fa" stroke-opacity="0.09" stroke-width="1"/>
  </pattern>
  ${goldDefs("gold", 188, 332)}
  ${goldDefs("goldIcon", -22, 22)}
  <linearGradient id="goldLine" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#f3c350" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#ffe9a6"/>
    <stop offset="1" stop-color="#f3c350" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0b1430" stop-opacity="0"/>
    <stop offset="0.12" stop-color="#101c44" stop-opacity="0.95"/>
    <stop offset="0.88" stop-color="#101c44" stop-opacity="0.95"/>
    <stop offset="1" stop-color="#0b1430" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="sheen" x1="300" y1="190" x2="560" y2="340" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="0.45" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.75"/>
    <stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <filter id="blurBig" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="blurSmall" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
</defs>

<rect width="1200" height="630" fill="url(#bg)"/>
<rect width="1200" height="630" fill="url(#grid)"/>
<g mask="url(#floorMask)" fill="none" stroke="#38bdf8" stroke-opacity="0.32" stroke-width="1.2">${perspectiveFloor()}</g>
<g mask="url(#rayMask)" fill="#f6c453" fill-opacity="0.07">${rays()}</g>
<rect width="1200" height="630" fill="url(#glow)"/>
<path d="M0,300 H1200" stroke="url(#goldLine)" stroke-opacity="0.5" stroke-width="1.5"/>

<!-- HUD frame -->
${bracket(28, 28, 1, 1)}${bracket(1172, 28, -1, 1)}${bracket(28, 602, 1, -1)}${bracket(1172, 602, -1, -1)}
${scale(44, 200, 440, 1, ["5.0", "4.0", "3.0", "2.0", "1.0", "ml"])}
${scale(1156, 200, 440, -1, ["#001", "#010", "#050", "#100", "#195", "RANK"])}

<g font-family="${MONO}">
  <circle cx="58" cy="60" r="5" fill="#ef4444"/>
  <text x="70" y="65" font-size="17" fill="#fca5a5" letter-spacing="3">LIVE</text>
  <text x="50" y="90" font-size="17" fill="#7dd3fc" fill-opacity="0.85" letter-spacing="3">RANKING</text>
  <text x="1150" y="64" font-size="15" fill="#7dd3fc" fill-opacity="0.85" letter-spacing="3" text-anchor="end">STOPWATCH</text>
  <text x="1150" y="92" font-size="24" fill="#ffe9a6" letter-spacing="1" text-anchor="end">00:07:42.19</text>
  <text x="50" y="560" font-size="15" fill="#7dd3fc" fill-opacity="0.85" letter-spacing="3">VOLUME</text>
  <text x="50" y="588" font-size="24" fill="#ffe9a6" letter-spacing="1">4.8 ml</text>
  <text x="1150" y="560" font-size="15" fill="#7dd3fc" fill-opacity="0.85" letter-spacing="3" text-anchor="end">WORLD RANKING</text>
  <text x="1150" y="588" font-size="24" fill="#ffe9a6" letter-spacing="1" text-anchor="end">#001 / 195</text>
  <text x="600" y="592" font-size="16" fill="#94a3c8" letter-spacing="4" text-anchor="middle">#DOPYU   #NutWorldCup</text>
</g>
<g fill="#7dd3fc" fill-opacity="0.5">
  <rect x="140" y="574" width="6" height="14"/><rect x="150" y="568" width="6" height="20"/><rect x="160" y="562" width="6" height="26"/><rect x="170" y="555" width="6" height="33"/>
</g>

<!-- Top badge -->
<g transform="translate(272,94)">${trophy}</g>
<g transform="translate(928,94)">${stopwatch}</g>
<rect x="322" y="69" width="556" height="50" rx="25" fill="#0b1430" fill-opacity="0.85" stroke="#f3c350" stroke-width="1.8"/>
<rect x="327" y="74" width="546" height="40" rx="20" fill="none" stroke="#f3c350" stroke-opacity="0.25" stroke-width="1"/>
<g transform="translate(356,94)">${globe}</g>
<text x="616" y="101.5" font-family="${DISPLAY}" font-weight="800" font-size="19" letter-spacing="2.6" fill="#ffffff" text-anchor="middle">WORLD CHAMPIONSHIP &amp; TRACKER</text>

<!-- Main logo -->
<g font-family="${DISPLAY}" font-weight="900" font-size="196" letter-spacing="10" text-anchor="middle">
  <text x="605" y="332" fill="#f6c453" fill-opacity="0.55" filter="url(#blurBig)">DOPYU</text>
  <text x="605" y="341" fill="#2a1903">DOPYU</text>
  <text x="605" y="337" fill="#6b440a">DOPYU</text>
  <text x="605" y="332" fill="url(#gold)" stroke="#fffaf0" stroke-width="2.6">DOPYU</text>
  <text x="605" y="332" fill="url(#sheen)">DOPYU</text>
</g>

<!-- Tagline ribbon -->
<path d="M120,362 H1080 L1062,424 H138 Z" fill="url(#ribbon)"/>
<path d="M210,362 H990" stroke="url(#goldLine)" stroke-width="2"/>
<path d="M210,424 H990" stroke="url(#goldLine)" stroke-width="2"/>
<text x="600" y="408" text-anchor="middle" font-size="38">
  <tspan font-family="${JP}" font-weight="900" fill="#ffffff">世界射精競技</tspan><tspan font-family="${JP}" font-weight="700" fill="#94a3c8" dx="14">/</tspan><tspan font-family="${DISPLAY}" font-weight="800" font-size="32" fill="#ffd66b" dx="14" letter-spacing="1.5">GLOBAL NUT WORLD CUP</tspan>
</text>

<text x="600" y="476" text-anchor="middle" font-family="${JP}" font-size="24">
  <tspan font-weight="700" fill="#c7d2ee">Time. Volume (ml). National Ranking.</tspan><tspan font-weight="700" fill="#64708a" dx="10">—</tspan><tspan font-weight="900" fill="#ffe9a6" dx="10">記録せよ、世界の頂点へ。</tspan>
</text>

<rect width="1200" height="630" fill="url(#vignette)"/>
</svg>`;

/* ---------- App icon 512x512 ---------- */

function bezelTicks() {
  const out = [];
  for (let i = 0; i < 60; i++) {
    const a = (Math.PI * 2 * i) / 60;
    const major = i % 5 === 0;
    const r1 = 168;
    const r2 = major ? 146 : 156;
    const p = (r) => `${(256 + Math.sin(a) * r).toFixed(1)},${(286 - Math.cos(a) * r).toFixed(1)}`;
    out.push(`<path d="M${p(r1)} L${p(r2)}" stroke="#ffe9a6" stroke-opacity="${major ? 0.9 : 0.45}" stroke-width="${major ? 5 : 2.5}" stroke-linecap="round"/>`);
  }
  return out.join("");
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs>
  <radialGradient id="ibg" cx="256" cy="230" r="380" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#14224f"/>
    <stop offset="0.6" stop-color="#080e24"/>
    <stop offset="1" stop-color="#020309"/>
  </radialGradient>
  <radialGradient id="iglow" cx="256" cy="286" r="230" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#f6c453" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#f6c453" stop-opacity="0"/>
  </radialGradient>
  <pattern id="igrid" width="32" height="32" patternUnits="userSpaceOnUse">
    <path d="M32,0 H0 V32" fill="none" stroke="#60a5fa" stroke-opacity="0.08" stroke-width="1"/>
  </pattern>
  ${goldDefs("ring", 86, 486)}
  ${goldDefs("crown", 38, 110)}
  ${goldDefs("drop", 9, 55)}
  <filter id="iblur" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>
<rect width="512" height="512" fill="url(#ibg)"/>
<rect width="512" height="512" fill="url(#igrid)"/>
<rect width="512" height="512" fill="url(#iglow)"/>
<!-- crown + side button -->
<rect x="226" y="40" width="60" height="30" rx="9" fill="url(#crown)"/>
<rect x="244" y="66" width="24" height="30" fill="url(#crown)"/>
<g transform="rotate(42 256 286)"><rect x="244" y="74" width="24" height="34" rx="6" fill="url(#crown)"/></g>
<circle cx="256" cy="286" r="190" fill="#060b1d" stroke="url(#ring)" stroke-width="20"/>
<circle cx="256" cy="286" r="176" fill="none" stroke="#f3c350" stroke-opacity="0.3" stroke-width="2"/>
${bezelTicks()}
<g transform="translate(256,292) scale(4.6) translate(-32,-32)">
  <path d="M32 9c7.5 10.2 16 19.6 16 30a16 16 0 0 1-32 0c0-10.4 8.5-19.8 16-30z" fill="#f6c453" fill-opacity="0.6" filter="url(#iblur)"/>
</g>
<g transform="translate(256,292) scale(4.6) translate(-32,-32)">
  <path d="M32 9c7.5 10.2 16 19.6 16 30a16 16 0 0 1-32 0c0-10.4 8.5-19.8 16-30z" fill="url(#drop)" stroke="#fffaf0" stroke-width="0.7"/>
  <ellipse cx="25.5" cy="38" rx="3.2" ry="5.6" fill="#ffffff" fill-opacity="0.7" transform="rotate(-18 25.5 38)"/>
</g>
</svg>`;

// Note: the "drop" gradient is in the droplet's own 64-unit coordinates (it is painted inside a scaled group).
const iconSvg = icon;

const publicDir = join(root, "public");
mkdirSync(publicDir, { recursive: true });

await sharp(Buffer.from(ogp)).png({ compressionLevel: 9 }).toFile(join(publicDir, "ogp.png"));
await sharp(Buffer.from(iconSvg)).png({ compressionLevel: 9 }).toFile(join(publicDir, "icon.png"));

if (process.argv.includes("--svg")) {
  writeFileSync(join(work, "ogp.svg"), ogp);
  writeFileSync(join(work, "icon.svg"), iconSvg);
  console.log(`SVG sources written to ${work}`);
}

for (const name of ["ogp.png", "icon.png"]) {
  const meta = await sharp(join(publicDir, name)).metadata();
  console.log(`public/${name}: ${meta.width}x${meta.height} ${meta.format}`);
}
