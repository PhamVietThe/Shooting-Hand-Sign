/**
 * HIGH-PERFORMANCE OBJECT-POOLED PARTICLE SYSTEM
 * Zero GC garbage collection allocations inside animation frames.
 */

export class ParticlePool {
  constructor(maxParticles = 350) {
    this.max = maxParticles;
    this.pool = new Array(this.max);
    for (let i = 0; i < this.max; i++) {
      this.pool[i] = {
        active: false,
        type: 'spark', // spark, smoke, pellet, shell, mystic, bh_dust, shard, text
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        ax: 0,
        ay: 0,
        size: 2,
        baseSize: 2,
        life: 0,
        maxLife: 1,
        color: '#ffaa00',
        colorR: 255,
        colorG: 170,
        colorB: 0,
        alpha: 1,
        rot: 0,
        vRot: 0,
        drag: 0.98,
        text: '',
        meta: 0
      };
    }
    this.cursor = 0;
  }

  spawn(type, x, y, vx, vy, options = {}) {
    // Find next slot (cyclic ring buffer search)
    let p = null;
    for (let i = 0; i < this.max; i++) {
      const idx = (this.cursor + i) % this.max;
      if (!this.pool[idx].active) {
        p = this.pool[idx];
        this.cursor = (idx + 1) % this.max;
        break;
      }
    }
    // If all active, overwrite the current cursor position
    if (!p) {
      p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.max;
    }

    p.active = true;
    p.type = type;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.ax = options.ax || 0;
    p.ay = options.ay || 0;
    p.size = options.size || 3;
    p.baseSize = p.size;
    p.life = 0;
    p.maxLife = options.maxLife || 0.6;
    p.color = options.color || '#ff8800';
    p.colorR = options.colorR !== undefined ? options.colorR : 255;
    p.colorG = options.colorG !== undefined ? options.colorG : 136;
    p.colorB = options.colorB !== undefined ? options.colorB : 0;
    p.alpha = options.alpha !== undefined ? options.alpha : 1;
    p.rot = options.rot || 0;
    p.vRot = options.vRot || 0;
    p.drag = options.drag !== undefined ? options.drag : 0.98;
    p.text = options.text || '';
    p.meta = options.meta || 0;

    return p;
  }

  // Spawn shotgun pellets (8-10 pellets with spread)
  spawnBuckshot(x, y, dirAngle, speed = 40) {
    const pelletCount = 9;
    for (let i = 0; i < pelletCount; i++) {
      const spread = (Math.random() - 0.5) * 0.16; // narrow cone
      const pelletAngle = dirAngle + spread;
      const pelletSpeed = speed * (0.85 + Math.random() * 0.3);
      const vx = Math.cos(pelletAngle) * pelletSpeed;
      const vy = Math.sin(pelletAngle) * pelletSpeed;

      this.spawn('pellet', x, y, vx, vy, {
        size: 3.5 + Math.random() * 1.5,
        maxLife: 0.8,
        color: '#ffeedd',
        colorR: 255,
        colorG: 238,
        colorB: 221,
        drag: 0.99
      });
    }

    // Muzzle blast flame & sparks
    for (let i = 0; i < 16; i++) {
      const sparkSpread = (Math.random() - 0.5) * 0.7;
      const sparkAngle = dirAngle + sparkSpread;
      const sparkSpeed = (10 + Math.random() * 25);
      const svx = Math.cos(sparkAngle) * sparkSpeed;
      const svy = Math.sin(sparkAngle) * sparkSpeed;

      this.spawn('spark', x, y, svx, svy, {
        size: 2 + Math.random() * 4,
        maxLife: 0.25 + Math.random() * 0.35,
        color: Math.random() > 0.4 ? '#ff6600' : '#ffcc00',
        colorR: 255,
        colorG: Math.random() > 0.4 ? 102 : 204,
        colorB: 0,
        drag: 0.94
      });
    }

    // Smoke puffs
    for (let i = 0; i < 6; i++) {
      const smokeAngle = dirAngle + (Math.random() - 0.5) * 0.8;
      const smokeSpeed = 4 + Math.random() * 8;
      this.spawn('smoke', x, y, Math.cos(smokeAngle) * smokeSpeed, Math.sin(smokeAngle) * smokeSpeed, {
        size: 10 + Math.random() * 12,
        maxLife: 0.6 + Math.random() * 0.5,
        color: '#888888',
        colorR: 160,
        colorG: 160,
        colorB: 160,
        alpha: 0.6,
        drag: 0.92
      });
    }
  }

