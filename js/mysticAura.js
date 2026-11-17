/**
 * PURPLE MYSTIC FIST AURA ENGINE
 * High-performance ethereal purple energy flames, crackling mystic lightning,
 * and runic power rings enveloping the clenched fist.
 */

import { sound } from './audio.js';

export class MysticAuraEngine {
  constructor(particlePool) {
    this.particles = particlePool;
    this.time = 0;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.wasActive = false;

    // Pre-allocated lightning points to avoid GC
    this.lightningBranches = 4;
    this.lightningSegments = 5;
  }

  update(dt, isActive, fistData) {
    this.time += dt;
    this.targetIntensity = isActive ? 1.0 : 0.0;

    // Smooth lerp intensity
    this.intensity += (this.targetIntensity - this.intensity) * (dt * 8);

    // Audio feedback
    sound.updateContinuousAura(this.intensity);

    // Summon sound burst
    if (isActive && !this.wasActive) {
      sound.playFistSummon();
    }
    this.wasActive = isActive;

    if (this.intensity <= 0.02 || !fistData) return;

    // Spawn rising mystic purple embers from fist periphery
    const center = fistData.center;
    const radius = fistData.radius;

    // Spawn 1-2 embers per frame (budget friendly)
    if (Math.random() < 0.75) {
      const angle = Math.random() * Math.PI * 2;
      const dist = radius * (0.6 + Math.random() * 0.7);
      const px = center.x + Math.cos(angle) * dist;
      const py = center.y + Math.sin(angle) * dist;

      // Rising upward with gentle inward pull
      const vx = (Math.random() - 0.5) * 1.5 - Math.cos(angle) * 0.5;
      const vy = -1.5 - Math.random() * 2.5;

      const purpleShades = [
        { r: 180, g: 60, b: 255 }, // Violet
        { r: 220, g: 120, b: 255 }, // Bright lilac
        { r: 130, g: 20, b: 240 }, // Deep purple
        { r: 255, g: 180, b: 255 }  // White-violet
      ];
      const col = purpleShades[Math.floor(Math.random() * purpleShades.length)];

      this.particles.spawn('mystic', px, py, vx, vy, {
        size: 3 + Math.random() * 4,
        maxLife: 0.5 + Math.random() * 0.5,
        colorR: col.r,
        colorG: col.g,
        colorB: col.b,
        alpha: 0.85,
        drag: 0.98,
        meta: Math.random() * 10
      });
    }
  }

  render(ctx, fistData) {
    if (this.intensity <= 0.02 || !fistData) return;

    const { center, radius, landmarks } = fistData;
    const t = this.time;
    const alpha = this.intensity;

    ctx.save();

    // 1. Core Pulsing Purple Plasma Shield
    const pulse = 1 + Math.sin(t * 7) * 0.08;
    const auraR = radius * 1.35 * pulse;

    const auraGrad = ctx.createRadialGradient(
      center.x, center.y, radius * 0.2,
      center.x, center.y, auraR
    );
    auraGrad.addColorStop(0, `rgba(235, 180, 255, ${0.45 * alpha})`);
    auraGrad.addColorStop(0.35, `rgba(165, 45, 245, ${0.4 * alpha})`);
    auraGrad.addColorStop(0.7, `rgba(105, 15, 190, ${0.25 * alpha})`);
    auraGrad.addColorStop(1, 'rgba(60, 5, 120, 0)');

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(center.x, center.y, auraR, 0, Math.PI * 2);
    ctx.fill();

    // 2. Swirling Ethereal Flame Petals (Curved Bezier Aura)
    ctx.lineWidth = 3;
    const flameCount = 7;
    for (let i = 0; i < flameCount; i++) {
      const baseAngle = (i / flameCount) * Math.PI * 2 + t * 2.2;
      const tipDist = auraR * (1.1 + Math.sin(t * 9 + i * 2) * 0.2);
      const tipX = center.x + Math.cos(baseAngle) * tipDist;
      const tipY = center.y + Math.sin(baseAngle) * tipDist;

      const cpAngle = baseAngle + 0.35;
      const cpX = center.x + Math.cos(cpAngle) * (radius * 1.1);
      const cpY = center.y + Math.sin(cpAngle) * (radius * 1.1);

      ctx.strokeStyle = `rgba(190, 80, 255, ${0.35 * alpha})`;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
      ctx.stroke();
    }

    // 3. Crackling Mystic Lightning Arcs across Knuckles
    ctx.strokeStyle = `rgba(255, 210, 255, ${0.85 * alpha})`;
    ctx.shadowColor = '#d966ff';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;

    // Connect key knuckles with jagged electric arcs
    const knuckleIndices = [5, 9, 13, 17, 0]; // Index, Middle, Ring, Pinky MCP, Wrist
    for (let k = 0; k < knuckleIndices.length - 1; k++) {
      const p1 = landmarks[knuckleIndices[k]];
      const p2 = landmarks[knuckleIndices[k + 1]];
      if (!p1 || !p2) continue;

      this.drawJaggedLightning(ctx, p1.x, p1.y, p2.x, p2.y, 4, 8);
    }

    // Additional lightning arcing out to aura edge
    if (Math.random() < 0.6) {
      const pWrist = landmarks[0];
      const pMid = landmarks[9];
      if (pWrist && pMid) {
        const randAngle = t * 6 + Math.random() * Math.PI * 2;
        const targetX = center.x + Math.cos(randAngle) * (radius * 1.25);
        const targetY = center.y + Math.sin(randAngle) * (radius * 1.25);
        this.drawJaggedLightning(ctx, center.x, center.y, targetX, targetY, 3, 12);
      }
    }

    ctx.shadowBlur = 0;

    // 4. Runic Power Ring hovering around wrist
    const wristPt = landmarks[0];
    if (wristPt) {
      ctx.save();
      ctx.translate(wristPt.x, wristPt.y);
      ctx.rotate(-t * 1.8);

      const ringR = radius * 0.75;
      ctx.strokeStyle = `rgba(180, 70, 255, ${0.6 * alpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Glyphs around ring
      ctx.fillStyle = `rgba(240, 190, 255, ${0.8 * alpha})`;
      for (let g = 0; g < 6; g++) {
        const ga = (g / 6) * Math.PI * 2;
        const gx = Math.cos(ga) * ringR;
        const gy = Math.sin(ga) * ringR;
        ctx.fillRect(gx - 2, gy - 2, 4, 4);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // Draw fast procedural lightning without allocations
  drawJaggedLightning(ctx, x1, y1, x2, y2, segments, jitter) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    const dx = (x2 - x1) / segments;
    const dy = (y2 - y1) / segments;
    const nx = -dy;
    const ny = dx;
    const len = Math.sqrt(nx * nx + ny * ny) || 1;
    const unx = nx / len;
    const uny = ny / len;

    for (let i = 1; i < segments; i++) {
      const offset = (Math.random() - 0.5) * jitter;
      const px = x1 + dx * i + unx * offset;
      const py = y1 + dy * i + uny * offset;
      ctx.lineTo(px, py);
    }

    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}
