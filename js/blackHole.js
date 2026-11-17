/**
 * RELATIVISTIC BLACK HOLE ENGINE
 * Gargantua-style gravitational singularity with tilted spinning accretion disk,
 * photon sphere, relativistic Doppler beaming, and gravitational particle pull.
 */

import { sound } from './audio.js';

export class BlackHoleEngine {
  constructor(particlePool) {
    this.particles = particlePool;
    this.time = 0;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.wasActive = false;

    // Smoothed singularity position
    this.posX = 0;
    this.posY = 0;
    this.hasPos = false;
  }

  update(dt, isActive, fingerData) {
    this.time += dt;
    this.targetIntensity = isActive ? 1.0 : 0.0;

    // Smooth lerp intensity
    this.intensity += (this.targetIntensity - this.intensity) * (dt * 7);

    // Audio feedback
    sound.updateContinuousBlackHole(this.intensity);

    if (isActive && !this.wasActive) {
      sound.playBlackHoleSpawn();
    }
    this.wasActive = isActive;

    if (this.intensity <= 0.02 || !fingerData) return;

    // Smooth hover position above finger tip
    const targetX = fingerData.singularityX;
    const targetY = fingerData.singularityY;

    if (!this.hasPos) {
      this.posX = targetX;
      this.posY = targetY;
      this.hasPos = true;
    } else {
      this.posX += (targetX - this.posX) * (dt * 12);
      this.posY += (targetY - this.posY) * (dt * 12);
    }

    // Spawn accretion dust spiraling into the black hole
    const bhRadius = fingerData.scale * 28;
    if (Math.random() < 0.85) {
      // Spawn at outer perimeter
      const outerR = bhRadius * (2.0 + Math.random() * 2.2);
      const angle = Math.random() * Math.PI * 2;
      const px = this.posX + Math.cos(angle) * outerR;
      const py = this.posY + Math.sin(angle) * (outerR * 0.45); // Elliptical projection

      // Inward + tangential velocity (spiral orbit)
      const tangentAngle = angle + Math.PI * 0.5;
      const orbitSpeed = 2.5 + Math.random() * 2.5;
      const pullSpeed = 1.8 + Math.random() * 2.0;

      const vx = Math.cos(tangentAngle) * orbitSpeed - Math.cos(angle) * pullSpeed;
      const vy = (Math.sin(tangentAngle) * orbitSpeed - Math.sin(angle) * pullSpeed) * 0.45;

      const colors = [
        { r: 255, g: 190, b: 110 }, // Warm accretion gold
        { r: 255, g: 140, b: 60 },  // Fiery orange
        { r: 200, g: 230, b: 255 }, // Blue-shifted light
        { r: 255, g: 255, b: 255 }  // Pure starlight
      ];
      const col = colors[Math.floor(Math.random() * colors.length)];

      this.particles.spawn('bh_dust', px, py, vx, vy, {
        size: 2 + Math.random() * 2.5,
        maxLife: 0.7 + Math.random() * 0.5,
        colorR: col.r,
        colorG: col.g,
        colorB: col.b,
        alpha: 0.9,
        drag: 0.97
      });
    }
  }

