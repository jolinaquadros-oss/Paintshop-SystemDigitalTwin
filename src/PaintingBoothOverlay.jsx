import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function PaintingBoothOverlay({ isOpen, onClose }) {
  const canvasWrapRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !window.__boothSimState) return;

    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    const state = window.__boothSimState;

    const {
      CUM, boothStage, GUN_OFFSET_Z, GUN_MIN_Y, GUN_MAX_Y,
      RAIL_HEIGHT, HOOK_LEN, PART_W, PART_LEN, PART_D, S,
      BARE_COLOR, PAINTED_COLOR, SimpleOrbitControls
    } = state;

    let boothAnimId = null;

    /* ── scene ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121b26);
    scene.fog = new THREE.Fog(0x07090e, 320, 700);

    const camera = new THREE.PerspectiveCamera(48, wrap.clientWidth / wrap.clientHeight, 1, 2000);
    camera.position.set(0, 110, 230);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    wrap.appendChild(renderer.domElement);

    const controls = new SimpleOrbitControls(camera, renderer.domElement, new THREE.Vector3(0, 60, 0));
    controls.minDistance = 80;
    controls.maxDistance = 400;
    controls.update();

    /* ── lights ── */
    scene.add(new THREE.AmbientLight(0x8fa4b8, 0.55));
    const keyL = new THREE.DirectionalLight(0xdfe9f5, 0.9);
    keyL.position.set(120, 300, 200); scene.add(keyL);
    const rimL = new THREE.DirectionalLight(0xff8a3d, 0.28);
    rimL.position.set(-120, 80, -150); scene.add(rimL);
    const boothGlow = new THREE.PointLight(0xff7a30, 1.6, 260, 2);
    boothGlow.position.set(0, 80, 0); scene.add(boothGlow);

    /* ── booth walls / enclosure ── */
    const bWallSpan = GUN_OFFSET_Z * 2 + 26;
    const bWallH    = 105;
    const bBoothW   = boothStage.w * S * 0.95;
    const panelMat  = new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
    const frameMat  = new THREE.MeshStandardMaterial({ color: 0xffb02e, emissive: 0xffb02e, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.4 });

    const wallFront = new THREE.Mesh(new THREE.BoxGeometry(bBoothW, bWallH, 6), panelMat);
    wallFront.position.set(0, bWallH / 2, bWallSpan / 2); scene.add(wallFront);

    const wallBack = new THREE.Mesh(new THREE.BoxGeometry(bBoothW, bWallH, 6), panelMat);
    wallBack.position.set(0, bWallH / 2, -bWallSpan / 2); scene.add(wallBack);

    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(6, bWallH, 6), frameMat);
      post.position.set(sx * bBoothW / 2 * 0.95, bWallH / 2, sz * bWallSpan / 2);
      scene.add(post);
    });

    const stripMat = new THREE.MeshBasicMaterial({ color: 0xf2722f, transparent: true, opacity: 0.18 });
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(bBoothW * 0.7, bWallSpan), stripMat);
    strip.rotation.x = -Math.PI / 2; strip.position.y = 0.1;
    scene.add(strip);

    /* ── spray guns ── */
    function buildBoothGun(sideSign) {
      const INWARD = -sideSign;
      const rig = new THREE.Group();
      rig.position.set(0, 0, sideSign * GUN_OFFSET_Z);
      const railMG = new THREE.MeshStandardMaterial({ color: 0x30394a, roughness: 0.5, metalness: 0.6 });
      const rail   = new THREE.Mesh(new THREE.BoxGeometry(6, GUN_MAX_Y - GUN_MIN_Y + 30, 6), railMG);
      rail.position.y = (GUN_MIN_Y + GUN_MAX_Y) / 2; rig.add(rail);
      const carriage = new THREE.Group();
      const bMat = new THREE.MeshStandardMaterial({ color: 0xffc23c, emissive: 0xffc23c, emissiveIntensity: 0.25, roughness: 0.35, metalness: 0.5 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(9, 9, 20), bMat); carriage.add(body);
      const nozzle = new THREE.Mesh(new THREE.ConeGeometry(3.4, 10, 10), bMat);
      nozzle.rotation.x = Math.PI / 2 * INWARD; nozzle.position.z = INWARD * 13; carriage.add(nozzle);
      const sprayLen = GUN_OFFSET_Z - 14;
      const sprayGeo = new THREE.ConeGeometry(16, sprayLen, 18, 1, true);
      sprayGeo.translate(0, -sprayLen / 2, 0);
      const sprayM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
      const spray = new THREE.Mesh(sprayGeo, sprayM);
      spray.rotation.x = -Math.PI / 2 * INWARD; spray.position.z = INWARD * 13;
      spray.visible = false; carriage.add(spray);
      rig.add(carriage); scene.add(rig);
      return { carriage, spray };
    }
    const boothGun1 = buildBoothGun(-1);
    const boothGun2 = buildBoothGun(1);

    /* ── overhead rail ── */
    const railSegMat = new THREE.MeshStandardMaterial({ color: 0x3a4757, roughness: 0.4, metalness: 0.75 });
    const railSeg = new THREE.Mesh(new THREE.BoxGeometry(bBoothW * 1.3, 6, 6), railSegMat);
    railSeg.position.set(0, RAIL_HEIGHT, 0); scene.add(railSeg);
    [-1, 1].forEach(sx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, RAIL_HEIGHT, 10),
        new THREE.MeshStandardMaterial({ color: 0x2c3745, roughness: 0.6, metalness: 0.4 }));
      pole.position.set(sx * bBoothW * 0.45, RAIL_HEIGHT / 2, 0); scene.add(pole);
    });

    /* ── control panel prop ── */
    const panelGrp = new THREE.Group();
    panelGrp.position.set(25, 0, -GUN_OFFSET_Z - 6);
    const cabinet = new THREE.Mesh(new THREE.BoxGeometry(16, 46, 8),
      new THREE.MeshStandardMaterial({ color: 0x2c3745, roughness: 0.6, metalness: 0.35 }));
    cabinet.position.y = 23; panelGrp.add(cabinet);
    const sCnv = document.createElement('canvas'); sCnv.width = 64; sCnv.height = 48;
    const sCtx = sCnv.getContext('2d');
    sCtx.fillStyle = '#241a06'; sCtx.fillRect(0, 0, 64, 48);
    sCtx.fillStyle = '#ffc23c'; sCtx.font = '8px monospace';
    sCtx.fillText('PAINT', 6, 20); sCtx.fillText('BOOTH', 6, 32);
    const sMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sCnv) });
    const sMesh = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), sMat);
    sMesh.position.set(0, 34, 4.1); panelGrp.add(sMesh);
    [0xe8483a, 0x54e0a8, 0xffc23c].forEach((col, i) => {
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.5, 12),
        new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 }));
      btn.rotation.x = Math.PI / 2; btn.position.set(-5 + i * 5, 14, 4.2); panelGrp.add(btn);
    });
    scene.add(panelGrp);

    /* ── resize handler ── */
    const onResize = () => {
      if (!wrap || !renderer) return;
      camera.aspect = wrap.clientWidth / wrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    };
    window.addEventListener('resize', onResize);

    /* ── geometry helpers matching makeCompMesh in the main sim ── */
    const hookGeo  = new THREE.CylinderGeometry(1.1, 1.1, HOOK_LEN, 8);
    const hookMat  = new THREE.MeshStandardMaterial({ color: 0x8a97a3, roughness: 0.4, metalness: 0.7 });
    const holeGeo  = new THREE.CylinderGeometry(1.4, 1.4, PART_D + 0.6, 12);
    const holeMat  = new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.8, metalness: 0.1 });

    function buildPartMesh(type) {
      const dynamicTypes = state.dynamicTypes || {};
      const group   = new THREE.Group();
      const hookM   = new THREE.Mesh(hookGeo, hookMat);
      hookM.position.y = -HOOK_LEN / 2;
      group.add(hookM);

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
        const h = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 4, 12), holeMat);
        h.rotation.x = Math.PI / 2;
        h.position.set(0, -HOOK_LEN - 3, 0);
        partGrp.add(h);
      }

      group.add(partGrp);
      group.position.y = RAIL_HEIGHT;
      scene.add(group);
      return { group, partMat };
    }

    /* ── live component pool for the overlay ── */
    // Map<compId, { group, partMat }>
    const overlayPool = new Map();

    /* ── booth conveyor geometry for position mapping ── */
    // The booth spans horizontally. CUM[boothStage.id] is the centre of the booth
    // in path-distance space. We spread visible components left→right inside the
    // booth width so you can see them "marching through".
    const BOOTH_CUM   = CUM[boothStage.id];
    const BOOTH_HALF  = (boothStage.w * S * 0.95) / 2 * 0.85; // usable half-width in scene units
    // Tolerance: how far (in path units) from the booth centre we still show a component
    const BOOTH_PATH_RADIUS = 55;

    /* ── render loop ── */
    function animateBooth() {
      boothAnimId = requestAnimationFrame(animateBooth);

      const liveComponents = state.components;
      const liveGunClock   = state.gunClock;

      /* gun animation */
      const freq  = 0.9;
      const phase = liveGunClock * freq * Math.PI * 2;
      const s1    = Math.sin(phase), s2 = Math.sin(phase + Math.PI);
      const boothOccupied = liveComponents.some(c => Math.abs(c.pos - BOOTH_CUM) < BOOTH_PATH_RADIUS);

      boothGun1.carriage.position.y = GUN_MIN_Y + (s1 * 0.5 + 0.5) * (GUN_MAX_Y - GUN_MIN_Y);
      boothGun2.carriage.position.y = GUN_MIN_Y + (s2 * 0.5 + 0.5) * (GUN_MAX_Y - GUN_MIN_Y);
      boothGun1.spray.visible = boothOccupied && s1 > 0;
      boothGun2.spray.visible = boothOccupied && s2 > 0;

      /* which components are near the booth? */
      const nearBooth = liveComponents.filter(c => Math.abs(c.pos - BOOTH_CUM) < BOOTH_PATH_RADIUS);
      const nearIds   = new Set(nearBooth.map(c => c.id));

      /* remove meshes for departed components */
      overlayPool.forEach((entry, id) => {
        if (!nearIds.has(id)) {
          scene.remove(entry.group);
          overlayPool.delete(id);
        }
      });

      /* add / update meshes for current components */
      nearBooth.forEach(c => {
        let entry = overlayPool.get(c.id);
        if (!entry) {
          entry = buildPartMesh(c.type);
          overlayPool.set(c.id, entry);
        }

        /* Map component's path position to an X position inside the booth.
           When pos == BOOTH_CUM - BOOTH_PATH_RADIUS → X = -BOOTH_HALF (entering)
           When pos == BOOTH_CUM + BOOTH_PATH_RADIUS → X = +BOOTH_HALF (exiting) */
        const t = (c.pos - (BOOTH_CUM - BOOTH_PATH_RADIUS)) / (BOOTH_PATH_RADIUS * 2);
        const xPos = -BOOTH_HALF + t * BOOTH_HALF * 2;
        entry.group.position.set(xPos, RAIL_HEIGHT, 0);

        /* paint colour transition (same formula as main scene) */
        let frac;
        if      (c.pos < BOOTH_CUM - 20) frac = 0;
        else if (c.pos > BOOTH_CUM + 20) frac = 1;
        else                             frac = (c.pos - (BOOTH_CUM - 20)) / 40;
        frac = Math.max(0, Math.min(1, frac));

        entry.partMat.color.copy(BARE_COLOR).lerp(PAINTED_COLOR, frac);
        entry.partMat.metalness = 0.55 + (0.12 - 0.55) * frac;
        entry.partMat.roughness = 0.55 + (0.42 - 0.55) * frac;
      });

      controls.update();
      renderer.render(scene, camera);
    }

    animateBooth();

    /* ── cleanup ── */
    return () => {
      cancelAnimationFrame(boothAnimId);
      window.removeEventListener('resize', onResize);
      overlayPool.forEach(entry => scene.remove(entry.group));
      overlayPool.clear();
      if (renderer) {
        renderer.dispose();
        if (wrap.contains(renderer.domElement)) {
          wrap.removeChild(renderer.domElement);
        }
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <section className="booth-inline open">
      <div ref={canvasWrapRef} className="booth-canvas-wrap"></div>
    </section>
  );
}
