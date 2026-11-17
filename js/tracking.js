/**
 * HIGH-SPEED MEDIAPIPE HAND TRACKING & GESTURE RECOGNITION
 * Recognizes Gun Sign (Shotgun), Clenched Fist (Mystic Aura), and Point Up (Black Hole).
 * Includes landmark jitter smoothing (LERP) and interactive Demo Simulation Mode.
 */

export class HandTracker {
  constructor() {
    this.video = null;
    this.hands = null;
    this.isTracking = false;
    this.isDemoMode = false;
    this.isMirrored = true;

    this.onGesturesDetected = null;
    this.onStatusChange = null;

    // Smoothed landmarks for jitter-free rendering
    this.smoothedHands = [];
    this.lerpFactor = 0.45; // 0 = freeze, 1 = raw jitter

    // Demo state
    this.demoTime = 0;
    this.demoMode = 'GUN'; // GUN, FIST, POINT_UP
    this.demoMouse = { x: 0.5, y: 0.5, active: false };

    this.rafId = null;
    this.isProcessingFrame = false;
  }

  async init(videoElement, callbacks) {
    this.video = videoElement;
    this.onGesturesDetected = callbacks.onGestures;
    this.onStatusChange = callbacks.onStatus;

    try {
      if (typeof window.Hands !== 'undefined') {
        this.hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // 0 = ultra fast (ideal for 60fps), 1 = full
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => {
          this.isProcessingFrame = false;
          this.processResults(results);
        });
      } else {
        console.warn('MediaPipe Hands library not loaded');
      }
    } catch (e) {
      console.error('Hands initialization error:', e);
    }
  }

  async startCamera() {
    this.isDemoMode = false;
    if (this.onStatusChange) this.onStatusChange('STARTING', 'Accessing camera...');

    try {
      const constraints = {
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user'
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = stream;
      await this.video.play();

      this.isTracking = true;
      if (this.onStatusChange) this.onStatusChange('ACTIVE', 'Tracking active');

      this.startLoop();
      return true;
    } catch (err) {
      console.error('Camera access error:', err);
      if (this.onStatusChange) this.onStatusChange('ERROR', `Camera error: ${err.message}`);
      return false;
    }
  }

  startDemoMode() {
    this.isDemoMode = true;
    this.isTracking = true;
    if (this.onStatusChange) this.onStatusChange('DEMO', 'Interactive simulation active');
    this.startLoop();
  }

  toggleMirror() {
    this.isMirrored = !this.isMirrored;
    return this.isMirrored;
  }

  setModelComplexity(val) {
    if (this.hands) {
      this.hands.setOptions({ modelComplexity: val });
    }
  }

  startLoop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);

    const step = async () => {
      if (this.isDemoMode) {
        this.simulateDemoFrame();
      } else if (this.video && this.video.readyState >= 2 && this.hands) {
        // Send frame if not already processing
        if (!this.isProcessingFrame) {
          this.isProcessingFrame = true;
          try {
            await this.hands.send({ image: this.video });
          } catch (e) {
            this.isProcessingFrame = false;
          }
        }
      }

      this.rafId = requestAnimationFrame(step);
    };

    this.rafId = requestAnimationFrame(step);
  }

  dist(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Process raw MediaPipe landmarks with smoothing and gesture classification
   */
  processResults(results) {
    if (!this.onGesturesDetected) return;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      this.smoothedHands = [];
      this.onGesturesDetected({ gun: null, fist: null, pointUp: null, rawHands: [] });
      return;
    }

    const detected = {
      gun: null,
      fist: null,
      pointUp: null,
      rawHands: []
    };

    const numHands = results.multiHandLandmarks.length;

    for (let h = 0; h < numHands; h++) {
      let rawLm = results.multiHandLandmarks[h];

      // Mirror horizontally
      if (this.isMirrored) {
        rawLm = rawLm.map(p => ({ x: 1 - p.x, y: p.y, z: p.z || 0 }));
      }

      // Smooth landmarks using Exponential Moving Average
      if (!this.smoothedHands[h] || this.smoothedHands[h].length !== 21) {
        this.smoothedHands[h] = rawLm.map(p => ({ ...p }));
      } else {
        const curSmoothed = this.smoothedHands[h];
        for (let i = 0; i < 21; i++) {
          curSmoothed[i].x += (rawLm[i].x - curSmoothed[i].x) * this.lerpFactor;
          curSmoothed[i].y += (rawLm[i].y - curSmoothed[i].y) * this.lerpFactor;
          curSmoothed[i].z = (curSmoothed[i].z || 0) + ((rawLm[i].z || 0) - (curSmoothed[i].z || 0)) * this.lerpFactor;
        }
      }

      const lm = this.smoothedHands[h];
      detected.rawHands.push(lm);

      // Analyze hand gestures
      const gesture = this.classifyGesture(lm, h);
      if (gesture) {
        if (gesture.type === 'GUN' && !detected.gun) {
          detected.gun = gesture;
        } else if (gesture.type === 'FIST' && !detected.fist) {
          detected.fist = gesture;
        } else if (gesture.type === 'POINT_UP' && !detected.pointUp) {
          detected.pointUp = gesture;
        }
      }
    }

    this.onGesturesDetected(detected);
  }

  /**
   * Classify 21 hand landmarks into Gun, Fist, or Point Up
   */
  classifyGesture(lm, handIndex) {
    const wrist = lm[0];
    const thumbCMC = lm[1];
    const thumbMCP = lm[2];
    const thumbIP = lm[3];
    const thumbTip = lm[4];

    const indexMCP = lm[5];
    const indexPIP = lm[6];
    const indexDIP = lm[7];
    const indexTip = lm[8];

    const middleMCP = lm[9];
    const middlePIP = lm[10];
    const middleTip = lm[12];

    const ringMCP = lm[13];
    const ringPIP = lm[14];
    const ringTip = lm[16];

    const pinkyMCP = lm[17];
    const pinkyPIP = lm[18];
    const pinkyTip = lm[20];

    // Reference hand scale: wrist to middle knuckle
    const handSize = this.dist(wrist, middleMCP) || 0.001;

    // Distances from tips to wrist (normalized by handSize)
    const dThumbWrist = this.dist(thumbTip, wrist) / handSize;
    const dIndexWrist = this.dist(indexTip, wrist) / handSize;
    const dMiddleWrist = this.dist(middleTip, wrist) / handSize;
    const dRingWrist = this.dist(ringTip, wrist) / handSize;
    const dPinkyWrist = this.dist(pinkyTip, wrist) / handSize;

    // Tip-to-MCP distances (extension)
    const dIndexExt = this.dist(indexTip, indexMCP) / handSize;
    const dMiddleExt = this.dist(middleTip, middleMCP) / handSize;
    const dRingExt = this.dist(ringTip, ringMCP) / handSize;
    const dPinkyExt = this.dist(pinkyTip, pinkyMCP) / handSize;

    // Is finger curled?
    const isRingCurled = dRingWrist < 0.98 || dRingExt < 0.65;
    const isPinkyCurled = dPinkyWrist < 0.92 || dPinkyExt < 0.65;
    const isMiddleCurled = dMiddleWrist < 1.05 || dMiddleExt < 0.72;
    const isIndexCurled = dIndexWrist < 0.95 || dIndexExt < 0.70;

    // --- 1. CLENCHED FIST DETECTION ---
    // All fingers curled towards palm
    if (isIndexCurled && isMiddleCurled && isRingCurled && isPinkyCurled) {
      // Fist center: centroid of wrist and knuckles
      const cx = (wrist.x + indexMCP.x + middleMCP.x + ringMCP.x + pinkyMCP.x) / 5;
      const cy = (wrist.y + indexMCP.y + middleMCP.y + ringMCP.y + pinkyMCP.y) / 5;
      const radius = handSize * 0.55;

      return {
        type: 'FIST',
        center: { x: cx, y: cy },
        radius: radius,
        handSize: handSize,
        landmarks: lm
      };
    }

    // --- 2. POINT UP (1 FINGER POINTING UP) ---
    // Index finger extended upwards, while middle, ring, pinky curled
    const isIndexExtended = !isIndexCurled && dIndexExt > 0.85;
    const indexDy = indexTip.y - indexMCP.y; // In screen space, -dy is upwards
    const indexDx = indexTip.x - indexMCP.x;
    const isPointingUpwards = indexDy < -0.45 * handSize && Math.abs(indexDx) < 0.85 * Math.abs(indexDy);

    if (isIndexExtended && isPointingUpwards && isMiddleCurled && isRingCurled && isPinkyCurled) {
      return {
        type: 'POINT_UP',
        indexTip: { x: indexTip.x, y: indexTip.y },
        indexMCP: { x: indexMCP.x, y: indexMCP.y },
        handSize: handSize,
        landmarks: lm
      };
    }

    // --- 3. GUN SIGN (SHOTGUN) ---
    // Index extended forward; ring & pinky curled; thumb extended or tapping trigger
    if (isIndexExtended && isRingCurled && isPinkyCurled) {
      // Check thumb curled status (for trigger pull)
      const dThumbIndexMCP = this.dist(thumbTip, indexMCP) / handSize;
      const isThumbCurled = dThumbIndexMCP < 0.55;

      return {
        type: 'GUN',
        isGunSign: true,
        wrist: { x: wrist.x, y: wrist.y },
        indexMCP: { x: indexMCP.x, y: indexMCP.y },
        indexTip: { x: indexTip.x, y: indexTip.y },
        handSize: handSize,
        isThumbCurled: isThumbCurled,
        landmarks: lm
      };
    }

    return null;
  }

  /**
   * Demo Simulation Loop for webcam-free testing
   */
  simulateDemoFrame() {
    this.demoTime += 0.02;
    const t = this.demoTime;

    // Simulated center that moves smoothly
    const cx = 0.5 + Math.sin(t * 0.8) * 0.15;
    const cy = 0.55 + Math.cos(t * 0.6) * 0.1;
    const hs = 0.22; // Normalized hand size

    const lm = new Array(21);
    for (let i = 0; i < 21; i++) {
      lm[i] = { x: cx, y: cy, z: 0 };
    }

    // Wrist
    lm[0] = { x: cx - 0.05, y: cy + 0.1, z: 0 };

    if (this.demoMode === 'GUN') {
      // Gun sign: Index forward, thumb up, others curled
      const angle = Math.sin(t * 1.2) * 0.35 - 0.1;
      const barrelLen = hs * 1.3;

      lm[5] = { x: cx, y: cy, z: 0 }; // Index MCP
      lm[8] = { // Index Tip
        x: cx + Math.cos(angle) * barrelLen,
        y: cy + Math.sin(angle) * barrelLen,
        z: 0
      };

      // Thumb cocked up / animated trigger tap
      const thumbDown = Math.sin(t * 4.5) > 0.82;
      lm[4] = {
        x: cx - 0.03,
        y: thumbDown ? cy + 0.01 : cy - 0.08,
        z: 0
      };

      // Middle, ring, pinky curled
      lm[12] = { x: cx + 0.02, y: cy + 0.03, z: 0 };
      lm[16] = { x: cx + 0.01, y: cy + 0.05, z: 0 };
      lm[20] = { x: cx, y: cy + 0.07, z: 0 };

    } else if (this.demoMode === 'FIST') {
      // All fingers folded into fist
      lm[5] = { x: cx - 0.03, y: cy - 0.02, z: 0 };
      lm[8] = { x: cx - 0.01, y: cy + 0.01, z: 0 };
      lm[9] = { x: cx, y: cy - 0.03, z: 0 };
      lm[12] = { x: cx, y: cy + 0.01, z: 0 };
      lm[13] = { x: cx + 0.03, y: cy - 0.02, z: 0 };
      lm[16] = { x: cx + 0.02, y: cy + 0.02, z: 0 };
      lm[17] = { x: cx + 0.05, y: cy, z: 0 };
      lm[20] = { x: cx + 0.03, y: cy + 0.03, z: 0 };
      lm[4] = { x: cx - 0.02, y: cy, z: 0 }; // Thumb folded

    } else if (this.demoMode === 'POINT_UP') {
      // Point UP: Index extended vertically up
      lm[5] = { x: cx, y: cy, z: 0 }; // MCP
      lm[8] = { x: cx + Math.sin(t) * 0.02, y: cy - hs * 1.1, z: 0 }; // Tip pointing up

      // Others curled
      lm[12] = { x: cx + 0.02, y: cy + 0.04, z: 0 };
      lm[16] = { x: cx + 0.04, y: cy + 0.05, z: 0 };
      lm[20] = { x: cx + 0.06, y: cy + 0.06, z: 0 };
      lm[4] = { x: cx - 0.04, y: cy + 0.02, z: 0 };
    }

    this.processResults({ multiHandLandmarks: [lm] });
  }

  setDemoGesture(gestureName) {
    this.demoMode = gestureName;
  }
}