  render(ctx, fingerData) {
    if (this.intensity <= 0.02 || !this.hasPos) return;

    const t = this.time;
    const alpha = this.intensity;
    const scale = fingerData ? fingerData.scale : 1.0;
    const radius = scale * 26;

    const cx = this.posX;
    const cy = this.posY;

    ctx.save();
    ctx.translate(cx, cy);

    // 1. Gravitational Lensing Halo (Ambient space distortion rings)
    const haloRadius = radius * 3.8;
    const haloGrad = ctx.createRadialGradient(0, 0, radius, 0, 0, haloRadius);
    haloGrad.addColorStop(0, `rgba(255, 170, 70, ${0.4 * alpha})`);
    haloGrad.addColorStop(0.3, `rgba(180, 80, 240, ${0.2 * alpha})`);
    haloGrad.addColorStop(0.7, `rgba(40, 60, 180, ${0.1 * alpha})`);
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Gravitational Warping Rings
    ctx.strokeStyle = `rgba(200, 220, 255, ${0.25 * alpha})`;
    ctx.lineWidth = 1.2;
    for (let r = 1; r <= 3; r++) {
      const ringR = radius * (1.3 + r * 0.75 + Math.sin(t * 3 + r) * 0.06);
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 3. Relativistic Polar Jets (collimated energy beams shooting up and down)
    const jetLength = radius * 4.2;
    const jetGrad = ctx.createLinearGradient(0, -jetLength, 0, jetLength);
    jetGrad.addColorStop(0, 'rgba(100, 200, 255, 0)');
    jetGrad.addColorStop(0.4, `rgba(140, 230, 255, ${0.6 * alpha})`);
    jetGrad.addColorStop(0.5, `rgba(255, 255, 255, ${0.9 * alpha})`);
    jetGrad.addColorStop(0.6, `rgba(140, 230, 255, ${0.6 * alpha})`);
    jetGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');

    ctx.fillStyle = jetGrad;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.18, 0);
    ctx.lineTo(-radius * 0.06, -jetLength);
    ctx.lineTo(radius * 0.06, -jetLength);
    ctx.lineTo(radius * 0.18, 0);
    ctx.lineTo(radius * 0.06, jetLength);
    ctx.lineTo(-radius * 0.06, jetLength);
    ctx.closePath();
    ctx.fill();

    // 4. Back Half of Tilted Accretion Disk (behind event horizon)
    this.drawAccretionDisk(ctx, radius, t, alpha, true);

    // 5. Light Lensing Arch over top of Event Horizon (Interstellar Gargantua lens)
    ctx.save();
    ctx.scale(1, 0.42);
    const archGrad = ctx.createRadialGradient(0, -radius * 1.3, radius * 0.4, 0, -radius * 1.3, radius * 2.2);
    archGrad.addColorStop(0, `rgba(255, 255, 255, ${0.85 * alpha})`);
    archGrad.addColorStop(0.3, `rgba(255, 180, 70, ${0.7 * alpha})`);
    archGrad.addColorStop(0.8, `rgba(255, 90, 20, ${0.3 * alpha})`);
    archGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = archGrad;
    ctx.beginPath();
    ctx.arc(0, -radius * 1.3, radius * 2.2, 0, Math.PI, true);
    ctx.fill();
    ctx.restore();

    // 6. Photon Sphere Glow Ring (Luminous border of the abyss)
    const photonGrad = ctx.createRadialGradient(0, 0, radius * 0.85, 0, 0, radius * 1.25);
    photonGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    photonGrad.addColorStop(0.65, `rgba(255, 240, 210, ${0.95 * alpha})`);
    photonGrad.addColorStop(0.9, `rgba(255, 140, 40, ${0.8 * alpha})`);
    photonGrad.addColorStop(1, 'rgba(200, 50, 10, 0)');

    ctx.fillStyle = photonGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.25, 0, Math.PI * 2);
    ctx.fill();

    // 7. EVENT HORIZON (Jet Black Singularity)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // 8. Front Half of Accretion Disk (in front of event horizon)
    this.drawAccretionDisk(ctx, radius, t, alpha, false);

    // 9. Floating Gravitational Tether from Index Finger to Singularity
    if (fingerData && fingerData.indexTip) {
      const tipRelX = fingerData.indexTip.x - cx;
      const tipRelY = fingerData.indexTip.y - cy;

      ctx.strokeStyle = `rgba(180, 220, 255, ${0.45 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, radius * 0.9);
      ctx.lineTo(tipRelX, tipRelY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Tip beacon ring
      ctx.fillStyle = `rgba(140, 200, 255, ${0.7 * alpha})`;
      ctx.beginPath();
      ctx.arc(tipRelX, tipRelY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw tilted spinning accretion disk with relativistic Doppler beaming
  drawAccretionDisk(ctx, radius, t, alpha, isBackHalf) {
    ctx.save();
    // Tilt disk at angle (25 degrees) and flatten into ellipse
    ctx.rotate(-0.35);
    ctx.scale(1, 0.32);

    const innerR = radius * 1.25;
    const outerR = radius * 3.4;

    // Linear gradient across disk simulating Doppler Beaming:
    // Left side rotates towards viewer (hot, blue-shifted, intensely bright)
    // Right side recedes (cool, red-shifted, dimmer)
    const diskGrad = ctx.createLinearGradient(-outerR, 0, outerR, 0);
    diskGrad.addColorStop(0, `rgba(200, 230, 255, ${0.9 * alpha})`); // Bright blue-white
    diskGrad.addColorStop(0.3, `rgba(255, 230, 150, ${0.85 * alpha})`); // Hot yellow
    diskGrad.addColorStop(0.65, `rgba(255, 130, 40, ${0.65 * alpha})`); // Orange
    diskGrad.addColorStop(1, `rgba(180, 40, 20, ${0.35 * alpha})`); // Dim red

    ctx.fillStyle = diskGrad;
    ctx.beginPath();

    if (isBackHalf) {
      // Draw top half (y <= 0)
      ctx.arc(0, 0, outerR, Math.PI, 0, false);
      ctx.arc(0, 0, innerR, 0, Math.PI, true);
    } else {
      // Draw bottom half (y >= 0)
      ctx.arc(0, 0, outerR, 0, Math.PI, false);
      ctx.arc(0, 0, innerR, Math.PI, 0, true);
    }

    ctx.closePath();
    ctx.fill();

    // Swirling stream filaments
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 * alpha})`;
    ctx.lineWidth = 1.5;
    for (let f = 1; f <= 3; f++) {
      const filR = innerR + (outerR - innerR) * (f / 3.5);
      ctx.beginPath();
      if (isBackHalf) {
        ctx.arc(0, 0, filR, Math.PI, 0, false);
      } else {
        ctx.arc(0, 0, filR, 0, Math.PI, false);
      }
      ctx.stroke();
    }

    ctx.restore();
  }
}
