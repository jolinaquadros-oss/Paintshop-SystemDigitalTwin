import * as THREE from "three";

export function initPaintShopDigitalTwin() {
  window.addEventListener('error', function (e) {
    const l = document.getElementById('loading');
    if (l) { l.style.display = 'flex'; l.textContent = 'Could not load 3D scene: ' + e.message; }
  });
  if (typeof THREE === 'undefined') {
    document.getElementById('loading').textContent = 'Three.js failed to load — check your internet connection and reload.';
  } else {

    /* Small hand-written orbit control (drag to rotate, wheel to zoom) — the OrbitControls
       addon isn't served from the allowed CDN here, so this replaces it with the same feel. */
    class SimpleOrbitControls {
      constructor(camera, domElement, target) {
        this.camera = camera; this.dom = domElement; this.target = target || new THREE.Vector3();
        const off = camera.position.clone().sub(this.target);
        this.radius = off.length();
        this.theta = Math.atan2(off.x, off.z);
        this.phi = Math.acos(Math.min(1, Math.max(-1, off.y / this.radius)));
        this.minDistance = 150; this.maxDistance = 950; this.maxPhi = Math.PI * 0.49; this.minPhi = 0.12;
        this._dragging = false; this._lastX = 0; this._lastY = 0; this.moved = false;
        this.dom.addEventListener('pointerdown', e => { this._dragging = true; this._lastX = e.clientX; this._lastY = e.clientY; this.moved = false; });
        window.addEventListener('pointerup', () => this._dragging = false);
        window.addEventListener('pointermove', e => {
          if (!this._dragging) return;
          const dx = e.clientX - this._lastX, dy = e.clientY - this._lastY;
          this._lastX = e.clientX; this._lastY = e.clientY;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) this.moved = true;
          this.theta -= dx * 0.006;
          this.phi = Math.min(this.maxPhi, Math.max(this.minPhi, this.phi - dy * 0.006));
        });
        this.dom.addEventListener('wheel', e => {
          e.preventDefault();
          this.radius = Math.min(this.maxDistance, Math.max(this.minDistance, this.radius * (1 + e.deltaY * 0.001)));
        }, { passive: false });
      }
      update() {
        const { theta, phi, radius, target } = this;
        this.camera.position.set(
          target.x + radius * Math.sin(phi) * Math.sin(theta),
          target.y + radius * Math.cos(phi),
          target.z + radius * Math.sin(phi) * Math.cos(theta)
        );
        this.camera.lookAt(target);
      }
    }

    /* ---------- palette per category — dark steel-navy bodies (matching the reference render's
       low-poly factory look) with a category accent used only for trim / edges / labels / glow ---------- */
    const COL = {
      endpoint: { hex: 0x5aa3d8, dim: '#173347' },
      inspect: { hex: 0x5aa3d8, dim: '#173347' },
      pretreat: { hex: 0xffc23c, dim: '#4a3712' },
      dryco: { hex: 0x8fd8c8, dim: '#12403c' },
      thermal: { hex: 0xff8a3d, dim: '#4a3a17' },
      paint: { hex: 0xf2722f, dim: '#4a2915' },
      unload: { hex: 0x9fb3c4, dim: '#232d36' },
      dummy: { hex: 0xa48ff0, dim: '#2a2340' }
    };
    const BODY_COLOR = 0x2c3745;      // shared dark steel-navy machine body, like the reference render
    const BODY_COLOR_LT = 0x3a4757;   // lighter steel panel accent
    const HEIGHT = { endpoint: 38, inspect: 38, pretreat: 48, dryco: 42, thermal: 64, paint: 52, unload: 38, dummy: 38 };

    /* ---------- stage definitions — same 2D layout/positions as the reference diagram ---------- */
    const STAGES = [
      {
        id: 0, x: 88, y: 64, w: 140, h: 52, title: 'Component Input', sub: '', cat: 'endpoint', dur: 1.5,
        desc: 'Components enter the Paint Shop through the input section of the integrated line. Each component is assigned a unique Part ID, and components enter at defined intervals — so multiple components can be present inside the line at the same time.'
      },
      {
        id: 1, x: 262, y: 64, w: 140, h: 52, title: 'Initial Inspection', sub: '', cat: 'inspect', dur: 2,
        desc: 'The incoming component passes through initial inspection before entering the pre-treatment sequence. This is represented as part of the process flow — the actual physical inspection procedure is not implemented in this prototype.'
      },
      {
        id: 2, x: 578, y: 64, w: 420, h: 52, title: 'Pre-Treatment Line', sub: 'WR1‑Degreasing‑WR2‑WR3‑Nano Coating‑WR4', cat: 'pretreat', dur: 12,
        desc: 'Sequence: WR1 → Degreasing → WR2 → WR3 → Nano Coating → WR4. This section prepares the component surface before painting. Approximate total duration for the sequence is 12 minutes.'
      },
      {
        id: 3, x: 897, y: 64, w: 140, h: 52, title: 'Air Drying', sub: '', cat: 'dryco', dur: 5,
        desc: 'After pre-treatment, the component undergoes air drying to remove remaining moisture before entering the oven (WDO) section.'
      },
      {
        id: 4, x: 897, y: 187, w: 140, h: 52, title: 'WDO', sub: '140°C', cat: 'thermal', dur: 8,
        desc: 'Water Dry Oven section of the integrated line, entered right after pre-treatment and drying. Process temperature is represented as a software parameter (140°C), not a physical sensor reading.'
      },
      {
        id: 5, x: 721, y: 187, w: 140, h: 52, title: 'Force Cooling', sub: '', cat: 'dryco', dur: 4,
        desc: 'After the oven section, the component passes through force cooling — another internal stage of the same integrated Paint Shop machine.'
      },
      {
        id: 6, x: 547, y: 187, w: 140, h: 52, title: 'Painting Booth', sub: '', cat: 'paint', dur: 21,
        desc: 'The component reaches the painting stage of the line. It is treated as an internal process stage rather than a separate physical machine. Indicated duration is approximately 21 minutes.'
      },
      {
        id: 7, x: 371, y: 187, w: 140, h: 52, title: 'PCO', sub: '170°C', cat: 'thermal', dur: 30,
        desc: 'Powder Curing Oven section, entered right after painting, within the same integrated line. Represented process temperature is 170°C; indicated curing duration is approximately 30 minutes.'
      },
      {
        id: 8, x: 371, y: 308, w: 140, h: 52, title: 'Part Cooling', sub: '', cat: 'dryco', dur: 6,
        desc: 'After curing, the component enters the cooling section before proceeding towards final inspection and unloading.'
      },
      {
        id: 9, x: 547, y: 308, w: 140, h: 52, title: 'Painted Part Inspection', sub: '', cat: 'inspect', dur: 3,
        desc: 'The painted component passes through final inspection. As with initial inspection, the actual quality-testing procedures (grid, alcohol, tape, press tests) are not implemented in this software prototype.'
      },
      {
        id: 10, x: 721, y: 308, w: 140, h: 52, title: 'Unloading Stage 1', sub: '', cat: 'unload', dur: 2,
        desc: 'First stage of the unloading section, where the finished component begins to exit the integrated Paint Shop line.'
      },
      {
        id: 11, x: 897, y: 308, w: 140, h: 52, title: 'Unloading Stage 2', sub: '', cat: 'unload', dur: 2,
        desc: 'Second stage of the unloading sequence, continuing the component\'s exit from the line.'
      },
      {
        id: 12, x: 897, y: 430, w: 140, h: 52, title: 'Unloading Stage 3', sub: '', cat: 'unload', dur: 2,
        desc: 'Final stage of the unloading sequence — the component fully exits the integrated Paint Shop line here.'
      },
      {
        id: 13, x: 721, y: 430, w: 140, h: 52, title: 'Final Good', sub: '', cat: 'endpoint', dur: 1,
        desc: 'The completed component is considered a final painted good after leaving the Paint Shop process, ready to be transferred to the next production area.'
      }
    ];

    // Keep the visualized process durations aligned with the company values in Postgres.
    fetch('http://localhost:3001/api/stages')
      .then(res => {
        if (!res.ok) throw new Error(`Stage durations request failed (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (!data.success || !Array.isArray(data.stages)) {
          throw new Error('Stage durations response was invalid');
        }
        const durationsById = new Map(
          data.stages.map(stage => [Number(stage.stage_id), Number(stage.duration_minutes)])
        );
        STAGES.forEach(stage => {
          const duration = durationsById.get(stage.id);
          if (Number.isFinite(duration)) stage.dur = duration;
        });
      })
      .catch(err => console.error('Error loading stage durations:', err));

    /* ---------- conveyor path (same distance model as the 2D version) ---------- */
    const PATH_NODES = STAGES.map(s => ({ x: s.x, y: s.y }));
    const CUM = [0];
    for (let i = 1; i < PATH_NODES.length; i++) {
      const a = PATH_NODES[i - 1], b = PATH_NODES[i];
      CUM.push(CUM[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    function posToXY(pos) {
      pos = Math.max(0, Math.min(pos, CUM[CUM.length - 1]));
      let i = 0;
      while (i < CUM.length - 2 && pos > CUM[i + 1]) i++;
      const a = PATH_NODES[i], b = PATH_NODES[i + 1];
      const segLen = CUM[i + 1] - CUM[i] || 1;
      const frac = (pos - CUM[i]) / segLen;
      return [a.x + (b.x - a.x) * frac, a.y + (b.y - a.y) * frac];
    }
    const BELT_SPEED = 24, MIN_GAP = 60;
    const RAIL_HEIGHT = 128;      // overhead hanger-conveyor rail height
    const HOOK_LEN = 26;          // drop length from rail to the hanging part
    const PART_Y = RAIL_HEIGHT - HOOK_LEN - 6; // resting center height of a hanging part

    /* ---------- 2D → 3D coordinate mapping ---------- */
    const S = 0.62; // scale from diagram units to scene units
    function toScene(x, y) { return { x: (x - 500) * S, z: (y - 250) * S }; }

    /* ================= THREE.JS SCENE ================= */
    const container = document.getElementById('three-canvas');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121b26);
    scene.fog = new THREE.Fog(0x121b26, 550, 1450);

    const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 1, 3000);
    camera.position.set(60, 420, 520);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const controls = new SimpleOrbitControls(camera, renderer.domElement, new THREE.Vector3(0, 80, 0));
    controls.update();

    let lineFocus = false;
    let savedView = null;
    window.__setLineFocus = enabled => {
      if (enabled === lineFocus) return;

      if (enabled) {
        savedView = {
          target: controls.target.clone(),
          radius: controls.radius,
          theta: controls.theta,
          phi: controls.phi
        };
        // Frame the complete production line tightly when entering full-screen mode.
        controls.target.set(0, 58, 0);
        controls.radius = 600;
        lineFocus = true;
      } else {
        if (savedView) {
          controls.target.copy(savedView.target);
          controls.radius = savedView.radius;
          controls.theta = savedView.theta;
          controls.phi = savedView.phi;
        }
        savedView = null;
        lineFocus = false;
      }

      controls.update();
    };

    scene.add(new THREE.AmbientLight(0x8fa4b8, 0.6));
    const key = new THREE.DirectionalLight(0xdfe9f5, 0.85);
    key.position.set(300, 400, 200);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffb02e, 0.22);
    rim.position.set(-300, 150, -250);
    scene.add(rim);

    /* ---------- canvas-texture label sprite helper ---------- */
    function makeLabelSprite(lines, opts = {}) {
      const w = opts.w || 256, h = opts.h || 96;
      const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d');
      function draw(txtLines, badge) {
        ctx.clearRect(0, 0, w, h);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(10,14,19,0.72)';
        roundRect(ctx, w * 0.06, h * 0.18, w * 0.88, h * 0.64, 10); ctx.fill();
        ctx.strokeStyle = opts.stroke || '#ffc23c'; ctx.lineWidth = 2;
        roundRect(ctx, w * 0.06, h * 0.18, w * 0.88, h * 0.64, 10); ctx.stroke();
        ctx.fillStyle = '#e7edf3';
        ctx.font = '600 20px Oswald, sans-serif';
        ctx.fillText(txtLines[0] || '', w / 2, h * 0.46);
        ctx.font = '400 13px JetBrains Mono, monospace';
        ctx.fillStyle = '#9fb0bf';
        ctx.fillText(txtLines[1] || '', w / 2, h * 0.66);
        if (badge > 0) {
          ctx.beginPath(); ctx.fillStyle = opts.stroke || '#ffc23c';
          ctx.arc(w * 0.90, h * 0.22, 15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#0a0e13'; ctx.font = '700 16px JetBrains Mono, monospace';
          ctx.fillText(String(badge), w * 0.90, h * 0.22 + 5);
        }
      }
      function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
      }
      draw(lines, 0);
      const tex = new THREE.CanvasTexture(cnv);
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(58, 58 * h / w, 1);
      sprite.renderOrder = 10;
      sprite.userData.redraw = (badge) => { draw(lines, badge); tex.needsUpdate = true; };
      return sprite;
    }

    /* ---------- shared machine materials ---------- */
    function steelMat() { return new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.55, metalness: 0.45 }); }
    function steelLtMat() { return new THREE.MeshStandardMaterial({ color: BODY_COLOR_LT, roughness: 0.5, metalness: 0.4 }); }
    function accentMat(hex) { return new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.55, roughness: 0.4, metalness: 0.3 }); }
    function darkPanelMat() { return new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.6, metalness: 0.4 }); }

    /* glowing rectangular footprint outline on the floor, marking each machine's zone
       (replaces a plain box wireframe now that the body itself is a real machine shape) */
    function addFootprintOutline(group, bw, bd, hex) {
      const pts = [
        new THREE.Vector3(-bw * 0.54, 0.4, -bd * 0.54),
        new THREE.Vector3(bw * 0.54, 0.4, -bd * 0.54),
        new THREE.Vector3(bw * 0.54, 0.4, bd * 0.54),
        new THREE.Vector3(-bw * 0.54, 0.4, bd * 0.54),
        new THREE.Vector3(-bw * 0.54, 0.4, -bd * 0.54)
      ];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: 0.65 });
      group.add(new THREE.Line(geo, mat));
    }

    /* ---------- per-category machine builders — composite low-poly shapes standing
       in for the specific equipment at each stage, echoing the reference render's
       distinct machine silhouettes (reel stand, gantry, tanks, oven/press, rollers…) ---------- */
    function buildEndpoint(group, bw, bd, h, hex) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.46, 10, bd * 0.55), steelLtMat());
      base.position.set(-bw * 0.12, 5, 0); group.add(base);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, h * 0.85, 10), steelMat());
      mast.position.set(-bw * 0.12, h * 0.42 + 10, 0); group.add(mast);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.34, 6, 6), steelLtMat());
      arm.position.set(bw * 0.04, h * 0.82 + 10, 0); group.add(arm);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 8), new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.9 }));
      beacon.position.set(bw * 0.2, h * 0.82 + 10, 0); group.add(beacon);
      const screenCnv = document.createElement('canvas'); screenCnv.width = 48; screenCnv.height = 32;
      const sctx = screenCnv.getContext('2d');
      sctx.fillStyle = '#0c121a'; sctx.fillRect(0, 0, 48, 32);
      sctx.fillStyle = '#' + hex.toString(16).padStart(6, '0'); sctx.font = '7px monospace'; sctx.fillText('READY', 6, 18);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(9, 6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(screenCnv) }));
      screen.position.set(-bw * 0.12, h * 0.6 + 10, bd * 0.29); group.add(screen);
      // twin hub spools on the right, like the reference render's input-reel machine
      [-1, 1].forEach(sgn => {
        const spool = new THREE.Mesh(new THREE.CylinderGeometry(bd * 0.24, bd * 0.24, 5, 16), steelLtMat());
        spool.rotation.z = Math.PI / 2;
        spool.position.set(bw * 0.28, h * 0.34, sgn * bd * 0.2);
        group.add(spool);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(bd * 0.24, 1.6, 8, 16), accentMat(hex));
        rim.rotation.y = Math.PI / 2;
        rim.position.copy(spool.position);
        group.add(rim);
      });
    }
    function buildInspect(group, bw, bd, h, hex) {
      [-1, 1].forEach(sx => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(6, h, 6), steelMat());
        post.position.set(sx * bw * 0.34, h / 2, 0);
        group.add(post);
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.76, 6, 6), steelLtMat());
      beam.position.set(0, h, 0); group.add(beam);
      const armDown = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, h * 0.32, 8), steelLtMat());
      armDown.position.set(0, h - h * 0.16, 0); group.add(armDown);
      const head = new THREE.Mesh(new THREE.BoxGeometry(15, 10, 10), accentMat(hex));
      head.position.set(0, h - h * 0.32 - 5, 0); group.add(head);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 4, 12), new THREE.MeshStandardMaterial({ color: 0x111820, emissive: hex, emissiveIntensity: 0.7 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, h - h * 0.32 - 5, 6.5);
      group.add(lens);
      const mon = new THREE.Mesh(new THREE.BoxGeometry(9, 13, 2), steelMat());
      mon.position.set(bw * 0.38, 18, bd * 0.28); group.add(mon);
      const monScreen = new THREE.Mesh(new THREE.PlaneGeometry(6, 9), new THREE.MeshBasicMaterial({ color: hex }));
      monScreen.position.set(bw * 0.38, 18, bd * 0.28 + 1.1); group.add(monScreen);
    }
    function buildPretreat(group, bw, bd, h, hex) {
      const n = 5;
      const spacing = bw / n;
      for (let i = 0; i < n; i++) {
        const tx = -bw / 2 + spacing * (i + 0.5);
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(bd * 0.3, bd * 0.3, h * 0.72, 14), steelLtMat());
        tank.position.set(tx, h * 0.4, 0);
        group.add(tank);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(bd * 0.3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), steelMat());
        cap.position.set(tx, h * 0.76, 0);
        group.add(cap);
        const band = new THREE.Mesh(new THREE.TorusGeometry(bd * 0.31, 1.4, 8, 16), accentMat(hex));
        band.rotation.x = Math.PI / 2;
        band.position.set(tx, h * 0.52, 0);
        group.add(band);
        if (i % 2 === 0) {
          const valve = new THREE.Mesh(new THREE.TorusGeometry(3, 1, 6, 12), accentMat(hex));
          valve.position.set(tx, h * 0.8, bd * 0.32);
          group.add(valve);
        }
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 8, 8), steelMat());
        leg.position.set(tx, 4, 0);
        group.add(leg);
      }
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, bw * 0.96, 10), steelMat());
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, h * 0.9, 0);
      group.add(pipe);
    }
    function buildDryco(group, bw, bd, h, hex) {
      const housing = new THREE.Mesh(new THREE.CylinderGeometry(bd * 0.38, bd * 0.38, h * 0.68, 16), steelMat());
      housing.rotation.z = Math.PI / 2;
      housing.position.set(-bw * 0.1, h * 0.5, 0);
      group.add(housing);
      const ringMount = new THREE.Mesh(new THREE.CylinderGeometry(bd * 0.4, bd * 0.4, 4, 20), steelLtMat());
      ringMount.rotation.z = Math.PI / 2;
      ringMount.position.set(bw * 0.24, h * 0.5, 0);
      group.add(ringMount);
      for (let i = 0; i < 8; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, bd * 0.36, 7), accentMat(hex));
        blade.position.set(bw * 0.24, h * 0.5, 0);
        blade.rotation.x = (i / 8) * Math.PI * 2;
        group.add(blade);
      }
      const hub = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), steelLtMat());
      hub.position.set(bw * 0.26, h * 0.5, 0); group.add(hub);
      const legBlock = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.55, 8, bd * 0.4), steelLtMat());
      legBlock.position.set(0, 4, 0); group.add(legBlock);
    }
    function buildThermal(group, bw, bd, h, hex) {
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, h * 0.82, 10), steelMat());
        leg.position.set(sx * bw * 0.42, h * 0.41, sz * bd * 0.42);
        group.add(leg);
      });
      const head = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.02, h * 0.3, bd * 1.02), steelLtMat());
      head.position.set(0, h * 0.85, 0);
      group.add(head);
      const chamber = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, h * 0.52, bd * 0.86), darkPanelMat());
      chamber.position.set(0, h * 0.4, 0);
      group.add(chamber);
      const doorFrame = new THREE.Mesh(new THREE.TorusGeometry(Math.min(bw, bd) * 0.22, 2, 8, 4), accentMat(hex));
      doorFrame.rotation.y = Math.PI / 4;
      doorFrame.position.set(0, h * 0.4, bd * 0.44);
      group.add(doorFrame);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, bw * 0.5, 10), steelMat());
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(bw * 0.1, h * 0.98, 0);
      group.add(pipe);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 10, 10), steelLtMat());
      cap.position.set(bw * 0.35, h * 1.0, 0);
      group.add(cap);
    }
    function buildPaintSkid(group, bw, bd, h, hex) {
      // Intentionally empty — the painting booth is built separately by buildBoothEnclosure
      // using its own dedicated geometry with guns, walls and control panel.
    }
    function buildUnload(group, bw, bd, h, hex) {
      const fmat = steelMat();
      const frameL = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, 4, 4), fmat);
      frameL.position.set(0, h * 0.35, -bd * 0.32); group.add(frameL);
      const frameR = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, 4, 4), fmat);
      frameR.position.set(0, h * 0.35, bd * 0.32); group.add(frameR);
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(4, h * 0.35, 4), steelLtMat());
        leg.position.set(sx * bw * 0.4, h * 0.175, sz * bd * 0.32);
        group.add(leg);
      });
      const n = 6;
      for (let i = 0; i < n; i++) {
        const rx = -bw * 0.42 + (bw * 0.84) * (i / (n - 1));
        const roller = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, bd * 0.68, 10), accentMat(hex));
        roller.rotation.x = Math.PI / 2;
        roller.position.set(rx, h * 0.37, 0);
        group.add(roller);
      }
    }
    function buildDummy(group, bw, bd, h, hex) {
      const mat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.55, metalness: 0.4 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.8, h * 0.7, bd * 0.8), mat);
      body.position.y = h * 0.35;
      group.add(body);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(body.geometry), new THREE.LineDashedMaterial({ color: hex, dashSize: 4, gapSize: 3 }));
      edges.position.copy(body.position);
      edges.computeLineDistances();
      group.add(edges);
    }

    /* ---------- build machine groups: an invisible click-target box (sized to the stage
       footprint, for reliable raycasting) plus a detailed visible machine model on top ---------- */
    const stageMeshes = {};
    STAGES.forEach(s => {
      const c = COL[s.cat];
      const h = HEIGHT[s.cat];
      const { x, z } = toScene(s.x, s.y);
      const bw = s.w * S * 0.86, bd = s.h * S * 0.86;

      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData.stageId = s.id;

      const hit = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = h / 2;
      hit.userData.stageId = s.id;
      group.add(hit);

      switch (s.cat) {
        case 'endpoint':
          if (s.title !== 'Final Good') buildEndpoint(group, bw, bd, h, c.hex);
          break;
        case 'inspect': buildInspect(group, bw, bd, h, c.hex); break;
        case 'pretreat': buildPretreat(group, bw, bd, h, c.hex); break;
        case 'dryco': buildDryco(group, bw, bd, h, c.hex); break;
        case 'thermal': buildThermal(group, bw, bd, h, c.hex); break;
        case 'paint': buildPaintSkid(group, bw, bd, h, c.hex); break;
        case 'unload': buildUnload(group, bw, bd, h, c.hex); break;
        default: buildDummy(group, bw, bd, h, c.hex);
      }

      addFootprintOutline(group, bw, bd, c.hex);

      const sub = s.sub ? s.sub : (s.cat === 'dummy' ? 'DUMMY MODULE' : '');
      const label = makeLabelSprite([s.title, sub], { stroke: '#' + c.hex.toString(16).padStart(6, '0') });
      label.position.set(0, h + 34, 0);
      group.add(label);

      scene.add(group);
      stageMeshes[s.id] = { group, body: hit, label, h };
    });

    /* ---------- overhead hanger-conveyor rail, with support poles at each stage ---------- */
    /* The rail stops at Unloading Stage 3 (node 12) — Final Good is NOT
       part of the overhead line; a worker takes finished parts off the hook there by hand. */
    const LINE_END_NODE = 12;
    const railMat = new THREE.MeshStandardMaterial({ color: 0x3a4757, roughness: 0.4, metalness: 0.75 });
    const railEdgeMat = new THREE.LineBasicMaterial({ color: 0x54637a, transparent: true, opacity: 0.5 });
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c3745, roughness: 0.6, metalness: 0.4 });
    for (let i = 0; i < LINE_END_NODE; i++) {
      const a = toScene(PATH_NODES[i].x, PATH_NODES[i].y);
      const b = toScene(PATH_NODES[i + 1].x, PATH_NODES[i + 1].y);
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const angle = Math.atan2(b.z - a.z, b.x - a.x);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(len, 6, 6), railMat);
      seg.position.set((a.x + b.x) / 2, RAIL_HEIGHT, (a.z + b.z) / 2);
      seg.rotation.y = -angle;
      scene.add(seg);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(seg.geometry), railEdgeMat);
      edges.position.copy(seg.position); edges.rotation.copy(seg.rotation);
      scene.add(edges);
    }
    // slim neutral steel support poles under the rail
    PATH_NODES.slice(0, LINE_END_NODE + 1).forEach(n => {
      const { x, z } = toScene(n.x, n.y);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, RAIL_HEIGHT, 10), poleMat);
      pole.position.set(x, RAIL_HEIGHT / 2, z);
      scene.add(pole);
    });

    /* ---------- component pool: hangs from the overhead rail like a real part on a hook ---------- */
    const hookGeo = new THREE.CylinderGeometry(1.1, 1.1, HOOK_LEN, 8);
    const PART_LEN = 40, PART_W = 7, PART_D = 2.6;
    const partGeo = new THREE.BoxGeometry(PART_W, PART_LEN, PART_D);
    const holeGeo = new THREE.CylinderGeometry(1.4, 1.4, PART_D + 0.6, 12);
    const holeMat = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.8, metalness: 0.1 });
    const BARE_COLOR = new THREE.Color(0x9aa3ab), PAINTED_COLOR = new THREE.Color(0xf4f6f8);
    const compPool = new Map();
    const dynamicTypes = {};
    const supportedShapes = ['box', 'cylinder', 'torus', 'sphere', 'cone', 'front_panel', 'back_panel', 'top_panel', 'side_panel'];
    const usedComponentShapes = new Set(['front_panel', 'back_panel', 'top_panel', 'side_panel']);
    const usedComponentIds = new Set(['A', 'B', 'C', 'D', 'E', 'F']);
    let reuseShapeIndex = 0;
    let nextTypeChar = 'D'.charCodeAt(0);

    fetch('http://localhost:3001/api/component-types')
      .then(res => {
        if (!res.ok) throw new Error(`Component types request failed (${res.status})`);
        return res.json();
      })
      .then(data => {
        if (!data.success || !Array.isArray(data.componentTypes)) {
          throw new Error('Invalid component types response');
        }
        const sel = document.getElementById('compType');
        data.componentTypes.forEach(type => {
          usedComponentIds.add(type.component_id);
          usedComponentShapes.add(type.shape);
          dynamicTypes[type.component_id] = {
            name: type.component_type,
            shape: type.shape,
            size: 10
          };
          if (sel && !Array.from(sel.options).some(opt => opt.value === type.component_id)) {
            const opt = document.createElement('option');
            opt.value = type.component_id;
            opt.textContent = type.component_type;
            sel.appendChild(opt);
          }
        });
      })
      .catch(err => console.error('Error loading component types:', err));

    function makeCompMesh(id, type) {
      const group = new THREE.Group();
      const hookMat = new THREE.MeshStandardMaterial({ color: 0x8a97a3, roughness: 0.4, metalness: 0.7 });
      const hook = new THREE.Mesh(hookGeo, hookMat);
      hook.position.y = -HOOK_LEN / 2; // hangs downward from the rail attachment point (group origin)
      group.add(hook);
      const partMat = new THREE.MeshStandardMaterial({ color: BARE_COLOR.clone(), roughness: 0.55, metalness: 0.55 });
      const partGrp = new THREE.Group();

      const dt = dynamicTypes[type] || { shape: 'front_panel' }; // fallback
      let geo;
      let partY = -HOOK_LEN - PART_LEN / 2;

      if (dt.shape === 'front_panel') {
        const shape = new THREE.Shape();
        shape.moveTo(-16, -16);
        shape.lineTo(16, -16);
        shape.lineTo(16, 16);
        shape.lineTo(-16, 16);
        shape.lineTo(-16, -16);
        const holePath = new THREE.Path();
        holePath.absarc(0, 0, 11, 0, Math.PI * 2, false);
        shape.holes.push(holePath);
        geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2 });
        geo.translate(0, 0, -1);
      } else if (dt.shape === 'back_panel') {
        geo = new THREE.BoxGeometry(32, 32, 2);
      } else if (dt.shape === 'top_panel') {
        geo = new THREE.BoxGeometry(32, 4, 16);
      } else if (dt.shape === 'side_panel') {
        geo = new THREE.BoxGeometry(4, 28, 18);
      } else if (dt.shape === 'box') {
        geo = new THREE.BoxGeometry(PART_W, PART_LEN, PART_D);
      } else if (dt.shape === 'cylinder') {
        geo = new THREE.CylinderGeometry(4.5, 4.5, PART_LEN, 16);
      } else if (dt.shape === 'torus') {
        geo = new THREE.TorusGeometry(12, 3.5, 16, 32);
        partY = -HOOK_LEN - 18;
      } else if (dt.shape === 'sphere') {
        geo = new THREE.SphereGeometry(6, 16, 16);
        partY = -HOOK_LEN - 14;
      } else {
        geo = new THREE.ConeGeometry(5, PART_LEN * 0.7, 12);
        partY = -HOOK_LEN - PART_LEN * 0.35;
      }

      const part = new THREE.Mesh(geo, partMat);
      part.position.y = partY;
      partGrp.add(part);

      // Punch hole for hanging
      if (['front_panel', 'back_panel', 'top_panel', 'side_panel'].includes(dt.shape)) {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4, 12), new THREE.MeshStandardMaterial({ color: 0x11151a }));
        h.rotation.x = Math.PI / 2;
        h.position.set(0, -HOOK_LEN - 3, 0);
        partGrp.add(h);
      }
      group.add(partGrp);

      const label = makeLabelTiny(dt.name || id);
      label.position.set(0, -HOOK_LEN + 6, 0);
      group.add(label);
      scene.add(group);
      return { mesh: group, hook, partMat, label, paintState: 'bare' };
    }
    function makeLabelTiny(text) {
      const w = 180, h = 40;
      const cnv = document.createElement('canvas'); cnv.width = w; cnv.height = h;
      const ctx = cnv.getContext('2d');
      ctx.fillStyle = 'rgba(10,14,19,.85)'; ctx.fillRect(4, 4, w - 8, h - 8);
      ctx.strokeStyle = '#ffc23c'; ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#ffd27a'; ctx.font = '700 16px JetBrains Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText(text, w / 2, h / 2 + 5);
      const tex = new THREE.CanvasTexture(cnv);
      const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
      const sp = new THREE.Sprite(mat);
      sp.scale.set(37.5, 37.5 * h / w, 1);
      sp.renderOrder = 11;
      return sp;
    }

    /* ---------- painting booth: two reciprocating guns spraying the hanging part ---------- */
    const boothStage = STAGES.find(s => s.title === 'Painting Booth');
    const boothPos = toScene(boothStage.x, boothStage.y);
    const boothDepth = boothStage.h * S * 0.86;
    const GUN_OFFSET_Z = boothDepth / 2 + 18;
    const GUN_MIN_Y = 42, GUN_MAX_Y = 86;

    function buildGunRig(sideSign) { // sideSign -1 = gun on the -z side, +1 = gun on the +z side
      const INWARD = -sideSign; // direction from this gun toward the booth centre / hanging part
      const rig = new THREE.Group();
      rig.position.set(boothPos.x, 0, boothPos.z + sideSign * GUN_OFFSET_Z);

      const railMatGun = new THREE.MeshStandardMaterial({ color: 0x30394a, roughness: 0.5, metalness: 0.6 });
      const rail = new THREE.Mesh(new THREE.BoxGeometry(6, GUN_MAX_Y - GUN_MIN_Y + 30, 6), railMatGun);
      rail.position.y = (GUN_MIN_Y + GUN_MAX_Y) / 2;
      rig.add(rail);

      const carriage = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffc23c, emissive: 0xffc23c, emissiveIntensity: 0.2, roughness: 0.35, metalness: 0.5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 20), bodyMat);
      carriage.add(body);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(3.4, 10, 10), bodyMat);
      nozzle.rotation.x = Math.PI / 2 * INWARD;      // nozzle tip points toward the hanging part
      nozzle.position.z = INWARD * 13;               // ...and sits on the inward-facing end of the barrel
      carriage.add(nozzle);
      rig.add(carriage);

      // spray fan — narrow at the nozzle, flaring wider toward the part (like a real spray pattern),
      // toggled visible only while this gun is actively spraying
      const sprayLen = GUN_OFFSET_Z - 14;
      const sprayGeo = new THREE.ConeGeometry(16, sprayLen, 18, 1, true);
      sprayGeo.translate(0, -sprayLen / 2, 0); // move the apex (narrow tip) to the local origin, at the nozzle
      const sprayMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.30, side: THREE.DoubleSide });
      const spray = new THREE.Mesh(sprayGeo, sprayMat);
      spray.rotation.x = -Math.PI / 2 * INWARD;
      spray.position.z = INWARD * 13;                // starts right at the nozzle and flares inward toward the part
      spray.visible = false;
      carriage.add(spray);

      scene.add(rig);
      return { rig, carriage, spray };
    }
    const gun1 = buildGunRig(-1); // on the -z side, sprays inward toward +z
    const gun2 = buildGunRig(1);  // on the +z side, sprays inward toward -z

    /* booth enclosure panels — dark steel booth walls with amber trim, matching the booth overlay */
    (function buildBoothEnclosure() {
      const panelMat = new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
      const frameMat = new THREE.MeshStandardMaterial({ color: 0xffb02e, emissive: 0xffb02e, emissiveIntensity: 0.35, roughness: 0.5, metalness: 0.4 });
      const wallH = 105;
      const boothW = boothStage.w * S * 0.95;
      // Wall span: guns are at GUN_OFFSET_Z, carriage body depth is 10, wall thickness is 6.
      // Inner face of wall = GUN_OFFSET_Z + 10, wall centre = GUN_OFFSET_Z + 13.
      // Span (centre to centre) = GUN_OFFSET_Z * 2 + 26, then pull in by 10 to avoid touching neighbours.
      const wallSpan = GUN_OFFSET_Z * 2 + 16;

      // Front and Back walls (on Z axis, one behind each gun)
      const wallFront = new THREE.Mesh(new THREE.BoxGeometry(boothW, wallH, 6), panelMat);
      wallFront.position.set(boothPos.x, wallH / 2, boothPos.z + wallSpan / 2);
      scene.add(wallFront);

      const wallBack = new THREE.Mesh(new THREE.BoxGeometry(boothW, wallH, 6), panelMat);
      wallBack.position.set(boothPos.x, wallH / 2, boothPos.z - wallSpan / 2);
      scene.add(wallBack);

      // 4 corner posts
      [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(6, wallH, 6), frameMat);
        post.position.set(boothPos.x + sx * boothW / 2 * 0.95, wallH / 2, boothPos.z + sz * wallSpan / 2);
        scene.add(post);
      });

      // HMI control panel mounted on the inside of the back wall, shifted to the right (matching overlay)
      const panelGroup = new THREE.Group();
      panelGroup.position.set(boothPos.x + 25, 0, boothPos.z - GUN_OFFSET_Z - 6);
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(16, 46, 8), new THREE.MeshStandardMaterial({ color: 0x2c3745, roughness: 0.6, metalness: 0.35 }));
      cabinet.position.y = 23;
      panelGroup.add(cabinet);
      const screenCnv = document.createElement('canvas'); screenCnv.width = 64; screenCnv.height = 48;
      const sctx = screenCnv.getContext('2d');
      sctx.fillStyle = '#241a06'; sctx.fillRect(0, 0, 64, 48);
      sctx.fillStyle = '#ffc23c'; sctx.font = '8px monospace'; sctx.fillText('PAINT', 6, 20); sctx.fillText('BOOTH', 6, 32);
      const screenMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(screenCnv) });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), screenMat);
      screen.position.set(0, 34, 4.1);
      panelGroup.add(screen);
      const btnColors = [0xe8483a, 0x54e0a8, 0xffc23c];
      btnColors.forEach((col, i) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.5, 12), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 }));
        btn.rotation.x = Math.PI / 2;
        btn.position.set(-5 + i * 5, 14, 4.2);
        panelGroup.add(btn);
      });
      scene.add(panelGroup);
    })();

    /* ---------- glowing oven interior tunnels — concentric receding frames in a warm
       pink/red glow, matching the reference render's oven-window look, for WDO and PCO ---------- */
    function buildOvenTunnel(stage) {
      const p = toScene(stage.x, stage.y);
      const h = HEIGHT.thermal;
      const group = new THREE.Group();
      group.position.set(p.x, h * 0.34, p.z);

      const rings = 6;
      const innerW = stage.w * S * 0.5, innerH = h * 0.5;
      for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        const w = innerW * (1 - t * 0.7), hh = innerH * (1 - t * 0.7);
        const mat = new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0.85 - t * 0.55 });
        const frame = new THREE.Mesh(new THREE.RingGeometry(Math.max(1, Math.min(w, hh) * 0.001), Math.min(w, hh), 4, 1), mat); // placeholder unused
        // build a simple rectangular frame using 4 thin boxes instead of a ring, for a tunnel look
        const grp = new THREE.Group();
        const bw = 1.6;
        const top = new THREE.Mesh(new THREE.BoxGeometry(w * 2, bw, bw), mat);
        top.position.y = hh;
        const bot = new THREE.Mesh(new THREE.BoxGeometry(w * 2, bw, bw), mat);
        bot.position.y = -hh;
        const left = new THREE.Mesh(new THREE.BoxGeometry(bw, hh * 2, bw), mat);
        left.position.x = -w;
        const right = new THREE.Mesh(new THREE.BoxGeometry(bw, hh * 2, bw), mat);
        right.position.x = w;
        grp.add(top, bot, left, right);
        grp.position.z = -t * (stage.h * S * 0.7);
        group.add(grp);
      }
      scene.add(group);

      const glow = new THREE.PointLight(0xff6a4a, 1.3, 150, 2);
      glow.position.set(p.x, h * 0.34, p.z);
      scene.add(glow);
    }
    buildOvenTunnel(STAGES.find(s => s.title === 'WDO'));
    buildOvenTunnel(STAGES.find(s => s.title === 'PCO'));

    /* ---------- black storage cart at Final Good for completed components ---------- */
    const STAND_Y = 43; // storage group height after compacting the hanging part
    const FINAL_GOOD_ID = STAGES.find(s => s.title === 'Final Good').id;
    (function buildFinishingStand() {
      const p1 = toScene(STAGES[FINAL_GOOD_ID].x, STAGES[FINAL_GOOD_ID].y);
      const cartMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.7, metalness: 0.35 });
      const group = new THREE.Group();
      group.position.set(p1.x, 0, p1.z);
      const floor = new THREE.Mesh(new THREE.BoxGeometry(54, 3, 42), cartMat);
      floor.position.y = 1.5;
      group.add(floor);
      const wallHeight = 30;
      const wallY = 3 + wallHeight / 2;
      const back = new THREE.Mesh(new THREE.BoxGeometry(54, wallHeight, 3), cartMat);
      back.position.set(0, wallY, -21);
      group.add(back);
      const front = new THREE.Mesh(new THREE.BoxGeometry(54, wallHeight, 3), cartMat);
      front.position.set(0, wallY, 21);
      group.add(front);
      const left = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight, 42), cartMat);
      left.position.set(-27, wallY, 0);
      group.add(left);
      const right = new THREE.Mesh(new THREE.BoxGeometry(3, wallHeight, 42), cartMat);
      right.position.set(27, wallY, 0);
      group.add(right);
      scene.add(group);
    })();
    const storedComponents = [];
    function clearStoredComponents() {
      storedComponents.forEach(pooled => scene.remove(pooled.mesh));
      storedComponents.length = 0;
    }
    function storeCompletedComponent(pooled) {
      const fg = toScene(STAGES[FINAL_GOOD_ID].x, STAGES[FINAL_GOOD_ID].y);
      const slot = storedComponents.length;
      
      // Scale down more so they comfortably fit in a 2x2 grid without touching walls
      pooled.mesh.scale.set(0.3, 0.3, 0.3);
      
      const columns = 2;
      const rows = 2;
      const itemsPerLayer = columns * rows;
      
      // Keep them inside the box by capping the maximum layers
      const layer = Math.floor(slot / itemsPerLayer) % 4;
      const layerSlot = slot % itemsPerLayer;
      const column = layerSlot % columns;
      const row = Math.floor(layerSlot / columns);
      
      pooled.hook.visible = false;
      if (pooled.label) pooled.label.visible = false; // Hide labels in the box to prevent visual clutter
      
      // Group Y offset calculation: parts are built at ~-46 local Y.
      // At scale 0.3, -46 * 0.3 = -13.8. Floor is at Y=3.
      // Setting group Y to 18 puts the bottom of the parts right on the cart floor.
      pooled.mesh.position.set(
        fg.x - 8 + column * 16,
        18 + layer * 4,
        fg.z - 8 + row * 16
      );
      storedComponents.push(pooled);
    }

    let gunClock = 0;
    function updateBoothGuns(dtSec) {
      gunClock += dtSec;
      const freq = 0.9; // oscillation speed, independent of sim speed so it always looks alive
      const phase = gunClock * freq * Math.PI * 2;
      const s1 = Math.sin(phase), s2 = Math.sin(phase + Math.PI); // alternate
      const boothOccupied = components.some(c => Math.abs(c.pos - CUM[boothStage.id]) < 30);

      const y1 = GUN_MIN_Y + (s1 * 0.5 + 0.5) * (GUN_MAX_Y - GUN_MIN_Y);
      const y2 = GUN_MIN_Y + (s2 * 0.5 + 0.5) * (GUN_MAX_Y - GUN_MIN_Y);
      gun1.carriage.position.y = y1;
      gun2.carriage.position.y = y2;
      gun1.spray.visible = boothOccupied && s1 > 0;
      gun2.spray.visible = boothOccupied && s2 > 0;
    }

    /* ---------- click-to-inspect ---------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let dragMoved = false;
    renderer.domElement.addEventListener('pointerdown', () => dragMoved = false);
    renderer.domElement.addEventListener('pointermove', () => dragMoved = true);
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (dragMoved) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const bodies = Object.values(stageMeshes).map(m => m.body);
      const hits = raycaster.intersectObjects(bodies, false);
      if (hits.length) {
        const sid = hits[0].object.userData.stageId;
        openModal(STAGES.find(s => s.id === sid));
      }
    });

    /* ---------- modal ---------- */
    const modalBackdrop = document.getElementById('modalBackdrop');
    function openModal(s) {
      const c = COL[s.cat];
      const hexStr = '#' + c.hex.toString(16).padStart(6, '0');
      document.getElementById('modalTag').textContent = s.cat.toUpperCase();
      document.getElementById('modalTag').style.color = hexStr;
      document.getElementById('modalTag').style.borderColor = hexStr;
      document.getElementById('modalTitle').textContent = s.title + (s.sub ? ' ' + s.sub : '');
      document.getElementById('modalDesc').textContent = s.desc;
      const wip = components.filter(comp => comp.nodeIdx === s.id).length
        + (s.id === FINAL_GOOD_ID ? storedComponents.length : 0);
      document.getElementById('modalStats').innerHTML = `
    <div class="modal-stat"><div class="lbl">Process duration</div><div class="num" style="color:${hexStr}">${s.dur} min</div></div>
    <div class="modal-stat"><div class="lbl">Currently here</div><div class="num" style="color:${hexStr}">${wip}</div></div>
    ${s.cat === 'thermal' ? `<div class="modal-stat"><div class="lbl">Setpoint</div><div class="num" style="color:${hexStr}">${s.sub}</div></div>` : ''}
    ${s.cat === 'dummy' ? `<div class="modal-stat"><div class="lbl">Implementation</div><div class="num" style="color:${hexStr};font-size:12px;">Not implemented</div></div>` : ''}
  `;
      modalBackdrop.classList.add('open');
    }
    document.getElementById('modalClose').addEventListener('click', () => modalBackdrop.classList.remove('open'));
    modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) modalBackdrop.classList.remove('open'); });

    /* ---------- simulation state (same conveyor-queue model as the 2D twin) ---------- */
    let running = false, speed = 1, entryInterval = 6, simMinutes = 0, sinceLastSpawn = 0;
    let nextId = 1, entered = 0, completed = 0, runCompleted = 0;
    let downtimeActive = false, downtimeTimer = 0, downtimeMin = 0;
    let bulkRunActive = false;
    let autoFeedRunActive = false;
    // Per-machine downtime: map of stageId -> remaining downtime minutes
    const machineDowntimes = {};
    const components = [];

    function getShiftLength() { return parseFloat(document.getElementById('shiftLength').value) || 480; }
    function getPlannedDT() { return parseFloat(document.getElementById('plannedDT').value) || 0; }

    function spawn(forcedType = null, forcedPos = 0) {
      entered++;
      const type = forcedType || (document.getElementById('compType') ? document.getElementById('compType').value : 'A');
      const c = { id: nextId++, type: type, pos: forcedPos, nodeIdx: 0, timer: 0, spawnTime: simMinutes, stageDone: {} };
      components.push(c);
      compPool.set(c.id, makeCompMesh(c.id, type));
      logEvent(`C${String(c.id).padStart(3, '0')} [${dynamicTypes[type]?.name || type}] entered line`, 'spawn');
    }
    function logEvent(msg, cls) {
      const logEl = document.getElementById('log');
      const div = document.createElement('div');
      div.className = 'log-entry' + (cls ? (' ' + cls) : '');
      div.innerHTML = `<b>[${fmtClock(simMinutes)}]</b> ${msg}`;
      logEl.prepend(div);
      while (logEl.children.length > 200) logEl.removeChild(logEl.lastChild);
    }
    function fmtClock(min) {
      const h = Math.floor(min / 60), m = Math.floor(min % 60);
      return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    function step(dtMin) {
      // The SIM CLOCK represents elapsed production time.
      simMinutes += dtMin;

      // A full-line downtime stops the entire line.
      if (downtimeActive) {
        downtimeMin += dtMin;
        downtimeTimer -= dtMin;
        if (downtimeTimer <= 0) {
          downtimeActive = false;
          downtimeTimer = 0;
          logEvent(`<span style="color:#54e0a8">✓ Full line restored after downtime</span>`);
        }
        return;
      }

      // Tick per-stage downtimes. Multiple simultaneous stage downtimes
      // count as one minute of line impact, not multiple minutes.
      const hadStageDowntime = Object.values(machineDowntimes).some(v => v > 0);
      if (hadStageDowntime) downtimeMin += dtMin;

      for (const sid in machineDowntimes) {
        if (machineDowntimes[sid] > 0) {
          machineDowntimes[sid] -= dtMin;
          if (machineDowntimes[sid] <= 0) {
            delete machineDowntimes[sid];
            const st = STAGES.find(s => s.id === +sid);
            logEvent(`<span style="color:#54e0a8">✓ ${st ? st.title : 'Machine'} restored after downtime</span>`);
            const sm = stageMeshes[+sid];
            if (sm && sm._downtimePulse) { clearInterval(sm._downtimePulse); sm._downtimePulse = null; }
          }
        }
      }

      // Continuous feed is used only when the user has enabled it.
      // Bulk mode disables this automatically and stops after all bulk parts finish.
      if (document.getElementById('chkAutoFeed') && document.getElementById('chkAutoFeed').checked && !bulkRunActive) {
        sinceLastSpawn += dtMin;
        if (sinceLastSpawn >= entryInterval) { sinceLastSpawn = 0; spawn(); }
      }

      const toRemove = [];
      for (let i = 0; i < components.length; i++) {
        const c = components[i];
        const ahead = i > 0 ? components[i - 1] : null;

        if (c.nodeIdx >= LINE_END_NODE) {
          c.timer -= dtMin;
          if (c.timer <= 0) {
            completed++;
            runCompleted++;
            const flow = simMinutes - c.spawnTime;
            logEvent(`C${String(c.id).padStart(3, '0')} <b>completed at Final Good</b> · flow time ${flow.toFixed(1)} min`, 'assembled');
            const pooled = compPool.get(c.id);
            if (pooled) { storeCompletedComponent(pooled); compPool.delete(c.id); }
            toRemove.push(i);
          }
          continue;
        }

        // Stage-specific downtime is local to each stage.
        // A component is blocked only while it has NOT completed the
        // affected stage. Once it crosses that stage's exit boundary,
        // it is marked complete for that stage and continues normally.
        // This rule is identical for Painting Booth, Pre-Treatment, WDO,
        // PCO, Cooling, Inspection and every other internal stage.
        const stageDown = Object.keys(machineDowntimes).some(sid => {
          const stageId = Number(sid);

          // The same rule is used for EVERY stage: a downtime only blocks
          // a component until that component has completed the affected
          // stage. Once the component crosses that stage's exit boundary,
          // stageDone is true and the component continues forward even if
          // the downtime is still active.
          //
          // This prevents a completed component from being pulled back or
          // stopped by a downtime that belongs to a stage it already passed.
          return !c.stageDone[stageId];
        });

        if (!stageDown) {
          const cap = ahead ? (ahead.pos - MIN_GAP) : Infinity;
          c.pos = Math.max(
            c.pos,
            Math.min(c.pos + BELT_SPEED * dtMin, cap)
          );
        }

        while (c.nodeIdx < LINE_END_NODE && c.pos >= CUM[c.nodeIdx + 1]) {
          const passedStageId = c.nodeIdx;
          // Mark the stage complete at its exit. From this point onward,
          // downtime at that stage must NOT stop this component.
          c.stageDone[passedStageId] = true;
          c.nodeIdx++;
          if (c.nodeIdx === 2) logEvent(`C${String(c.id).padStart(3, '0')} cleared Pre-Treatment Line`);
          if (c.nodeIdx === 6) logEvent(`C${String(c.id).padStart(3, '0')} cleared Painting Booth`);
          if (c.nodeIdx === 7) logEvent(`C${String(c.id).padStart(3, '0')} cleared PCO curing`);

          if (c.nodeIdx === LINE_END_NODE) {
            logEvent(`C${String(c.id).padStart(3, '0')} unhooked from conveyor → Final Good`);
            c.pos = CUM[CUM.length - 1] + 9999;
            c.nodeIdx = LINE_END_NODE + 1;
            c.timer = STAGES[13].dur;
            break;
          }
        }
      }
      for (let k = toRemove.length - 1; k >= 0; k--) components.splice(toRemove[k], 1);

      const autoFeedFinished = autoFeedRunActive
        && !document.getElementById('chkAutoFeed')?.checked
        && components.length === 0;
      if ((bulkRunActive || autoFeedFinished) && components.length === 0) {
        bulkRunActive = false;
        autoFeedRunActive = false;
        running = false;
        document.getElementById('btnPlay').textContent = 'Start';
        document.getElementById('runState').textContent = 'COMPLETED';
        logEvent(
          autoFeedFinished
            ? 'Continuous auto-feed completed — all components finished'
            : 'Bulk production completed — simulation stopped automatically',
          'assembled'
        );
        updateStats();
        if (window.completeCurrentRun) window.completeCurrentRun();
      }
    }

    /* ---------- per-frame render/update ---------- */
    let lastFrame = null;
    const SEC_PER_SIMMIN_BASE = 0.9;
    let lastBadgeCounts = {};

    function updateStats() {
      document.getElementById('simClock').textContent = fmtClock(simMinutes);
      document.getElementById('kpiWip').textContent = components.length;
      document.getElementById('kpiInputComponents').textContent = entered;
      document.getElementById('kpiOutputComponents').textContent = completed;
      if (running) {
        document.getElementById('runState').textContent = downtimeActive ? `DOWNTIME (${downtimeTimer.toFixed(1)}m left)` : 'RUNNING';
      }

      /* ---- OEE metrics: industry-standard formulas ---- */
      const shiftLength = getShiftLength();                          // Shift Length (user-configured)
      const plannedDT = getPlannedDT();                            // Planned Downtime (breaks + maint.)
      const PPT = Math.max(0, shiftLength - plannedDT);      // PPT = Shift Length − Planned DT
      const runTime = Math.max(0, PPT - downtimeMin);            // Run Time = PPT − Unplanned Downtime
      const idealCT = entryInterval;                             // Ideal Cycle Time (entry interval slider)
      const totalCount = runCompleted;                               // Total completed parts for this run
      const expectedCount = PPT > 0 && idealCT > 0 ? PPT / idealCT : 0; // Expected Count without downtime
      const expectedCountDT = runTime > 0 && idealCT > 0 ? runTime / idealCT : 0; // Expected Count with downtime
      const avgCT = totalCount > 0 ? runTime / totalCount : 0; // Avg CT = Run Time / Total Count
      const uph = totalCount / (shiftLength / 60 || 1);       // UPH = Total / Shift Length (hrs)
      const availability = PPT > 0 ? runTime / PPT : 0;              // Availability = Run Time / PPT
      const performance = runTime > 0 ? Math.min(1, (idealCT * totalCount) / runTime) : 0;
      const quality = 1; // No quality check is simulated in the prototype.
      const oee = Math.min(1, availability * performance * quality);

      window.currentRunStats = { oee, availability, performance, quality, downtime: downtimeMin, totalCount, okCount: totalCount };

      // update PPT preview in Shift Setup panel
      document.getElementById('mPPTCalc').textContent = PPT.toFixed(0) + ' min';

      document.getElementById('kpiOEE').textContent = (oee * 100).toFixed(0) + '%';
      document.getElementById('kpiOEE').style.color = oee > 0.85 ? '#54e0a8' : (oee > 0.6 ? '#ffc23c' : '#e8483a');
      document.getElementById('kpiAvail').textContent = (availability * 100).toFixed(0) + '%';
      document.getElementById('kpiPerf').textContent = (performance * 100).toFixed(0) + '%';
      document.getElementById('kpiQual').textContent = (quality * 100).toFixed(0) + '%';
      document.getElementById('kpiUPH').textContent = uph.toFixed(1);
      document.getElementById('mShiftLen').textContent = shiftLength.toFixed(0) + ' min';
      document.getElementById('mPlanDT').textContent = plannedDT.toFixed(0) + ' min';
      document.getElementById('mPPT').textContent = PPT.toFixed(1) + ' min';
      document.getElementById('mElapsed').textContent = simMinutes.toFixed(1) + ' min';
      document.getElementById('mDowntime').textContent = downtimeMin.toFixed(1) + ' min';
      document.getElementById('mRunTime').textContent = runTime.toFixed(1) + ' min';
      document.getElementById('mIdealCT').textContent = idealCT.toFixed(1) + ' min';
      document.getElementById('mAvgCT').textContent = avgCT.toFixed(1) + ' min';
      document.getElementById('mExpected').textContent = expectedCount.toFixed(1);
      document.getElementById('mExpectedDT').textContent = expectedCountDT.toFixed(1);
      document.getElementById('mTotal').textContent = totalCount;
      document.getElementById('mOK').textContent = totalCount;

      const counts = {};
      components.forEach(c => { counts[c.nodeIdx] = (counts[c.nodeIdx] || 0) + 1; });
      STAGES.forEach(s => {
        const n = counts[s.id] || 0;
        if (lastBadgeCounts[s.id] !== n) {
          stageMeshes[s.id].label.userData.redraw(n);
          lastBadgeCounts[s.id] = n;
        }
      });
    }

    function updateComponents() {
      const boothIdx = boothStage.id; // Painting Booth
      components.forEach(c => {
        const pooled = compPool.get(c.id);
        if (!pooled) return;
        const [x2, y2] = posToXY(c.pos);
        const { x, z } = toScene(x2, y2);
        const jitter = (c.id % 3) - 1;

        if (c.nodeIdx < LINE_END_NODE) {
          pooled.hook.visible = true;
          const yy = RAIL_HEIGHT;
          pooled.mesh.position.set(x, yy, z);
        } else {
          pooled.hook.visible = false;
          const yy = STAND_Y;
          const fg = toScene(STAGES[FINAL_GOOD_ID].x, STAGES[FINAL_GOOD_ID].y);
          pooled.mesh.position.set(fg.x, yy, fg.z + jitter * 10);
        }

        // progressive raw-grey -> white powder-coat colour change while passing through the booth,
        // per the reference: colour change happens gradually across the painting stage, not instantly
        const boothPos = CUM[boothIdx];
        let frac;
        if (c.pos < boothPos - 20) frac = 0;
        else if (c.pos > boothPos + 20) frac = 1;
        else frac = (c.pos - (boothPos - 20)) / 40;

        frac = Math.max(0, Math.min(1, frac));
        const mat = pooled.partMat;
        mat.color.copy(BARE_COLOR).lerp(PAINTED_COLOR, frac);
        mat.metalness = 0.55 + (0.12 - 0.55) * frac;  // bare metal shine -> matte powder-coat finish
        mat.roughness = 0.55 + (0.42 - 0.55) * frac;
      });
    }

    function animate(ts) {
      if (lastFrame === null) lastFrame = ts;
      const dtSec = Math.min((ts - lastFrame) / 1000, 0.25);
      lastFrame = ts;
      if (running) {
        const secPerMin = SEC_PER_SIMMIN_BASE / speed;
        step(dtSec / secPerMin);
        updateBoothGuns(dtSec);
      }
      updateStats();
      updateComponents();
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    function onResize() {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    }
    window.addEventListener('resize', onResize);

    /* ---------- controls wiring ---------- */
    document.getElementById('btnPlay').addEventListener('click', e => {
      if (!window.completeCurrentRun) {
        window.completeCurrentRun = function () {
          if (!window.currentRunId) {
            // The simulation can finish before the asynchronous start request returns.
            if (window.currentRunStartPromise) window.pendingRunStatus = 'Completed';
            return;
          }
          fetch(`http://localhost:3001/api/runs/${window.currentRunId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(window.currentRunStats || {})
          }).catch(err => console.error(err));
          window.currentRunId = null;
        };
      }
      if (!window.updateCurrentRunStatus) {
        window.updateCurrentRunStatus = function (status) {
          if (!window.currentRunId) return;
          fetch(`http://localhost:3001/api/runs/${window.currentRunId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, downtime: window.currentRunStats?.downtime ?? 0 })
          }).catch(err => console.error(`Error setting run status to ${status}:`, err));
        };
      }

      if (!running) {
        const shiftLength = getShiftLength();
        const plannedDT = getPlannedDT();

        if (shiftLength <= 0) {
          alert('Please enter a valid Shift Length.');
          return;
        }
        if (plannedDT < 0 || plannedDT >= shiftLength) {
          alert('Planned Downtime must be less than Shift Length.');
          return;
        }

        clearStoredComponents();
        running = true;
        autoFeedRunActive = document.getElementById('chkAutoFeed')?.checked === true;
        runCompleted = 0;
        completed = 0;
        e.target.textContent = 'Pause';
        document.getElementById('runState').textContent = 'RUNNING';

        if (window.currentRunId) {
          window.updateCurrentRunStatus('Running');
        } else if (!window.currentRunStartPromise) {
          const compType = document.getElementById('compType')?.value || 'A';
          window.pendingRunStatus = 'Running';
          window.currentRunStartPromise = fetch('http://localhost:3001/api/runs/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ componentType: compType })
          })
            .then(res => res.json())
            .then(data => {
              if (!data.success) throw new Error(data.error || 'Unable to start run');
              window.currentRunId = data.runId;
              if (window.pendingRunStatus === 'Completed') {
                window.completeCurrentRun();
              } else if (window.pendingRunStatus && window.pendingRunStatus !== 'Running') {
                window.updateCurrentRunStatus(window.pendingRunStatus);
              }
            })
            .catch(err => console.error('Error starting run:', err))
            .finally(() => {
              window.currentRunStartPromise = null;
              window.pendingRunStatus = null;
            });
        }

        // Start production with the first component immediately.
        if (components.length === 0 && document.getElementById('chkAutoFeed')?.checked) {
          sinceLastSpawn = 0;
          spawn();
        }

        logEvent(`Simulation started — Shift ${shiftLength} min, Planned DT ${plannedDT} min`, 'spawn');
      } else {
        running = false;
        e.target.textContent = 'Resume';
        document.getElementById('runState').textContent = 'PAUSED';
        if (window.currentRunId) {
          window.updateCurrentRunStatus('Paused');
        } else if (window.currentRunStartPromise) {
          window.pendingRunStatus = 'Paused';
        }
      }
    });
    document.getElementById('btnAdd').addEventListener('click', () => {
      const compType = document.getElementById('compType');
      const count = parseInt(document.getElementById('bulkCount').value) || 1;
      const type = compType ? compType.value : 'A';

      // A new manual batch replaces the previous batch instead of accumulating it.
      components.forEach(c => {
        const pooled = compPool.get(c.id);
        if (pooled) scene.remove(pooled.mesh);
      });
      clearStoredComponents();
      components.length = 0;
      compPool.clear();
      entered = 0;
      completed = 0;
      runCompleted = 0;
      nextId = 1;

      if (count > 0 && document.getElementById('chkAutoFeed')) {
        document.getElementById('chkAutoFeed').checked = false;
      }

      // Manually added parts form a finite run and stop after the last part finishes.
      bulkRunActive = count > 0;
      sinceLastSpawn = 0;

      for (let i = 0; i < count; i++) {
        let spawnPos = 0;
        if (components.length > 0) {
          spawnPos = Math.min(0, components[components.length - 1].pos - MIN_GAP);
        }
        spawn(type, spawnPos);
      }
    });
    document.getElementById('chkAutoFeed').addEventListener('change', e => {
      if (e.target.checked && running) {
        autoFeedRunActive = true;
        logEvent('Continuous auto-feed resumed', 'spawn');
      } else if (!e.target.checked && autoFeedRunActive) {
        logEvent('Continuous auto-feed stopped — existing components will finish', 'spawn');
      }
    });
    document.getElementById('btnNewType').addEventListener('click', () => {
      const name = prompt("Enter a name for the new component type (e.g., 'Engine Cover'):");
      if (!name) return;
      const unusedShape = supportedShapes.find(candidate => !usedComponentShapes.has(candidate));
      const reusingShape = !unusedShape;
      const shape = unusedShape || supportedShapes[reuseShapeIndex];
      let typeId = name;
      if (usedComponentIds.has(typeId)) {
        alert("A component with this name already exists.");
        return;
      }
      usedComponentIds.add(typeId);
      const size = 27;
      dynamicTypes[typeId] = { name, shape, size };

      const sel = document.getElementById('compType');
      fetch('http://localhost:3001/api/component-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ component_id: typeId, component_type: name, shape })
      })
        .then(res => res.json().then(data => ({ ok: res.ok, data })))
        .then(({ ok, data }) => {
          if (!ok || !data.success) throw new Error(data.error || 'Unable to save component type');
          const opt = document.createElement('option');
          opt.value = typeId;
          opt.textContent = name;
          sel.appendChild(opt);
          sel.value = typeId;
          usedComponentShapes.add(shape);
          if (reusingShape) reuseShapeIndex = (reuseShapeIndex + 1) % supportedShapes.length;
          logEvent(`New component type defined: ${name}`);
        })
        .catch(err => {
          delete dynamicTypes[typeId];
          console.error('Error saving component type:', err);
          alert(`Could not save component type: ${err.message}`);
        });
    });
    /* ---------- downtime modal wiring ---------- */
    (function setupDowntimeModal() {
      const backdrop = document.getElementById('dtModalBackdrop');
      const listEl = document.getElementById('dtMachineList');

      function openDtModal() {
        // build machine checkboxes from STAGES (exclude endpoints for realism)
        listEl.innerHTML = '';
        STAGES.forEach(s => {
          const item = document.createElement('label');
          item.className = 'mcheck';
          item.innerHTML = `<input type="checkbox" value="${s.id}"><span>${s.title}</span>`;
          item.querySelector('input').addEventListener('change', e => {
            item.classList.toggle('sel', e.target.checked);
          });
          listEl.appendChild(item);
        });
        backdrop.classList.add('open');
      }

      document.getElementById('btnDowntime').addEventListener('click', openDtModal);
      document.getElementById('dtModalClose').addEventListener('click', () => backdrop.classList.remove('open'));
      document.getElementById('dtModalCancel').addEventListener('click', () => backdrop.classList.remove('open'));
      backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.classList.remove('open'); });

      document.getElementById('dtSelectAll').addEventListener('click', () => {
        listEl.querySelectorAll('.mcheck').forEach(el => {
          el.querySelector('input').checked = true;
          el.classList.add('sel');
        });
      });
      document.getElementById('dtClearAll').addEventListener('click', () => {
        listEl.querySelectorAll('.mcheck').forEach(el => {
          el.querySelector('input').checked = false;
          el.classList.remove('sel');
        });
      });

      document.getElementById('dtModalStart').addEventListener('click', () => {
        const dur = parseFloat(document.getElementById('dtDuration').value);
        if (!dur || dur <= 0) { alert('Please enter a valid duration.'); return; }
        const checked = [...listEl.querySelectorAll('input[type=checkbox]:checked')].map(i => +i.value);
        if (!checked.length) { alert('Please select at least one machine.'); return; }

        // Any machine downtime stops the connected conveyor line.
        downtimeActive = true; downtimeTimer = dur; downtimeMin += 0;
        logEvent(`<span style="color:#e8483a">⚠ Full line downtime started — ${dur} min</span>`);
        backdrop.classList.remove('open');
      });
    })();
    document.getElementById('btnReset').addEventListener('click', () => {
      if (window.currentRunId && window.updateCurrentRunStatus) {
        window.updateCurrentRunStatus('Cancelled');
        window.currentRunId = null;
      }
      if (window.currentRunStartPromise) window.pendingRunStatus = 'Cancelled';
      components.forEach(c => { const p = compPool.get(c.id); if (p) scene.remove(p.mesh); });
      clearStoredComponents();
      components.length = 0; compPool.clear();
      simMinutes = 0; sinceLastSpawn = 0; entered = 0; completed = 0; runCompleted = 0; nextId = 1;
      downtimeActive = false; downtimeTimer = 0; downtimeMin = 0;
      running = false;
      bulkRunActive = false;
      autoFeedRunActive = false;
      document.getElementById('btnPlay').textContent = 'Start';
      document.getElementById('runState').textContent = 'READY';
      document.getElementById('log').innerHTML = '';
      logEvent('Simulation reset — configure Shift & PPT, then click Start');
    });
    document.getElementById('speedSlider').addEventListener('input', e => {
      speed = parseFloat(e.target.value);
      document.getElementById('speedVal').textContent = speed.toFixed(2) + '×';
    });
    document.getElementById('intervalSlider').addEventListener('input', e => {
      entryInterval = parseFloat(e.target.value);
      document.getElementById('intervalVal').textContent = entryInterval + ' min';
    });

    /* ---------- init ---------- */
    document.getElementById('loading').style.display = 'none';
    document.getElementById('runState').textContent = 'READY';
    logEvent('3D Digital Twin initialized — configure Shift & PPT, then click Start');

    // Live Postgres Stats Polling
    setInterval(() => {
      fetch('http://localhost:3001/api/runs')
        .then(res => res.json())
        .then(data => {
          if (data.error) return;
          
          const dbTotalEl = document.getElementById('dbTotalCount');
          if (dbTotalEl) dbTotalEl.textContent = data.totalRuns;
          
          const dbTotalProducedEl = document.getElementById('dbTotalProduced');
          if (dbTotalProducedEl) dbTotalProducedEl.textContent = data.totalComponents || 0;
          
          const dbCompTotalsEl = document.getElementById('dbComponentTotals');
          if (dbCompTotalsEl && data.componentsSummary) {
            if (data.componentsSummary.length === 0) {
              dbCompTotalsEl.innerHTML = '<tr><td colspan="2" style="text-align:center;color:#666;">No data</td></tr>';
            } else {
              dbCompTotalsEl.innerHTML = data.componentsSummary.map(row => {
                return `<tr>
                  <td>${row.type || 'Unknown'}</td>
                  <td>${row.total}</td>
                </tr>`;
              }).join('');
            }
          }

          const dbRowsEl = document.getElementById('dbRecentRows');
          if (dbRowsEl && data.recentRuns) {
            if (data.recentRuns.length === 0) {
              dbRowsEl.innerHTML = '<tr><td colspan="10" style="text-align:center;color:#666;">No data yet</td></tr>';
            } else {
              dbRowsEl.innerHTML = data.recentRuns.map(row => {
                const rawStartTime = String(row.start_time);
                const d = new Date(rawStartTime.includes('T') ? rawStartTime : `${rawStartTime.replace(' ', 'T')}Z`);
                const ts = Number.isNaN(d.getTime())
                  ? '-'
                  : d.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata', hour12: false });
                const oee = row.oee ? (row.oee * 100).toFixed(1) + '%' : '-';
                const avail = row.availability ? (row.availability * 100).toFixed(1) + '%' : '-';
                const perf = row.performance ? (row.performance * 100).toFixed(1) + '%' : '-';
                const statusLabels = {
                  running: '<span style="color:#ffc23c">● Running</span>',
                  paused: '<span style="color:#ffc23c">Ⅱ Paused</span>',
                  cancelled: '<span style="color:#ff7070">✕ Cancelled</span>',
                  completed: '<span style="color:#54e0a8">✓ Completed</span>'
                };
                const status = statusLabels[row.status.toLowerCase()] || `<span>${row.status}</span>`;
                const total = row.total_count ?? 0;
                const ok = row.ok_count ?? 0;
                const dt = row.downtime ? parseFloat(row.downtime).toFixed(1) + ' min' : '0 min';
                const prodId = row.production_id || row.id;
                const cType = row.component_type || '-';

                return `<tr>
                    <td>${prodId}</td>
                    <td>${cType}</td>
                    <td>${status}</td>
                    <td>${ts}</td>
                    <td>${oee}</td>
                    <td>${avail}</td>
                    <td>${perf}</td>
                    <td>${total}</td>
                    <td>${ok}</td>
                    <td>${dt}</td>
                  </tr>`;
              }).join('');
            }
          }
        })
        .catch(err => console.error('Error fetching live stats:', err));
    }, 2000);

    // Datewise OEE Dashboard Logic
    const dwDatePicker = document.getElementById('dwDatePicker');
    if (dwDatePicker) {
      // Default to today
      dwDatePicker.value = new Date().toISOString().split('T')[0];

      const fetchDaily = () => {
        if (!dwDatePicker.value) return;
        fetch(`http://localhost:3001/api/production/daily?date=${dwDatePicker.value}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.data && data.data.daily_total !== null) {
              const d = data.data;
              const fmtPct = (val) => val ? (parseFloat(val) * 100).toFixed(1) + '%' : '0.0%';
              document.getElementById('dwOee').textContent = fmtPct(d.avg_oee);
              document.getElementById('dwAvail').textContent = fmtPct(d.avg_availability);
              document.getElementById('dwPerf').textContent = fmtPct(d.avg_performance);
              document.getElementById('dwQual').textContent = fmtPct(d.avg_quality);
              const total = parseInt(d.daily_total || 0);
              document.getElementById('dwUph').textContent = total > 0 ? (total / 8).toFixed(1) : '0.0';
              document.getElementById('dwDowntime').textContent = `${parseFloat(d.daily_downtime || 0).toFixed(1)} min`;
              document.getElementById('dwTotal').textContent = total.toLocaleString();
            } else {
              document.getElementById('dwOee').textContent = '0.0%';
              document.getElementById('dwAvail').textContent = '0.0%';
              document.getElementById('dwPerf').textContent = '0.0%';
              document.getElementById('dwQual').textContent = '0.0%';
              document.getElementById('dwUph').textContent = '0.0';
              document.getElementById('dwDowntime').textContent = '0.0 min';
              document.getElementById('dwTotal').textContent = '0';
            }
          })
          .catch(err => console.error('Error fetching daily stats:', err));
      };

      dwDatePicker.addEventListener('change', fetchDaily);
      setInterval(fetchDaily, 5000); // refresh every 5s
      fetchDaily();
    }

    /* Expose simulation state so the React PaintingBoothOverlay component
       can read live data (components, CUM, gunClock, etc.) without coupling
       it to the vanilla-JS internals. */
    window.__boothSimState = {
      get components() { return components; },
      get gunClock() { return gunClock; },
      get dynamicTypes() { return dynamicTypes; },
      CUM,
      boothStage,
      STAGES,
      GUN_OFFSET_Z,
      GUN_MIN_Y,
      GUN_MAX_Y,
      RAIL_HEIGHT,
      HOOK_LEN,
      PART_W,
      PART_LEN,
      PART_D,
      S,
      BARE_COLOR,
      PAINTED_COLOR,
      SimpleOrbitControls
    };

    /* ---------- main render loop (unchanged) ---------- */
    requestAnimationFrame(animate);
  } // end THREE-available guard
}
