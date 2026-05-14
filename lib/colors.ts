/**
 * Convertit une couleur hexadécimale (#1e40af) en HSL (chiffres)
 * Retourne { h, s, l } où h est en degrés (0-360), s et l en pourcentage (0-100)
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Nettoyer le hex
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }

  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    saturation = lightness > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        hue = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        hue = ((b - r) / d + 2) / 6;
        break;
      case b:
        hue = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

/**
 * Calcule une couleur de texte (blanc ou noir) lisible sur un fond donné
 */
export function getContrastColor(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1e293b' : '#ffffff';
}

/**
 * Applique les couleurs de thème sur le document HTML
 * en mettant à jour les CSS variables DaisyUI et nos propres variables
 */
export function applyThemeColors(primaryColor: string, sidebarColor: string, isDark: boolean) {
  const doc = document.documentElement;

  // Convertir la couleur primaire en HSL pour DaisyUI
  const primary = hexToHSL(primaryColor);
  doc.style.setProperty('--p', `${primary.h} ${primary.s}% ${primary.l}%`);

  // Générer des variantes pour les autres rôles DaisyUI
  // Primary focus (un peu plus foncé)
  const pf = hexToHSL(darkenHex(primaryColor, 10));
  doc.style.setProperty('--pf', `${pf.h} ${pf.s}% ${pf.l}%`);

  // Primary content (text on primary) - version claire ou foncée
  const contrast = getContrastColor(primaryColor);
  const pc = hexToHSL(contrast);
  doc.style.setProperty('--pc', `${pc.h} ${pc.s}% ${pc.l}%`);

  // Secondary - version plus claire de la primaire
  const secondaryHex = lightenHex(primaryColor, 15);
  const secondary = hexToHSL(secondaryHex);
  doc.style.setProperty('--s', `${secondary.h} ${secondary.s}% ${secondary.l}%`);
  const sc = hexToHSL(getContrastColor(secondaryHex));
  doc.style.setProperty('--sc', `${sc.h} ${sc.s}% ${sc.l}%`);

  // Info - teinte basée sur la primaire
  const infoHex = shiftHue(primaryColor, 40);
  const info = hexToHSL(infoHex);
  doc.style.setProperty('--in', `${info.h} ${info.s}% ${info.l}%`);

  // Success - teinte verte
  const success = hexToHSL('#10b981');
  doc.style.setProperty('--su', `${success.h} ${success.s}% ${success.l}%`);

  // Warning - teinte orange
  const warning = hexToHSL('#f59e0b');
  doc.style.setProperty('--wa', `${warning.h} ${warning.s}% ${warning.l}%`);

  // Error - teinte rouge
  const error = hexToHSL('#ef4444');
  doc.style.setProperty('--er', `${error.h} ${error.s}% ${error.l}%`);

  // Variables hex pour les dégradés et usages inline
  doc.style.setProperty('--p-color', primaryColor);
  doc.style.setProperty('--s-color', secondaryHex);

  // Nos propres variables pour le sidebar
  doc.style.setProperty('--sidebar-color', sidebarColor);
  const sidebarContrast = getContrastColor(sidebarColor);
  doc.style.setProperty('--sidebar-text', sidebarContrast);
  const sidebarMuted = isDark ? '148 163 184' : '100 116 139';
  doc.style.setProperty('--sidebar-text-muted', sidebarMuted);

  // Couleurs neutres de fond selon le mode
  if (isDark) {
    doc.style.setProperty('--b1', `222.2 84% 4.9%`);
    doc.style.setProperty('--b2', `217.2 32.6% 17.5%`);
    doc.style.setProperty('--b3', `215.3 25% 26.7%`);
    doc.style.setProperty('--bc', `210 40% 98%`);
    doc.style.setProperty('--background', '#0f172a');
    doc.style.setProperty('--foreground', '#e2e8f0');
  } else {
    doc.style.setProperty('--b1', `0 0% 100%`);
    doc.style.setProperty('--b2', `210 40% 96.1%`);
    doc.style.setProperty('--b3', `214.3 31.8% 91.4%`);
    doc.style.setProperty('--bc', `222.2 84% 4.9%`);
    doc.style.setProperty('--background', '#f8fafc');
    doc.style.setProperty('--foreground', '#1e293b');
  }
}

/**
 * Fonce une couleur hex d'un pourcentage
 */
function darkenHex(hex: string, amount: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = Math.max(0, parseInt(h.substring(0, 2), 16) - amount);
  const g = Math.max(0, parseInt(h.substring(2, 4), 16) - amount);
  const b = Math.max(0, parseInt(h.substring(4, 6), 16) - amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Éclaircit une couleur hex d'un pourcentage
 */
function lightenHex(hex: string, amount: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Décale la teinte d'une couleur hex
 */
function shiftHue(hex: string, shift: number): string {
  const { h, s, l } = hexToHSL(hex);
  const newH = (h + shift) % 360;
  return hslToHex(newH, s, l);
}

/**
 * Convertit HSL en hexadécimal
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const kVal = k(n);
    return l - a * Math.max(-1, Math.min(kVal - 3, 9 - kVal, 1));
  };
  const toHex = (val: number) =>
    Math.round(255 * val)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
