/**
 * HIGH-PERFORMANCE AR SHOTGUN SYSTEM
 * Renders stylized tactical combat shotgun anchored to the hand pose,
 * with realistic recoil, pump-action animation, muzzle blast, and laser sight.
 */

import { sound } from './audio.js';

export class ShotgunWeapon {
  constructor(particlePool) {
    this.particles = particlePool;

    // Recoil state
    this.recoilOffset = 0;
    this.recoilAngle = 0;
    this.recoilVel = 0;
    this.pumpOffset = 0;
    this.isPumping = false;
    this.pumpTimer = 0;

    // Firing state
    this.lastFireTime = 0;
    this.fireCooldown = 450; // ms between shots
    this.muzzleFlashLife = 0;
    this.muzzlePos = { x: 0, y: 0 };
    this.screenShake = 0;

    // Trigger state tracking
    this.prevThumbCurled = false;
    this.autoFire = false;
  }

  canFire() {
    return performance.now() - this.lastFireTime >= this.fireCooldown;
  }

  fire(originX, originY, angle, handSize) {
    const now = performance.now();
    if (now - this.lastFireTime < this.fireCooldown) return false;
    this.lastFireTime = now;

    // Trigger sound
    sound.playShotgunBlast();

    // Recoil impulse
    this.recoilOffset = 28 * (handSize / 90);
    this.recoilAngle = -0.22; // Kick up
    this.recoilVel = 0;
    this.muzzleFlashLife = 0.12; // 120ms flash
    this.screenShake = 12;

    // Calculate barrel end position
    const barrelLength = handSize * 1.6;
    const muzzleX = originX + Math.cos(angle) * barrelLength;
    const muzzleY = originY + Math.sin(angle) * barrelLength;
    this.muzzlePos = { x: muzzleX, y: muzzleY };

    // Spawn buckshot pellets, flash sparks, smoke rings
    this.particles.spawnBuckshot(muzzleX, muzzleY, angle, 42);

    // Eject spent shell from receiver
    const chamberDist = handSize * 0.45;
    const chamberX = originX + Math.cos(angle) * chamberDist;
    const chamberY = originY + Math.sin(angle) * chamberDist;
    this.particles.spawnShell(chamberX, chamberY, angle);

    // Schedule pump action animation
    this.pumpTimer = 0.22;
    this.isPumping = true;

    return true;
  }

