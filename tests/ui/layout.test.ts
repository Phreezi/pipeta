import { describe, expect, it } from 'vitest';
import { computeLayout } from '../../src/ui/layout';

const screens = [
  { width: 360, height: 640, dpr: 1 },
  { width: 720, height: 1280, dpr: 2 },
  { width: 412, height: 915, dpr: 2 },
  { width: 800, height: 1280, dpr: 1 },
];

describe('computeLayout', () => {
  for (const s of screens) {
    for (let count = 3; count <= 15; count++) {
      it(`${count} tubos em ${s.width}x${s.height}@${s.dpr}`, () => {
        const w = s.width * s.dpr;
        const h = s.height * s.dpr;
        const top = 90 * s.dpr;
        const bottom = 100 * s.dpr;
        const l = computeLayout({ count, capacity: 4, width: w, height: h, top, bottom, dpr: s.dpr });
        expect(l.tubes.length).toBe(count);
        expect(l.rows === 1 || l.rows === 2).toBe(true);
        expect(l.ball).toBeGreaterThan(20 * s.dpr);
        for (const t of l.tubes) {
          expect(t.x - l.tubeWidth / 2).toBeGreaterThanOrEqual(0);
          expect(t.x + l.tubeWidth / 2).toBeLessThanOrEqual(w);
          expect(t.hit.y).toBeGreaterThanOrEqual(top - 1);
          expect(t.bottom).toBeLessThanOrEqual(h - bottom + 1);
          // Zona de toque com pelo menos ~44 dp de largura (48 dp até 14 tubos).
          expect(t.hit.width / s.dpr).toBeGreaterThanOrEqual(count <= 14 ? 48 : 42);
          expect(t.hit.height / s.dpr).toBeGreaterThanOrEqual(48);
        }
        // Tubos não se sobrepõem.
        const sorted = [...l.tubes].sort((a, b) => a.top - b.top || a.x - b.x);
        for (let i = 1; i < sorted.length; i++) {
          const a = sorted[i - 1];
          const b = sorted[i];
          if (a !== undefined && b !== undefined && a.top === b.top) {
            expect(b.x - a.x).toBeGreaterThanOrEqual(l.tubeWidth);
          }
        }
      });
    }
  }
});
