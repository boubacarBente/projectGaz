/**
 * Convertit une couleur hexadécimale (#1e40af) en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  if (h.length !== 6) return null;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

/**
 * Convertit RGB → OKLCH pour DaisyUI v5
 * DaisyUI v5 utilise le format oklch() pour ses variables de couleur
 * Retourne une chaîne au format "oklch(L C H)"
 */
function rgbToOklch(r: number, g: number, b: number): string {
  // Normaliser
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;

  // sRGB → Linear sRGB
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rL = linearize(r1);
  const gL = linearize(g1);
  const bL = linearize(b1);

  // Linear sRGB → LMS
  let l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
  let m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
  let s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;

  // LMS → OKLab (racine cubique)
  const cbrt = (v: number) => Math.cbrt(v);
  const l_ = cbrt(l);
  const m_ = cbrt(m);
  const s_ = cbrt(s);

  // OKLab → OKLCH
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + b_ * b_);
  const H = (Math.atan2(b_, a) * 180) / Math.PI;

  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${H.toFixed(3)})`;
}

/**
 * Convertit une couleur hexadécimale (#1e40af) en chaîne OKLCH pour DaisyUI v5
 */
export function hexToOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'oklch(45% .24 277.023)'; // fallback bleu
  return rgbToOklch(rgb.r, rgb.g, rgb.b);
}

/**
 * Calcule une couleur de texte (blanc ou noir) lisible sur un fond donné
 */
function getContrastOklch(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'oklch(96% .018 272.314)';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  if (luminance > 0.5) {
    // Texte foncé sur fond clair
    return rgbToOklch(30, 41, 59);
  } else {
    // Texte clair sur fond foncé
    return rgbToOklch(248, 250, 252);
  }
}

/**
 * Calcule une couleur hex plus claire
 */
function lightenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#1e40af';
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Décale la teinte d'une couleur hex (rotation dans le cercle chromatique)
 * Version simplifiée : on fait la rotation en HSL puis on repasse en RGB
 */
function shiftHue(hex: string, shiftDeg: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#1e40af';

  // RGB → HSL
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  // Rotation de la teinte
  h = (h * 360 + shiftDeg) % 360;
  if (h < 0) h += 360;

  // HSL → RGB
  const hueToRgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  h = h / 360;
  s = Math.min(1, s * 1.2); // On augmente un peu la saturation pour les couleurs dérivées
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const R = Math.round(255 * hueToRgb(p, q, h + 1 / 3));
  const G = Math.round(255 * hueToRgb(p, q, h));
  const B = Math.round(255 * hueToRgb(p, q, h - 1 / 3));

  return `#${R.toString(16).padStart(2, '0')}${G.toString(16).padStart(2, '0')}${B.toString(16).padStart(2, '0')}`;
}

/**
 * Calcule une couleur de texte (blanc ou noir) lisible sur un fond donné
 */
function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#ffffff';
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

/**
 * Applique les couleurs de thème sur le document HTML
 * en mettant à jour les CSS variables DaisyUI v5 (format oklch)
 */
export function applyThemeColors(primaryColor: string, sidebarColor: string, isDark: boolean) {
  const doc = document.documentElement;

  // Référence: DaisyUI v5 utilise `--color-<name>` en format oklch()
  // On écrase via inline style (plus haute spécificité)

  // --- Couleur primaire ---
  doc.style.setProperty('--color-primary', hexToOklch(primaryColor));
  doc.style.setProperty('--color-primary-content', getContrastOklch(primaryColor));

  // --- Secondary (version plus claire) ---
  const secondaryHex = lightenHex(primaryColor, 30);
  doc.style.setProperty('--color-secondary', hexToOklch(secondaryHex));
  doc.style.setProperty('--color-secondary-content', getContrastOklch(secondaryHex));

  // --- Accent ---
  const accentHex = shiftHue(primaryColor, 180);
  doc.style.setProperty('--color-accent', hexToOklch(accentHex));
  doc.style.setProperty('--color-accent-content', getContrastOklch(accentHex));

  // --- Info ---
  const infoHex = shiftHue(primaryColor, 40);
  doc.style.setProperty('--color-info', hexToOklch(lightenHex(infoHex, 30)));
  doc.style.setProperty('--color-info-content', getContrastOklch(infoHex));

  // --- Success ---
  const successHex = shiftHue(primaryColor, 100);
  doc.style.setProperty('--color-success', hexToOklch(successHex));
  doc.style.setProperty('--color-success-content', getContrastOklch(successHex));

  // --- Warning ---
  const warningHex = shiftHue(primaryColor, 160);
  doc.style.setProperty('--color-warning', hexToOklch(warningHex));
  doc.style.setProperty('--color-warning-content', getContrastOklch(warningHex));

  // --- Error ---
  const errorHex = shiftHue(primaryColor, 150);
  doc.style.setProperty('--color-error', hexToOklch(errorHex));
  doc.style.setProperty('--color-error-content', getContrastOklch(errorHex));

  // --- Couleurs neutres (base) selon le mode ---
  if (isDark) {
    doc.style.setProperty('--color-base-100', 'oklch(25.33% .016 252.42)');
    doc.style.setProperty('--color-base-200', 'oklch(23.26% .014 253.1)');
    doc.style.setProperty('--color-base-300', 'oklch(21.15% .012 254.09)');
    doc.style.setProperty('--color-base-content', 'oklch(97.807% .029 256.847)');
    doc.style.setProperty('--background', '#0f172a');
    doc.style.setProperty('--foreground', '#e2e8f0');
  } else {
    doc.style.setProperty('--color-base-100', 'oklch(100% 0 0)');
    doc.style.setProperty('--color-base-200', 'oklch(98% 0 0)');
    doc.style.setProperty('--color-base-300', 'oklch(95% 0 0)');
    doc.style.setProperty('--color-base-content', 'oklch(21% .006 285.885)');
    doc.style.setProperty('--background', '#f8fafc');
    doc.style.setProperty('--foreground', '#1e293b');
  }

  // Variables hex pour dégradés inline
  doc.style.setProperty('--p-color', primaryColor);
  doc.style.setProperty('--s-color', secondaryHex);

  // Variables pour le sidebar
  doc.style.setProperty('--sidebar-color', sidebarColor);
  const sidebarRgb = hexToRgb(sidebarColor);
  if (sidebarRgb) {
    const luminance = (0.299 * sidebarRgb.r + 0.587 * sidebarRgb.g + 0.114 * sidebarRgb.b) / 255;
    doc.style.setProperty('--sidebar-text', luminance > 0.5 ? '#1e293b' : '#ffffff');
  } else {
    doc.style.setProperty('--sidebar-text', '#ffffff');
  }
  doc.style.setProperty('--sidebar-text-muted', isDark ? '#94a3b8' : '#cbd5e1');
}
