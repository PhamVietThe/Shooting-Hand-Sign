/**
 * MAIN AR APP CONTROLLER
 * High-performance coordinator for Shotgun, Mystic Fist, Black Hole, and Target Practice.
 */

import { sound } from './audio.js';
import { ParticlePool } from './particles.js';
import { ShotgunWeapon } from './shotgun.js';
import { MysticAuraEngine } from './mysticAura.js';
import { BlackHoleEngine } from './blackHole.js';
import { TargetManager } from './targets.js';
import { HandTracker } from './tracking.js';

class HandSignWeaponApp {
  constructor() {
    this.video = document.getElementById('webcam');
    this.canvas = document.getElementById('ar-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    // Subsystems
    this.particles = new ParticlePool(350);
    this.shotgun = new ShotgunWeapon(this.particles);
    this.aura = new MysticAuraEngine(this.particles);
    this.blackHole = new BlackHoleEngine(this.particles);
    this.targets = new TargetManager(this.particles);
    this.tracker = new HandTracker();

    // Render resolution & scale
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderScale = 1.0;

    // Timing & FPS optimization
    this.lastTime = performance.now();
    this.fps = 60;
    this.fpsHistory = [];
    this.autoOptimize = true;

    // Active gestures state
    this.currentGestures = {
      gun: null,
      fist: null,
      pointUp: null,
      rawHands: []
    };

    this.initDOM();
    this.initEvents();
    this.resizeCanvas();
    this.targets.init(this.width, this.height);

    // Start rendering loop
    this.renderLoop();
  }

  initDOM() {
    this.dom = {
      startModal: document.getElementById('start-modal'),
      btnStartCam: document.getElementById('btn-start-camera'),
      btnStartDemo: document.getElementById('btn-start-demo'),
      btnSound: document.getElementById('btn-sound'),
      btnMirror: document.getElementById('btn-mirror'),
      btnTargets: document.getElementById('btn-targets'),
      btnAutoFire: document.getElementById('btn-autofire'),
      statusPill: document.getElementById('status-pill'),
      statusText: document.getElementById('status-text'),
      fpsCounter: document.getElementById('fps-counter'),
      scoreDisplay: document.getElementById('score-val'),
      cardGun: document.getElementById('card-gun'),
      cardFist: document.getElementById('card-fist'),
      cardHole: document.getElementById('card-hole'),
      demoBar: document.getElementById('demo-bar'),
      demoBtnGun: document.getElementById('demo-gun'),
      demoBtnFist: document.getElementById('demo-fist'),
      demoBtnHole: document.getElementById('demo-hole')
    };
  }

  initEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Start with Camera
    this.dom.btnStartCam.addEventListener('click', async () => {
      sound.init();
      this.dom.startModal.classList.add('hidden');
      await this.tracker.startCamera();
    });

    // Start Demo Mode
    this.dom.btnStartDemo.addEventListener('click', () => {
      sound.init();
      this.dom.startModal.classList.add('hidden');
      if (this.dom.demoBar) this.dom.demoBar.classList.remove('hidden');
      this.tracker.startDemoMode();
    });

    // Sound Toggle
    this.dom.btnSound.addEventListener('click', () => {
      const active = sound.toggleMute();
      this.dom.btnSound.querySelector('.btn-icon').textContent = active ? '🔊' : '🔇';
      this.dom.btnSound.querySelector('.btn-label').textContent = active ? 'SFX: ON' : 'SFX: OFF';
    });

    // Mirror Toggle
    this.dom.btnMirror.addEventListener('click', () => {
      const isMirrored = this.tracker.toggleMirror();
      this.dom.btnMirror.classList.toggle('active', isMirrored);
      this.video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
    });

    // Target Practice Toggle
    this.dom.btnTargets.addEventListener('click', () => {
      this.targets.enabled = !this.targets.enabled;
      this.dom.btnTargets.classList.toggle('active', this.targets.enabled);
      this.dom.btnTargets.querySelector('.btn-label').textContent = this.targets.enabled ? 'TARGETS: ON' : 'TARGETS: OFF';
    });

    // Auto-Fire Toggle
    this.dom.btnAutoFire.addEventListener('click', () => {
      this.shotgun.autoFire = !this.shotgun.autoFire;
      this.dom.btnAutoFire.classList.toggle('active', this.shotgun.autoFire);
      this.dom.btnAutoFire.querySelector('.btn-label').textContent = this.shotgun.autoFire ? 'AUTO-FIRE: ON' : 'TRIGGER: TAP';
    });

    // Keyboard Fire (Spacebar) or Mouse Click to manually blast shotgun
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        this.triggerManualShot();
      }
    });

    window.addEventListener('pointerdown', (e) => {
      // Don't fire if clicking HUD buttons
      if (e.target.closest('button') || e.target.closest('.hud-card') || e.target.closest('#start-modal')) return;
      this.triggerManualShot();
    });

    // Demo Mode Gesture Switchers
    if (this.dom.demoBtnGun) {
      this.dom.demoBtnGun.addEventListener('click', () => {
        this.tracker.setDemoGesture('GUN');
        this.setDemoButtonActive(this.dom.demoBtnGun);
      });
      this.dom.demoBtnFist.addEventListener('click', () => {
        this.tracker.setDemoGesture('FIST');
        this.setDemoButtonActive(this.dom.demoBtnFist);
      });
      this.dom.demoBtnHole.addEventListener('click', () => {
        this.tracker.setDemoGesture('POINT_UP');
        this.setDemoButtonActive(this.dom.demoBtnHole);
      });
    }

    // Tracking Setup
    this.tracker.init(this.video, {
      onGestures: (gestures) => {
        this.currentGestures = gestures;
      },
      onStatus: (status, message) => {
        if (this.dom.statusText) this.dom.statusText.textContent = message || status;
        if (this.dom.statusPill) {
          this.dom.statusPill.className = 'status-pill status-' + status.toLowerCase();
        }
      }
    });
  }

  setDemoButtonActive(btn) {
    [this.dom.demoBtnGun, this.dom.demoBtnFist, this.dom.demoBtnHole].forEach(b => {
      if (b) b.classList.remove('active');
    });
    if (btn) btn.classList.add('active');
  }

  triggerManualShot() {
    sound.ensureContext();
    const gun = this.currentGestures.gun;
    if (gun) {
      const pixelWrist = this.toPixelCoords(gun.wrist);
      const pixelTip = this.toPixelCoords(gun.indexTip);
      const aimAngle = Math.atan2(pixelTip.y - pixelWrist.y, pixelTip.x - pixelWrist.x);
      this.shotgun.fire(pixelWrist.x, pixelWrist.y, aimAngle, gun.handSize * this.width);
    } else {
      // Fire from screen center/bottom upwards
      this.shotgun.fire(this.width * 0.5, this.height * 0.85, -Math.PI * 0.5, 90);
    }
  }

  resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.round(this.width * dpr * this.renderScale);
    this.canvas.height = Math.round(this.height * dpr * this.renderScale);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(dpr * this.renderScale, dpr * this.renderScale);
    this.targets.init(this.width, this.height);
  }

  toPixelCoords(pt) {
    return {
      x: pt.x * this.width,
      y: pt.y * this.height
    };
  }

  renderLoop() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap delta time to prevent physics explosion
    this.lastTime = now;

    // Performance monitoring (FPS)
    const currentFps = 1 / (dt || 0.016);
    this.fps = this.fps * 0.9 + currentFps * 0.1;
    if (this.dom.fpsCounter && Math.random() < 0.1) {
      this.dom.fpsCounter.textContent = `${Math.round(this.fps)} FPS`;
    }

    // Update Subsystems
    this.update(dt);

    // Render Subsystems
    this.render();

    requestAnimationFrame(() => this.renderLoop());
  }

  update(dt) {
    const { gun, fist, pointUp } = this.currentGestures;

    // 1. Shotgun update
    this.shotgun.update(dt);
    if (gun) {
      const pixelWrist = this.toPixelCoords(gun.wrist);
      const pixelIndex = this.toPixelCoords(gun.indexTip);
      const aimAngle = Math.atan2(pixelIndex.y - pixelWrist.y, pixelIndex.x - pixelWrist.x);
      const pixelSize = gun.handSize * this.width;

      this.shotgun.checkTriggerAction({
        isGunSign: true,
        wrist: pixelWrist,
        indexTip: pixelIndex,
        aimAngle: aimAngle,
        handSize: pixelSize,
        isThumbCurled: gun.isThumbCurled
      });
    }

    // 2. Mystic Fist Aura update
    let fistData = null;
    if (fist) {
      const center = this.toPixelCoords(fist.center);
      const radius = fist.radius * this.width;
      const pixelLms = fist.landmarks.map(p => this.toPixelCoords(p));
      fistData = { center, radius, landmarks: pixelLms };
    }
    this.aura.update(dt, !!fist, fistData);

    // 3. Black Hole update
    let fingerData = null;
    if (pointUp) {
      const pixelTip = this.toPixelCoords(pointUp.indexTip);
      const pixelMCP = this.toPixelCoords(pointUp.indexMCP);
      const pDx = pixelTip.x - pixelMCP.x;
      const pDy = pixelTip.y - pixelMCP.y;
      const pLen = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
      const hoverDist = pointUp.handSize * this.width * 0.7;

      const singX = pixelTip.x + (pDx / pLen) * hoverDist;
      const singY = pixelTip.y + (pDy / pLen) * hoverDist;
      const scale = (pointUp.handSize * this.width) / 90;

      fingerData = {
        singularityX: singX,
        singularityY: singY,
        indexTip: pixelTip,
        scale: scale
      };
    }
    this.blackHole.update(dt, !!pointUp, fingerData);

    // 4. Particles update
    this.particles.update(dt);

    // 5. Target Practice update
    const activePellets = this.particles.getActivePellets();
    this.targets.update(dt, this.width, this.height, activePellets);
    if (this.dom.scoreDisplay) {
      this.dom.scoreDisplay.textContent = this.targets.score;
    }

    // 6. Update HUD gesture status cards
    if (this.dom.cardGun) this.dom.cardGun.classList.toggle('active', !!gun);
    if (this.dom.cardFist) this.dom.cardFist.classList.toggle('active', !!fist);
    if (this.dom.cardHole) this.dom.cardHole.classList.toggle('active', !!pointUp);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Apply Screen Shake if shotgun fired
    ctx.save();
    if (this.shotgun.screenShake > 0.5) {
      const shakeX = (Math.random() - 0.5) * this.shotgun.screenShake;
      const shakeY = (Math.random() - 0.5) * this.shotgun.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Render Target practice drones
    this.targets.render(ctx);

    // 2. Render Mystic Fist Aura (if active)
    const fist = this.currentGestures.fist;
    if (fist || this.aura.intensity > 0.02) {
      let fistData = null;
      if (fist) {
        const center = this.toPixelCoords(fist.center);
        const radius = fist.radius * this.width;
        const pixelLms = fist.landmarks.map(p => this.toPixelCoords(p));
        fistData = { center, radius, landmarks: pixelLms };
      }
      this.aura.render(ctx, fistData);
    }

    // 3. Render Black Hole (if active)
    const pointUp = this.currentGestures.pointUp;
    if (pointUp || this.blackHole.intensity > 0.02) {
      let fingerData = null;
      if (pointUp) {
        const pixelTip = this.toPixelCoords(pointUp.indexTip);
        const pixelMCP = this.toPixelCoords(pointUp.indexMCP);
        const pDx = pixelTip.x - pixelMCP.x;
        const pDy = pixelTip.y - pixelMCP.y;
        const pLen = Math.sqrt(pDx * pDx + pDy * pDy) || 1;
        const hoverDist = pointUp.handSize * this.width * 0.7;

        const singX = pixelTip.x + (pDx / pLen) * hoverDist;
        const singY = pixelTip.y + (pDy / pLen) * hoverDist;
        const scale = (pointUp.handSize * this.width) / 90;

        fingerData = {
          singularityX: singX,
          singularityY: singY,
          indexTip: pixelTip,
          scale: scale
        };
      }
      this.blackHole.render(ctx, fingerData);
    }

    // 4. Render AR Shotgun (if gun sign detected)
    const gun = this.currentGestures.gun;
    if (gun) {
      const pixelWrist = this.toPixelCoords(gun.wrist);
      const pixelMCP = this.toPixelCoords(gun.indexMCP);
      const pixelTip = this.toPixelCoords(gun.indexTip);
      const aimAngle = Math.atan2(pixelTip.y - pixelWrist.y, pixelTip.x - pixelWrist.x);
      const pixelSize = gun.handSize * this.width;

      this.shotgun.render(ctx, {
        wrist: pixelWrist,
        indexMCP: pixelMCP,
        indexTip: pixelTip,
        aimAngle: aimAngle,
        handSize: pixelSize
      });
    }

    // 5. Render Particle System (Pellets, Shells, Sparks, Mystic Embers, Accretion Dust, Shards)
    this.particles.render(ctx);

    ctx.restore();
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new HandSignWeaponApp();
});
