import html2canvas from 'html2canvas';

// Convert OKLCH color to standard RGB/RGBA mathematically
export function oklchToRgb(l: number, c: number, h: number): { r: number; g: number; b: number } {
  // h is in degrees, convert to radians
  const hRad = (h * Math.PI) / 180;
  const okl_a = c * Math.cos(hRad);
  const okl_b = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * okl_a + 0.2158037573 * okl_b;
  const m_ = l - 0.1055613458 * okl_a - 0.0638541728 * okl_b;
  const s_ = l - 0.0894841775 * okl_a - 1.2914855480 * okl_b;

  const l_3 = l_ * l_ * l_;
  const m_3 = m_ * m_ * m_;
  const s_3 = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  const g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  const b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const toSRGB = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(toSRGB(r_lin) * 255);
  const g = Math.round(toSRGB(g_lin) * 255);
  const b = Math.round(toSRGB(b_lin) * 255);

  return { r, g, b };
}

// Convert OKLAB color to standard RGB/RGBA mathematically
export function oklabToRgb(l: number, aCoord: number, bCoord: number): { r: number; g: number; b: number } {
  const l_ = l + 0.3963377774 * aCoord + 0.2158037573 * bCoord;
  const m_ = l - 0.1055613458 * aCoord - 0.0638541728 * bCoord;
  const s_ = l - 0.0894841775 * aCoord - 1.2914855480 * bCoord;

  const l_3 = l_ * l_ * l_;
  const m_3 = m_ * m_ * m_;
  const s_3 = s_ * s_ * s_;

  const r_lin = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  const g_lin = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  const b_lin = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;

  const toSRGB = (x: number) => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  const r = Math.round(toSRGB(r_lin) * 255);
  const g = Math.round(toSRGB(g_lin) * 255);
  const b = Math.round(toSRGB(b_lin) * 255);

  return { r, g, b };
}

// Parse individual color contents
function parseInnerColor(funcName: 'oklch' | 'oklab', innerContent: string): string | null {
  const parts = innerContent.split('/');
  const colorPart = parts[0].trim();
  const alphaPart = parts[1] ? parts[1].trim() : null;

  const components = colorPart.split(/[\s,]+/).filter(Boolean);
  if (components.length < 3) return null;

  const lStr = components[0];
  const cOrAStr = components[1];
  const hOrBStr = components[2];

  let l = parseFloat(lStr);
  if (isNaN(l)) return null;
  if (lStr.includes('%')) l = l / 100;

  let cOrA = parseFloat(cOrAStr);
  if (isNaN(cOrA)) return null;
  if (cOrAStr.includes('%')) cOrA = cOrA / 100;

  let hOrB = parseFloat(hOrBStr);
  if (isNaN(hOrB)) return null;
  if (hOrBStr.includes('%')) hOrB = hOrB / 100;

  let a = 1;
  if (alphaPart) {
    if (alphaPart.includes('var(')) {
      a = 1; // standard opaque fallback
    } else {
      const parsedAlpha = parseFloat(alphaPart);
      if (!isNaN(parsedAlpha)) {
        a = alphaPart.includes('%') ? parsedAlpha / 100 : parsedAlpha;
      }
    }
  }

  if (funcName === 'oklch') {
    const { r, g, b } = oklchToRgb(l, cOrA, hOrB);
    return alphaPart ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  } else {
    const { r, g, b } = oklabToRgb(l, cOrA, hOrB);
    return alphaPart ? `rgba(${r}, ${g}, ${b}, ${a})` : `rgb(${r}, ${g}, ${b})`;
  }
}

// Balanced parenthesis search and replacement for color functions
function replaceColorFunctions(cssText: string, funcName: 'oklch' | 'oklab', fallbackColor: string): string {
  const searchStr = funcName + '(';
  let result = '';
  let lastIdx = 0;

  while (true) {
    const startIdx = cssText.toLowerCase().indexOf(searchStr, lastIdx);
    if (startIdx === -1) {
      result += cssText.slice(lastIdx);
      break;
    }

    result += cssText.slice(lastIdx, startIdx);

    let parenCount = 1;
    let scanIdx = startIdx + searchStr.length;
    while (scanIdx < cssText.length && parenCount > 0) {
      const char = cssText[scanIdx];
      if (char === '(') {
        parenCount++;
      } else if (char === ')') {
        parenCount--;
      }
      scanIdx++;
    }

    const innerContent = cssText.slice(startIdx + searchStr.length, scanIdx - 1);
    let replacedColor = fallbackColor;
    try {
      const parsed = parseInnerColor(funcName, innerContent);
      if (parsed) {
        replacedColor = parsed;
      }
    } catch (e) {
      // Keep fallback
    }

    result += replacedColor;
    lastIdx = scanIdx;
  }

  return result;
}

// Parse CSS text and replace all oklch() and oklab() color functions with standard rgb() or rgba()
export function parseOklchAndReplace(cssText: string): string {
  let result = cssText;
  result = replaceColorFunctions(result, 'oklch', 'rgb(128, 128, 128)');
  result = replaceColorFunctions(result, 'oklab', 'rgb(128, 128, 128)');
  return result;
}

// A safe html2canvas wrapper that intercepts and sanitizes oklch-replaced css rules on the fly
export default async function safeHtml2canvas(
  element: HTMLElement,
  options: any = {}
): Promise<HTMLCanvasElement> {
  const originalStyleContents = new Map<HTMLStyleElement, string>();
  const styleElements = Array.from(document.querySelectorAll('style'));

  try {
    // 1. Temporarily replace original style contents in-place on the DOM
    for (const styleEl of styleElements) {
      const originalText = styleEl.innerHTML;
      originalStyleContents.set(styleEl, originalText);
      const safeText = parseOklchAndReplace(originalText);
      styleEl.innerHTML = safeText;
    }
  } catch (err) {
    console.warn('Failed to pre-process actual style elements', err);
  }

  try {
    // 2. Call html2canvas with sanitized clone styles
    const userOnClone = options.onclone;
    const safeOptions = {
      ...options,
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        try {
          // Process all style elements inside clonedDoc
          const clonedStyleElements = Array.from(clonedDoc.querySelectorAll('style'));
          for (const styleEl of clonedStyleElements) {
            styleEl.innerHTML = parseOklchAndReplace(styleEl.innerHTML);
          }

          // Walk all elements and fix inline styles containing oklch/oklab
          const allElements = Array.from(clonedDoc.querySelectorAll('*'));
          for (const el of allElements) {
            const htmlEl = el as HTMLElement;
            if (htmlEl && htmlEl.style) {
              for (let i = 0; i < htmlEl.style.length; i++) {
                const propName = htmlEl.style[i];
                if (propName) {
                  const val = htmlEl.style.getPropertyValue(propName);
                  if (val && (val.includes('oklch') || val.includes('oklab'))) {
                    try {
                      htmlEl.style.setProperty(propName, parseOklchAndReplace(val));
                    } catch (e) {}
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn('Failed to sanitize cloned document styles', err);
        }

        if (userOnClone) {
          userOnClone(clonedDoc, clonedEl);
        }
      }
    };

    return await html2canvas(element, safeOptions);
  } finally {
    // 3. Clean up: restore original style tags content on the main document
    for (const [styleEl, originalText] of originalStyleContents.entries()) {
      try {
        styleEl.innerHTML = originalText;
      } catch (e) {
        console.error('Failed to restore style element content', e);
      }
    }
  }
}
