# CYBER GESTURE AR WEAPONS & ANOMALIES

A high-performance, zero-lag Augmented Reality web application that recognizes hand gestures through the webcam in real-time to summon weapons, mystic shields, and cosmic phenomena.

## 🚀 Key Features & Hand Gestures

### 1. 👉 Gun Sign — Tactical Combat AR Shotgun
- **Gesture:** Thumb extended up, index finger pointing forward, ring and pinky fingers curled into the palm (middle finger can be extended or curled).
- **Behavior:**
  - A heavy tactical double-barrel shotgun overlays seamlessly onto the hand, perfectly aligned with the aiming angle of your finger.
  - **Firing Action:**
    - **Trigger Tap:** Snap/curl your thumb down towards your index knuckle to pull the trigger and fire!
    - **Spacebar / Screen Click:** You can also fire manually at any time.
    - **Auto-Fire Toggle:** Enable continuous firing in the top HUD.
  - **Effects ("do some stuffs"):**
    - High-velocity 12-gauge buckshot pellets with tracer trails.
    - Massive muzzle blast starburst and expanding smoke rings.
    - Recoil spring simulation (gun kicks back and recovers smoothly).
    - Spent brass shotgun shells ejecting from the receiver with physics bounce.
    - Screen shake / trauma impulse on shot.
    - Mechanical pump-action slide reload with animated forearm.
    - Procedural audio: Deep 808 sub-bass explosion, metallic chamber click, and pump reload.
  - **Target Practice Drones:** Floating cyber drones hover in the AR scene. Blast them with pellets to trigger shattering debris, hit markers (`+100`, `CRITICAL`), and combo multipliers!

### 2. ✊ Clenched Fist — Purple Mystic Aura
- **Gesture:** Clench all fingers into a tight fist.
- **Behavior:**
  - A dense, radiant purple energy shield envelops the fist.
  - Swirling violet plasma flame tongues rotating around the hand contour.
  - Procedural crackling purple lightning arcs leaping between knuckles and wrist.
  - Rising mystic purple motes / embers emitted into the air.
  - Runic mystical power ring circling the wrist with glowing glyphs.
  - Resonant procedural mystic hum audio pad that intensifies with the aura.

### 3. ☝ 1 Finger Point Up — Relativistic Black Hole
- **Gesture:** Point only your index finger straight up into the air (middle, ring, pinky, and thumb curled).
- **Behavior:**
  - Spawns a Gargantua-style gravitational singularity hovering right above the index fingertip.
  - Pitch-black spherical event horizon surrounded by a luminous photon sphere.
  - Rapidly spinning tilted accretion disk with relativistic Doppler beaming (blue-shifted approaching side, red-shifted receding side).
  - Gravitational accretion: space dust and starlight drawn inward into the black hole in logarithmic spirals.
  - Collimated relativistic polar jets shooting straight upwards into space.
  - Ultra-deep gravitational sub-bass drone and vacuum warp sound.

---

## ⚡ Zero-Lag & Performance Optimizations
1. **Lightweight MediaPipe Pipeline (`modelComplexity: 0`):** Ultra-fast inference (<15ms per frame) ensures 60 FPS even on integrated GPUs and laptops.
2. **Exponential Smoothing Filter (LERP):** Eliminates webcam jitter while maintaining immediate, snappy response.
3. **Object-Pooled Particle System:** Zero runtime memory allocation inside animation frames (`new Object()` is avoided, preventing Garbage Collection lag spikes).
4. **Hardware-Accelerated HTML5 Canvas:** Clean 2D GPU rendering without expensive full-screen CSS filters.
5. **Procedural Web Audio API:** 100% synthesized in real-time with zero external audio assets, eliminating loading delay, latency, or CORS network errors.
6. **Built-in Interactive Simulation Demo:** Test and preview all gestures without a webcam using one-click preset buttons.

---

## 🕹️ Controls & Keyboard Shortcuts
- **Spacebar / Screen Click:** Fire Shotgun manually
- **SFX Button:** Toggle sound on / off
- **Mirror Button:** Flip camera horizontally
- **Targets Button:** Toggle target practice drones
- **Trigger Button:** Switch between manual trigger tap and auto-fire
- **Demo Mode:** Click "Try Simulation Demo" on the welcome screen to test without a webcam

---

## 🛠️ Running Locally
1. Start the Python web server:
   ```bash
   python server.py
   ```
2. Open your browser at:
   ```
   http://localhost:8090
   ```
3. Grant camera permissions when prompted and make the gestures!