  // Eject shotgun brass shell
  spawnShell(x, y, dirAngle) {
    // Shell ejects perpendicular to gun (up & side)
    const ejectAngle = dirAngle - Math.PI * 0.5 + (Math.random() - 0.5) * 0.3;
    const ejectSpeed = 8 + Math.random() * 5;
    const vx = Math.cos(ejectAngle) * ejectSpeed;
    const vy = Math.sin(ejectAngle) * ejectSpeed - 4; // slight upward pop

    this.spawn('shell', x, y, vx, vy, {
      ay: 0.45, // gravity
      size: 6,
      maxLife: 1.4,
      rot: dirAngle,
      vRot: (Math.random() - 0.5) * 12,
      drag: 0.985
    });
  }

  // Update all particles with delta time dt
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }

      // Physics integration
      p.vx = (p.vx + p.ax) * p.drag;
      p.vy = (p.vy + p.ay) * p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vRot;

      // Type-specific behaviors
      const progress = p.life / p.maxLife;

      if (p.type === 'smoke') {
        p.size = p.baseSize * (1 + progress * 2.5);
      } else if (p.type === 'spark' || p.type === 'shard') {
        p.size = p.baseSize * (1 - progress * 0.7);
      } else if (p.type === 'mystic') {
        // Subtle wave oscillation
        p.x += Math.sin(p.life * 8 + p.meta) * 0.8;
      } else if (p.type === 'text') {
        p.y -= 1.2;
      }
    }
  }

  // High-performance canvas render
  render(ctx) {
    ctx.save();

    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const progress = p.life / p.maxLife;
      const fadeAlpha = (1 - progress) * p.alpha;
      if (fadeAlpha <= 0.01) continue;

      if (p.type === 'pellet') {
        // Bright glowing projectile with line trail
        ctx.strokeStyle = `rgba(255, 220, 150, ${fadeAlpha})`;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 1.6, p.y - p.vy * 1.6);
        ctx.stroke();

        // White core dot
        ctx.fillStyle = `rgba(255, 255, 255, ${fadeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'spark') {
        ctx.fillStyle = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${fadeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'smoke') {
        ctx.fillStyle = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${fadeAlpha * 0.35})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'shell') {
        // Red plastic shotgun shell with brass head
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        // Brass base
        ctx.fillStyle = `rgba(230, 180, 50, ${fadeAlpha})`;
        ctx.fillRect(-3, -3, 3, 6);
        // Red hull
        ctx.fillStyle = `rgba(210, 40, 40, ${fadeAlpha})`;
        ctx.fillRect(0, -3, 9, 6);
        ctx.restore();

      } else if (p.type === 'mystic') {
        // Glowing purple energy orb
        ctx.fillStyle = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${fadeAlpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'bh_dust') {
        // Cosmic stardust drawn into black hole
        ctx.fillStyle = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${fadeAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

      } else if (p.type === 'shard') {
        // Angular cyber shard
        ctx.fillStyle = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${fadeAlpha})`;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();

      } else if (p.type === 'text') {
        // Floating combat hit text (+100, CRITICAL)
        ctx.font = `bold ${Math.round(p.size)}px 'Share Tech Mono', monospace`;
        ctx.fillStyle = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, ${fadeAlpha})`;
        ctx.shadowColor = `rgba(${p.colorR}, ${p.colorG}, ${p.colorB}, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
        ctx.shadowBlur = 0;
      }
    }

    ctx.restore();
  }

  // Get active pellets for collision check against targets
  getActivePellets() {
    const list = [];
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (p.active && p.type === 'pellet') {
        list.push(p);
      }
    }
    return list;
  }

  clear() {
    for (let i = 0; i < this.max; i++) {
      this.pool[i].active = false;
    }
  }
}