  update(dt) {
    // Smooth recoil recovery spring
    if (this.recoilOffset > 0 || Math.abs(this.recoilVel) > 0.1) {
      const springK = 350;
      const damping = 22;
      const force = -springK * this.recoilOffset - damping * this.recoilVel;
      this.recoilVel += force * dt;
      this.recoilOffset += this.recoilVel * dt;

      if (this.recoilOffset < 0) {
        this.recoilOffset = 0;
        this.recoilVel = 0;
      }
    }

    // Smooth recoil angle recovery
    this.recoilAngle += (0 - this.recoilAngle) * (dt * 15);

    // Pump action animation
    if (this.isPumping) {
      this.pumpTimer -= dt;
      if (this.pumpTimer > 0.1) {
        // Slide back
        this.pumpOffset = Math.min(this.pumpOffset + dt * 140, 22);
      } else if (this.pumpTimer > 0) {
        // Slide forward
        this.pumpOffset = Math.max(this.pumpOffset - dt * 180, 0);
      } else {
        this.pumpOffset = 0;
        this.isPumping = false;
      }
    }

    // Muzzle flash decay
    if (this.muzzleFlashLife > 0) {
      this.muzzleFlashLife -= dt;
    }

    // Screen shake decay
    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 45);
    }
  }

  /**
   * Check if user performed a trigger pull with their thumb or gesture
   */
  checkTriggerAction(handData) {
    if (!handData || !handData.isGunSign) return false;

    // Check if thumb is snapped down/curled (trigger hammer drop)
    const thumbCurled = handData.isThumbCurled;

    let fired = false;
    // Fired on transition from thumb up to thumb down (pulling trigger)
    if (thumbCurled && !this.prevThumbCurled) {
      fired = this.fire(handData.wrist.x, handData.wrist.y, handData.aimAngle, handData.handSize);
    } else if (this.autoFire && this.canFire()) {
      fired = this.fire(handData.wrist.x, handData.wrist.y, handData.aimAngle, handData.handSize);
    }

    this.prevThumbCurled = thumbCurled;
    return fired;
  }

  /**
   * Render AR Shotgun aligned with hand
   */
  render(ctx, handData) {
    if (!handData) return;

    const { wrist, indexMCP, indexTip, aimAngle, handSize } = handData;

    // Pivot is near wrist/base of hand
    const pivotX = wrist.x;
    const pivotY = wrist.y;
    const currentAngle = aimAngle + this.recoilAngle;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(currentAngle);

    // Apply recoil slide backward
    ctx.translate(-this.recoilOffset, 0);

    const scale = handSize / 100;
    ctx.scale(scale, scale);

    // --- LASER SIGHT GUIDE ---
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 30, 60, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(160, -3);
    ctx.lineTo(1200, -3);
    ctx.stroke();

    // Laser dot at far distance
    ctx.fillStyle = 'rgba(255, 50, 80, 0.9)';
    ctx.beginPath();
    ctx.arc(800, -3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- SHOTGUN BODY (TACTICAL SPEC) ---
    // 1. Stock / Grip (near wrist)
    ctx.fillStyle = '#181b22';
    ctx.beginPath();
    ctx.moveTo(-45, 12);
    ctx.lineTo(-30, 32);
    ctx.lineTo(-12, 34);
    ctx.lineTo(5, 14);
    ctx.lineTo(25, 12);
    ctx.lineTo(25, -2);
    ctx.lineTo(-45, -2);
    ctx.closePath();
    ctx.fill();

    // Grip texture checkering
    ctx.strokeStyle = '#2d3340';
    ctx.lineWidth = 1;
    for (let g = -32; g <= 0; g += 5) {
      ctx.beginPath();
      ctx.moveTo(g, 16);
      ctx.lineTo(g + 8, 30);
      ctx.stroke();
    }

    // 2. Heavy Receiver (Metal Block)
    const recGrad = ctx.createLinearGradient(0, -18, 0, 16);
    recGrad.addColorStop(0, '#383e4a');
    recGrad.addColorStop(0.5, '#1e2229');
    recGrad.addColorStop(1, '#0e1116');
    ctx.fillStyle = recGrad;
    ctx.beginPath();
    ctx.roundRect(-20, -18, 75, 32, [4, 4, 2, 2]);
    ctx.fill();
    ctx.strokeStyle = '#505a6b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Ejection Port
    ctx.fillStyle = '#0a0c0f';
    ctx.fillRect(8, -14, 26, 12);
    ctx.strokeStyle = '#8592a6';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, -14, 26, 12);

    // Glowing Neon Ammo / Status HUD on gun side
    ctx.fillStyle = this.canFire() ? 'rgba(0, 255, 180, 0.9)' : 'rgba(255, 80, 50, 0.9)';
    ctx.fillRect(10, 3, 20, 4);
    ctx.shadowColor = this.canFire() ? '#00ffb4' : '#ff5032';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('12-GA', -14, -6);
    ctx.shadowBlur = 0;

    // Trigger Guard & Trigger
    ctx.strokeStyle = '#2a303c';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(8, 16, 10, 0, Math.PI * 0.85);
    ctx.stroke();

    ctx.strokeStyle = '#8892a0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, 14);
    ctx.lineTo(6, 21);
    ctx.stroke();

    // 3. Double Barrel Assembly (Extended chrome/carbon barrels)
    const barrelGrad = ctx.createLinearGradient(0, -16, 0, 6);
    barrelGrad.addColorStop(0, '#5a6475');
    barrelGrad.addColorStop(0.4, '#8c9ab0');
    barrelGrad.addColorStop(0.7, '#323742');
    barrelGrad.addColorStop(1, '#1b1d24');

    // Main Heavy Barrel
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(55, -15, 120, 13);
    ctx.strokeStyle = '#22262e';
    ctx.lineWidth = 1;
    ctx.strokeRect(55, -15, 120, 13);

    // Magazine Tube underneath
    ctx.fillStyle = '#232833';
    ctx.fillRect(55, -2, 105, 10);
    ctx.strokeRect(55, -2, 105, 10);

    // Barrel clamp / connector
    ctx.fillStyle = '#424958';
    ctx.fillRect(145, -17, 10, 27);
    ctx.fillRect(95, -17, 8, 27);

    // Ventilated Rib on top of barrel
    ctx.fillStyle = '#1f232b';
    ctx.fillRect(55, -18, 115, 3);
    for (let v = 60; v < 165; v += 12) {
      ctx.clearRect(v, -18, 5, 3);
    }

    // High-visibility front sight bead
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(170, -17, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 4. Pump Slide (Movable forearm grip)
    const pumpX = 65 - this.pumpOffset;
    ctx.fillStyle = '#161920';
    ctx.beginPath();
    ctx.roundRect(pumpX, 2, 42, 14, 3);
    ctx.fill();
    ctx.strokeStyle = '#383f4d';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pump grip grooves
    ctx.fillStyle = '#0b0d11';
    for (let r = pumpX + 5; r <= pumpX + 36; r += 6) {
      ctx.fillRect(r, 4, 3, 10);
    }

    ctx.restore();

    // --- MUZZLE BLAST EFFECT (WHEN FIRING) ---
    if (this.muzzleFlashLife > 0) {
      const flashAlpha = Math.min(this.muzzleFlashLife / 0.12, 1.0);
      const mX = this.muzzlePos.x;
      const mY = this.muzzlePos.y;

      ctx.save();
      ctx.translate(mX, mY);
      ctx.rotate(currentAngle);

      // Flash blast starburst
      const blastRadius = handSize * 0.95;
      const blastGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, blastRadius);
      blastGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      blastGrad.addColorStop(0.2, `rgba(255, 220, 60, ${flashAlpha * 0.9})`);
      blastGrad.addColorStop(0.5, `rgba(255, 90, 10, ${flashAlpha * 0.6})`);
      blastGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');

      ctx.fillStyle = blastGrad;
      ctx.beginPath();
      ctx.arc(0, 0, blastRadius, 0, Math.PI * 2);
      ctx.fill();

      // Cone spikes
      ctx.fillStyle = `rgba(255, 240, 180, ${flashAlpha * 0.8})`;
      ctx.beginPath();
      ctx.moveTo(0, -blastRadius * 0.3);
      ctx.lineTo(blastRadius * 1.6, 0);
      ctx.lineTo(0, blastRadius * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
}
