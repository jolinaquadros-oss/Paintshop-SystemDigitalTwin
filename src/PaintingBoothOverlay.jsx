import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function PaintingBoothOverlay({ isOpen, onClose }) {
  const canvasWrapRef = useRef(null);
  const [stats, setStats] = useState({ dur: "-- min", wip: 0, spray: "IDLE" });

  useEffect(() => {
    if (!isOpen || !window.__boothSimState) return;

    const wrap = canvasWrapRef.current;
    if (!wrap) return;

    const state = window.__boothSimState;

    // Grab all constants from the state we exposed
    const {
      CUM, boothStage, GUN_OFFSET_Z, GUN_MIN_Y, GUN_MAX_Y,
      RAIL_HEIGHT, HOOK_LEN, PART_W, PART_LEN, PART_D, S,
      BARE_COLOR, PAINTED_COLOR, SimpleOrbitControls
    } = state;

    let boothAnimId = null;

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

    // Lights
    scene.add(new THREE.AmbientLight(0x8fa4b8, 0.55));
    const keyL = new THREE.DirectionalLight(0xdfe9f5, 0.9);
    keyL.position.set(120, 300, 200); scene.add(keyL);
    const rimL = new THREE.DirectionalLight(0xff8a3d, 0.28);
    rimL.position.set(-120, 80, -150); scene.add(rimL);
    const boothGlow = new THREE.PointLight(0xff7a30, 1.6, 260, 2);
    boothGlow.position.set(0, 80, 0); scene.add(boothGlow);

    // Booth Geometry
    // We expand the wall span so that the walls sit completely behind the guns (including the carriage body).
    // Guns are at GUN_OFFSET_Z. The carriage body extends 10 units outward from the rail.
    // So wall inner face should be at GUN_OFFSET_Z + 10.
    // A wall of thickness 6 centered at GUN_OFFSET_Z + 13 will have its inner face at GUN_OFFSET_Z + 10.
    // Therefore the span (center to center) should be (GUN_OFFSET_Z + 13) * 2 = GUN_OFFSET_Z * 2 + 26.
    const bWallSpan = GUN_OFFSET_Z * 2 + 26;
    const bWallH    = 105;
    const bBoothW   = boothStage.w * S * 0.95;
    const panelMat  = new THREE.MeshStandardMaterial({ color: 0x1c2530, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
    const frameMat  = new THREE.MeshStandardMaterial({ color: 0xffb02e, emissive: 0xffb02e, emissiveIntensity: 0.4, roughness: 0.5, metalness: 0.4 });

    // Removed side wall and top roof to allow components to pass through on X axis.
    // Added walls on Z axis behind each gun instead.
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

    // Guns
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

    // Rail
    const railSegMat = new THREE.MeshStandardMaterial({ color: 0x3a4757, roughness: 0.4, metalness: 0.75 });
    const railSeg = new THREE.Mesh(new THREE.BoxGeometry(bBoothW * 1.3, 6, 6), railSegMat);
    railSeg.position.set(0, RAIL_HEIGHT, 0); scene.add(railSeg);
    [-1, 1].forEach(sx => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, RAIL_HEIGHT, 10),
        new THREE.MeshStandardMaterial({ color: 0x2c3745, roughness: 0.6, metalness: 0.4 }));
      pole.position.set(sx * bBoothW * 0.45, RAIL_HEIGHT / 2, 0); scene.add(pole);
    });

    // Part
    const hookG   = new THREE.CylinderGeometry(1.1, 1.1, HOOK_LEN, 8);
    const hookMat = new THREE.MeshStandardMaterial({ color: 0x8a97a3, roughness: 0.4, metalness: 0.7 });
    const hookM   = new THREE.Mesh(hookG, hookMat);
    hookM.position.y = RAIL_HEIGHT - HOOK_LEN / 2;

    const partDisplayMat = new THREE.MeshStandardMaterial({ color: BARE_COLOR.clone(), roughness: 0.55, metalness: 0.55 });
    const partDisplayMesh = new THREE.Mesh(new THREE.BoxGeometry(PART_W, PART_LEN, PART_D), partDisplayMat);
    partDisplayMesh.position.y = RAIL_HEIGHT - HOOK_LEN - PART_LEN / 2;

    const boothPartMesh = new THREE.Group();
    boothPartMesh.add(hookM);
    boothPartMesh.add(partDisplayMesh);
    boothPartMesh._mat = partDisplayMat;
    boothPartMesh.visible = false;
    scene.add(boothPartMesh);

    // Panel prop
    const panelGrp = new THREE.Group();
    // Move the panel to the right side (X=25) and mount it on the inside of the back wall.
    // Back wall inner face is at -(GUN_OFFSET_Z + 10). Cabinet depth is 8, so its center is -(GUN_OFFSET_Z + 6).
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

    const onResize = () => {
      if (!wrap || !renderer) return;
      camera.aspect = wrap.clientWidth / wrap.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    };
    window.addEventListener('resize', onResize);

    // Render loop
    function animateBooth() {
      boothAnimId = requestAnimationFrame(animateBooth);

      // Access live state getters
      const liveComponents = state.components;
      const liveGunClock = state.gunClock;

      const freq = 0.9;
      const phase = liveGunClock * freq * Math.PI * 2;
      const s1 = Math.sin(phase), s2 = Math.sin(phase + Math.PI);
      
      const boothOccupied = liveComponents.some(c => Math.abs(c.pos - CUM[boothStage.id]) < 30);
      
      const y1 = GUN_MIN_Y + (s1 * 0.5 + 0.5) * (GUN_MAX_Y - GUN_MIN_Y);
      const y2 = GUN_MIN_Y + (s2 * 0.5 + 0.5) * (GUN_MAX_Y - GUN_MIN_Y);
      boothGun1.carriage.position.y = y1;
      boothGun2.carriage.position.y = y2;
      boothGun1.spray.visible = boothOccupied && s1 > 0;
      boothGun2.spray.visible = boothOccupied && s2 > 0;

      if (boothPartMesh) {
        const compInBooth = liveComponents.find(c => Math.abs(c.pos - CUM[boothStage.id]) < 30);
        if (compInBooth) {
          boothPartMesh.visible = true;
          const bPos = CUM[boothStage.id];
          let frac = compInBooth.pos < bPos - 20 ? 0
                   : compInBooth.pos > bPos + 20 ? 1
                   : (compInBooth.pos - (bPos - 20)) / 40;
          frac = Math.max(0, Math.min(1, frac));
          boothPartMesh._mat.color.copy(BARE_COLOR).lerp(PAINTED_COLOR, frac);
          boothPartMesh._mat.metalness = 0.55 + (0.12 - 0.55) * frac;
          boothPartMesh._mat.roughness  = 0.55 + (0.42 - 0.55) * frac;
        } else {
          boothPartMesh.visible = false;
        }
      }

      // Update React state (throttled/batched by React, but we can do it every frame here)
      const wipCount = liveComponents.filter(c => Math.abs(c.pos - CUM[boothStage.id]) < 30).length;
      setStats({
        dur: boothStage.dur + ' min',
        wip: wipCount,
        spray: boothOccupied ? 'ACTIVE' : 'IDLE'
      });

      controls.update();
      renderer.render(scene, camera);
    }

    animateBooth();

    // Cleanup
    return () => {
      cancelAnimationFrame(boothAnimId);
      window.removeEventListener('resize', onResize);
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
