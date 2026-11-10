import fs from "node:fs";
import path from "node:path";
import { products } from "../src/data/catalog";

const UPLOAD_ROOT = path.resolve(process.cwd(), "storage/uploads/product-images");

// Category color palettes for realistic pharma branding
const CATEGORY_THEMES: Record<string, { bg: string; accent: string; secondary: string; text: string }> = {
  medicine: { bg: "#0d9488", accent: "#14b8a6", secondary: "#f0fdfa", text: "#134e4a" },
  devices: { bg: "#0284c7", accent: "#38bdf8", secondary: "#f0f9ff", text: "#0369a1" },
  supplement: { bg: "#d97706", accent: "#fbbf24", secondary: "#fffbeb", text: "#b45309" },
  beauty: { bg: "#db2777", accent: "#f472b6", secondary: "#fdf2f8", text: "#9d174d" },
  "baby-mom": { bg: "#8b5cf6", accent: "#a78bfa", secondary: "#f5f3ff", text: "#6d28d9" },
  homecare: { bg: "#059669", accent: "#34d399", secondary: "#ecfdf5", text: "#047857" },
  "sexual-wellness": { bg: "#e11d48", accent: "#fb7185", secondary: "#fff1f2", text: "#be123c" },
  herbal: { bg: "#16a34a", accent: "#4ade80", secondary: "#f0fdf4", text: "#15803d" },
  homeopathy: { bg: "#4f46e5", accent: "#818cf8", secondary: "#eef2ff", text: "#3730a3" },
  food: { bg: "#ea580c", accent: "#fb923c", secondary: "#fff7ed", text: "#c2410c" },
  healthcare: { bg: "#0891b2", accent: "#22d3ee", secondary: "#ecfeff", text: "#0e7490" },
  "pet-care": { bg: "#ca8a04", accent: "#facc15", secondary: "#fefce8", text: "#a16207" },
};

type Theme = { bg: string; accent: string; secondary: string; text: string };
const DEFAULT_THEME: Theme = { bg: "#0d9488", accent: "#14b8a6", secondary: "#f0fdfa", text: "#134e4a" };

function generateSvg(p: typeof products[0]): string {
  const theme: Theme = CATEGORY_THEMES[p.category] ?? DEFAULT_THEME;
  const isRx = p.rx;
  const brandName = escapeXml(p.brand);
  const medName = escapeXml(p.en || p.name);
  const bnName = escapeXml(p.name);
  const generic = escapeXml(p.generic);
  const form = escapeXml(p.form);
  const pack = escapeXml(p.pack);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 400" width="500" height="400">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${theme.secondary}"/>
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${theme.bg}"/>
      <stop offset="100%" stop-color="${theme.accent}"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="500" height="400" fill="#f8fafc" rx="16"/>

  <!-- Medicine Box Card -->
  <g filter="url(#shadow)">
    <rect x="50" y="40" width="400" height="320" rx="14" fill="url(#bgGrad)" stroke="#e2e8f0" stroke-width="1.5"/>
  </g>

  <!-- Top Accent Header Strip -->
  <path d="M 50 54 Q 50 40 64 40 L 436 40 Q 450 40 450 54 L 450 72 L 50 72 Z" fill="url(#accentGrad)"/>
  <circle cx="75" cy="56" r="5" fill="#ffffff" opacity="0.8"/>
  <text x="90" y="60" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#ffffff" letter-spacing="1">${brandName.toUpperCase()}</text>
  
  ${isRx ? `
    <!-- Rx Badge -->
    <rect x="390" y="46" width="46" height="20" rx="4" fill="#dc2626"/>
    <text x="413" y="60" font-family="sans-serif" font-size="11" font-weight="900" fill="#ffffff" text-anchor="middle">Rx</text>
  ` : `
    <!-- OTC Badge -->
    <rect x="382" y="46" width="54" height="20" rx="4" fill="#16a34a"/>
    <text x="409" y="60" font-family="sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">OTC</text>
  `}

  <!-- Medicine Illustration Graphic -->
  <g transform="translate(330, 110)">
    <circle cx="50" cy="50" r="42" fill="${theme.secondary}" stroke="${theme.accent}" stroke-width="2" opacity="0.6"/>
    <text x="50" y="60" font-size="44" text-anchor="middle">${p.emoji}</text>
  </g>

  <!-- Medicine Name in English -->
  <text x="80" y="125" font-family="'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#0f172a">
    ${medName}
  </text>

  <!-- Bengali Name -->
  <text x="80" y="152" font-family="'Hind Siliguri', 'Segoe UI', sans-serif" font-size="15" font-weight="600" fill="${theme.text}">
    ${bnName}
  </text>

  <!-- Generic Composition -->
  <text x="80" y="195" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#64748b">
    GENERIC COMPOSITION
  </text>
  <text x="80" y="215" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#334155">
    ${generic}
  </text>

  <!-- Form & Pack Pills -->
  <g transform="translate(80, 245)">
    <rect x="0" y="0" width="90" height="26" rx="13" fill="${theme.secondary}" stroke="${theme.accent}" stroke-width="1"/>
    <text x="45" y="17" font-family="'Segoe UI', sans-serif" font-size="11" font-weight="700" fill="${theme.text}" text-anchor="middle">${form}</text>

    <rect x="100" y="0" width="85" height="26" rx="13" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1"/>
    <text x="142" y="17" font-family="'Segoe UI', sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">${pack}</text>
  </g>

  <!-- Decorative Separator Line -->
  <line x1="80" y1="295" x2="420" y2="295" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>

  <!-- Footer Quality & Verification Mark -->
  <g transform="translate(80, 312)">
    <!-- Oushodhwala Quality Seal -->
    <circle cx="10" cy="18" r="9" fill="${theme.bg}"/>
    <path d="M 6 18 L 9 21 L 15 14" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="26" y="17" font-family="'Segoe UI', sans-serif" font-size="11" font-weight="700" fill="#0f172a">100% Genuine · DGDA Verified</text>
    <text x="26" y="29" font-family="'Segoe UI', sans-serif" font-size="9" font-weight="500" fill="#64748b">ঔষধওয়ালা কোয়ালিটি পরীক্ষিত</text>

    <text x="340" y="23" font-family="'Segoe UI', sans-serif" font-size="16" font-weight="800" fill="${theme.bg}" text-anchor="end">৳${p.price}</text>
  </g>
</svg>`;
}

function escapeXml(unsafe: string): string {
  return (unsafe || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function generateAllMedicineImages() {
  console.log(`Generating images for ${products.length} catalog medicines...`);
  const imageMap: Record<string, string> = {};

  for (const prod of products) {
    const prodDir = path.join(UPLOAD_ROOT, prod.id, "box");
    fs.mkdirSync(prodDir, { recursive: true });

    const filename = `${prod.id}.svg`;
    const fullPath = path.join(prodDir, filename);
    const svgContent = generateSvg(prod);
    fs.writeFileSync(fullPath, svgContent, "utf8");

    const publicUrl = `/uploads/product-images/${prod.id}/box/${filename}`;
    imageMap[prod.id] = publicUrl;
  }

  console.log(`Successfully created ${Object.keys(imageMap).length} medicine images in ${UPLOAD_ROOT}`);
  return imageMap;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllMedicineImages();
}
