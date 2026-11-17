/**
 * HOLOGRAPHIC TARGET & COMBAT PRACTICE SYSTEM
 * Interactive floating drones that can be destroyed by the AR shotgun.
 */

import { sound } from './audio.js';

export class TargetManager {
  constructor(particlePool) {
    this.particles = particlePool;
    this.targets = [];
    this.maxTargets = 4;
    this.score = 0;
    this.combo = 0;
    this.lastHitTime = 0;
    this.enabled = true;
    this.time = 0;
  }

  init(width, height) {
    this.targets = [];
    for (let i = 0; i < this.maxTargets; i++) {
      this.spawnTarget(width, height);
    }
  }

  spawnTarget(width, height) {
    const margin = 80;
    const w = width || 1280;
    const h = height || 720;

    const x = margin + Math.random() * (w - margin * 2);
    const y = margin + Math.random() * (h * 0.65 - margin);

    this.targets.push({
      x,
      y,
      baseY: y,
      radius: 28 + Math.random() * 8,
      hp: 1,
      maxHp: 1,
      speed: 0.8 + Math.random() * 1.4,
      dirX: Math.random() > 0.5 ? 1 : -1,
      phase: Math.random() * Math.PI * 2,
      type: Math.random() > 0.3 ? 'drone' : 'core',
      color: Math.random() > 0.5 ? '#ff3366' : '#00e5ff',
      active: true,
      hitFlash: 0
    });
  }

  update(dt, width, height, pellets) {
    if (!this.enabled) return;
    this.time += dt;

    const now = performance.now();
    if (now - this.lastHitTime > 2500) {
      this.combo = 0;
    }

    // 1. Update targets motion
    for (let i = 0; i < this.targets.length; i++) {
      const tgt = this.targets[i];
      if (!tgt.active) continue;

      // Hovering floating sine wave
      tgt.phase += dt * tgt.speed * 2;
      tgt.y = tgt.baseY + Math.sin(tgt.phase) * 18;
      tgt.x += tgt.dirX * tgt.speed * 30 * dt;

      // Bounce at screen edges
      if (tgt.x < 70) {
        tgt.x = 70;
        tgt.dirX = 1;
      } else if (tgt.x > width - 70) {
        tgt.x = width - 70;
        tgt.dirX = -1;
      }

      if (tgt.hitFlash > 0) {
        tgt.hitFlash -= dt * 6;
      }
    }

    // 2. Collision check: Pellets vs Targets
    if (pellets && pellets.length > 0) {
      for (let p = 0; p < pellets.length; p++) {
        const pellet = pellets[p];
        if (!pellet.active) continue;

        for (let t = 0; t < this.targets.length; t++) {
          const tgt = this.targets[t];
          if (!tgt.active) continue;

          const dx = pellet.x - tgt.x;
          const dy = pellet.y - tgt.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < tgt.radius * tgt.radius) {
            // Pellet Hit!
            pellet.active = false;
            this.destroyTarget(tgt, width, height);
            break;
          }
        }
      }
    }

    // 3. Clean up inactive & maintain target count
    this.targets = this.targets.filter(t => t.active);
    while (this.targets.length < this.maxTargets) {
      this.spawnTarget(width, height);
    }
  }

  destroyTarget(tgt, width, height) {
    tgt.active = false;
    this.lastHitTime = performance.now();
    this.combo++;
    const pts = 100 * this.combo;
    this.score += pts;

    sound.playTargetHit();

    // Spawn cyber debris explosion
    const shardCount = 14;
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 14;
      const svx = Math.cos(angle) * speed;
      const svy = Math.sin(angle) * speed;

      this.particles.spawn('shard', tgt.x, tgt.y, svx, svy, {
        size: 3 + Math.random() * 4,
        maxLife: 0.5 + Math.random() * 0.4,
        colorR: 255,
        colorG: Math.random() > 0.5 ? 50 : 220,
        colorB: Math.random() > 0.5 ? 100 : 255,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 10,
        drag: 0.95
      });
    }

    // Floating score text
    const textStr = this.combo > 1 ? `+${pts} COMBO x${this.combo}!` : `+${pts}`;
    this.particles.spawn('text', tgt.x, tgt.y - 10, 0, -1, {
      size: 16,
      maxLife: 0.9,
      text: textStr,
      colorR: 0,
      colorG: 255,
      colorB: 200
    });
  }

  render(ctx) {
    if (!this.enabled) return;

    ctx.save();
    for (let i = 0; i < this.targets.length; i++) {
      const tgt = this.targets[i];
      if (!tgt.active) continue;

      ctx.save();
      ctx.translate(tgt.x, tgt.y);

      // Rotating cyber crosshair / shield ring
      ctx.strokeStyle = tgt.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, tgt.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner reticle marks
      ctx.beginPath();
      ctx.moveTo(-tgt.radius - 6, 0);
      ctx.lineTo(-tgt.radius + 6, 0);
      ctx.moveTo(tgt.radius - 6, 0);
      ctx.lineTo(tgt.radius + 6, 0);
      ctx.moveTo(0, -tgt.radius - 6);
      ctx.lineTo(0, -tgt.radius + 6);
      ctx.moveTo(0, tgt.radius - 6);
      ctx.lineTo(0, tgt.radius + 6);
      ctx.stroke();

      // Glowing drone core
      const pulse = 0.8 + Math.sin(this.time * 6 + i) * 0.2;
      ctx.fillStyle = tgt.color;
      ctx.shadowColor = tgt.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, tgt.radius * 0.35 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Small target label
      ctx.font = '9px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`DRONE // 0${i + 1}`, -24, -tgt.radius - 8);

      ctx.restore();
    }
    ctx.restore();
  }
}
