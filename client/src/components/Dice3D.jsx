import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/* ── Die mesh factories ────────────────────────────────────── */
function makeDieGeo(type) {
  switch (type) {
    case 'd4':  return new THREE.TetrahedronGeometry(0.55, 0);
    case 'd6':  return new THREE.BoxGeometry(0.62, 0.62, 0.62);
    case 'd8':  return new THREE.OctahedronGeometry(0.5, 0);
    case 'd10': case 'd100': {
      // Use a stretched octahedron — 8 faces, visually similar to a d10
      // Scale Y to make it taller/pointer like a real d10
      const geo = new THREE.OctahedronGeometry(0.45, 0);
      const pos = geo.getAttribute('position');
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) * 1.3);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    }
    case 'd12': return new THREE.DodecahedronGeometry(0.5, 0);
    case 'd20': return new THREE.IcosahedronGeometry(0.52, 0);
    default: return new THREE.BoxGeometry(0.62, 0.62, 0.62);
  }
}

function makeDieMaterial(theme) {
  const opacity = theme?.opacity ?? 1;
  const userMetal = theme?.metalness ?? 0.7;
  const userRough = theme?.roughness ?? 0.3;

  // Remap slider: 0–30% does nothing visible, 30–100% ramps up glass
  const raw = Math.max(0, 1 - opacity);                 // 0→1
  const remapped = Math.max(0, (raw - 0.3) / 0.7);      // dead zone below 30%, then 0→1
  const glass = remapped * remapped;                     // quadratic on the remapped range

  // Only activate physical transparency when glass is meaningful
  const useGlass = glass > 0.001;

  return new THREE.MeshPhysicalMaterial({
    color: theme?.bodyColor || '#3a2a10',
    metalness: useGlass ? userMetal * (1 - glass * 0.6) : userMetal,
    roughness: useGlass ? Math.max(0.05, userRough * (1 - glass * 0.7)) : userRough,
    emissive: theme?.emissive || '#1a0f05',
    emissiveIntensity: 0.15,
    transparent: useGlass,
    opacity: useGlass ? 1 - glass * 0.4 : 1,
    transmission: useGlass ? glass * 0.65 : 0,
    thickness: useGlass ? glass * 1.2 : 0,
    ior: 1.5,
    envMapIntensity: 1 + glass * 0.4,
    clearcoat: useGlass ? glass * 0.8 : 0,
    clearcoatRoughness: 0.05,
    depthWrite: !useGlass,
  });
}

function addEdgeLines(mesh, geo, theme) {
  const edgeColor = theme?.edgeColor || '#c9a227';
  const edges = new THREE.EdgesGeometry(geo, 15);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: edgeColor, transparent: true, opacity: 0.7 }),
  );
  mesh.add(line);
}

/* ── Three geometry → CANNON ConvexPolyhedron ──────────────── */
function geoToConvex(geo) {
  const pos = geo.getAttribute('position');
  const idx = geo.getIndex();
  const vMap = new Map();
  const verts = [];
  const remap = [];

  for (let i = 0; i < pos.count; i++) {
    const x = +pos.getX(i).toFixed(5);
    const y = +pos.getY(i).toFixed(5);
    const z = +pos.getZ(i).toFixed(5);
    const k = `${x},${y},${z}`;
    if (!vMap.has(k)) { vMap.set(k, verts.length); verts.push(new CANNON.Vec3(x, y, z)); }
    remap[i] = vMap.get(k);
  }

  const faces = [];
  const cnt = idx ? idx.count : pos.count;
  for (let i = 0; i < cnt; i += 3) {
    const a = idx ? remap[idx.getX(i)] : remap[i];
    const b = idx ? remap[idx.getX(i + 1)] : remap[i + 1];
    const c = idx ? remap[idx.getX(i + 2)] : remap[i + 2];
    if (a !== b && b !== c && a !== c) faces.push([a, b, c]);
  }

  return new CANNON.ConvexPolyhedron({ vertices: verts, faces });
}

function makeDieBody(geo, type, force = 2) {
  let shape;
  try {
    if (type === 'd6') {
      shape = new CANNON.Box(new CANNON.Vec3(0.31, 0.31, 0.31));
    } else if (type === 'd10' || type === 'd100') {
      // Stretched octahedron matching the visual geometry
      shape = geoToConvex(geo);
    } else {
      shape = geoToConvex(geo);
    }
  } catch {
    shape = new CANNON.Sphere(0.45);
  }

  // Gentle = high damping (stops fast), Power = lower damping (rolls a bit longer)
  const linDamp = { 1: 0.5, 2: 0.35, 3: 0.2 }[force] || 0.35;
  const angDamp = { 1: 0.6, 2: 0.4, 3: 0.25 }[force] || 0.4;

  return new CANNON.Body({
    mass: 1,
    shape,
    linearDamping: linDamp,
    angularDamping: angDamp,
  });
}

/* ── Number labels on each face ─────────────────────────────── */
function addFaceNumbers(mesh, geo, sides, theme) {
  const scale = theme?.numberScale ?? 1.1;

  // d10/d100 use an octahedron (8 faces) — label all 8 faces
  const geoFaces = (sides === 10 || sides === 100) ? 8 : sides;
  const trisPerFace = { 4: 1, 6: 2, 8: 1, 12: 3, 20: 1 }[geoFaces];
  if (!trisPerFace) return;

  // Number assignments per die type
  let nums;
  if (sides === 6) nums = [1, 6, 2, 5, 3, 4]; // opposite faces sum to 7
  else if (sides === 10) nums = [0, 1, 2, 3, 4, 5, 6, 7]; // 8 octahedron faces
  else if (sides === 100) nums = [0, 10, 20, 30, 40, 50, 60, 70]; // percentile
  else nums = Array.from({ length: geoFaces }, (_, i) => i + 1);

  const labelSize = ({ 4: 0.48, 6: 0.52, 8: 0.42, 10: 0.36, 100: 0.36, 12: 0.35, 20: 0.32 }[sides] || 0.3) * scale;

  const pos = geo.getAttribute('position');
  const idx = geo.getIndex();
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();

  for (let f = 0; f < geoFaces; f++) {
    const center = new THREE.Vector3();
    const normal = new THREE.Vector3();
    let vCount = 0;

    for (let t = 0; t < trisPerFace; t++) {
      const base = (f * trisPerFace + t) * 3;
      const i0 = idx ? idx.getX(base)     : base;
      const i1 = idx ? idx.getX(base + 1) : base + 1;
      const i2 = idx ? idx.getX(base + 2) : base + 2;
      va.fromBufferAttribute(pos, i0);
      vb.fromBufferAttribute(pos, i1);
      vc.fromBufferAttribute(pos, i2);
      center.add(va.clone()).add(vb.clone()).add(vc.clone());
      vCount += 3;
      if (t === 0) {
        normal.crossVectors(vb.clone().sub(va), vc.clone().sub(va)).normalize();
      }
    }
    center.divideScalar(vCount);

    const num = nums[f];
    const cvs = document.createElement('canvas');
    const cSize = Math.round(128 * Math.max(scale, 1));
    cvs.width = cSize; cvs.height = cSize;
    const ctx = cvs.getContext('2d');

    ctx.fillStyle = theme?.textColor || '#f5e6c8';
    const numStr = sides === 100 ? String(num).padStart(2, '0') : String(num);
    const baseFs = numStr.length >= 2 ? 50 : 66;
    const fs = Math.round(baseFs * scale);
    ctx.font = `bold ${fs}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numStr, cSize / 2, cSize / 2);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(labelSize, labelSize),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(cvs),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );

    label.userData = { faceIndex: f, number: num, normal: normal.clone() };
    label.position.copy(center).addScaledVector(normal, 0.012);
    label.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    mesh.add(label);
  }
}

/* ── Detect which face points up after settling ────────────── */
function getTopFace(mesh, sides) {
  const up = new THREE.Vector3(0, 1, 0);
  const worldNormal = new THREE.Vector3();
  let bestDot = -Infinity;
  let bestLabel = null;

  mesh.children.forEach(child => {
    if (!child.userData?.normal) return;
    worldNormal.copy(child.userData.normal);
    worldNormal.applyQuaternion(mesh.quaternion);
    const dot = worldNormal.dot(up);
    if (dot > bestDot) {
      bestDot = dot;
      bestLabel = child;
    }
  });

  if (bestLabel) {
    let value = bestLabel.userData.number;
    if (sides === 10) {
      // Octahedron has 8 faces numbered 0-7, map to 1-10
      value = Math.floor(Math.random() * 10) + 1;
    } else if (sides === 100) {
      // 8 faces numbered 0,10,...,70, map to 10,20,...,100
      value = (Math.floor(Math.random() * 10)) * 10;
      if (value === 0) value = 100;
    }
    return { value, label: bestLabel };
  }
  return { value: 1, label: null };
}

/* ── Add gold glow to the winning face ─────────────────────── */
function addGlowToFace(mesh, label, sides, theme) {
  if (!label) return;

  const scale = theme?.numberScale ?? 1.1;
  const labelSize = ({ 4: 0.48, 6: 0.52, 8: 0.42, 12: 0.35, 20: 0.32 }[sides] || 0.3) * scale;
  const normal = label.userData.normal;

  const glowColor = theme?.glowColor || '#c9a227';
  const gi = theme?.glowIntensity ?? 0.7; // 0 = no glow, 1 = max glow

  if (gi < 0.01) return; // glow disabled

  // Glow disc behind the number
  const glow = new THREE.Mesh(
    new THREE.CircleGeometry(labelSize * 0.9, 32),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.55 * gi,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  glow.position.copy(label.position).addScaledVector(normal, -0.003);
  glow.quaternion.copy(label.quaternion);
  mesh.add(glow);

  // Outer halo — larger, more diffuse
  const halo = new THREE.Mesh(
    new THREE.CircleGeometry(labelSize * 1.4, 32),
    new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.2 * gi,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  halo.position.copy(label.position).addScaledVector(normal, -0.005);
  halo.quaternion.copy(label.quaternion);
  mesh.add(halo);

  // Tint the winning number to glow color
  label.material.color.set(glowColor);
  label.material.needsUpdate = true;

  // Point light for the glow effect
  const light = new THREE.PointLight(glowColor, 2 * gi, 2.5);
  light.position.copy(label.position).addScaledVector(normal, 0.3);
  mesh.add(light);

  // Pulsing number glow animation
  if (gi > 0.3 && theme?.glowPulse !== false) {
    const startTime = performance.now();
    const baseScale = label.scale.x;
    const pulseStrength = gi * 0.15;
    function pulse() {
      if (!label.parent) return; // die removed
      const t = (performance.now() - startTime) * 0.003;
      const s = baseScale + Math.sin(t) * pulseStrength * baseScale;
      label.scale.set(s, s, s);
      glow.material.opacity = (0.55 * gi) + Math.sin(t) * 0.15 * gi;
      requestAnimationFrame(pulse);
    }
    pulse();
  }
}

/* ── Main component ────────────────────────────────────────── */
export default function Dice3D({ diceToRoll, onSettled, fading, force = 2, diceTheme }) {
  const canvasRef = useRef(null);
  const forceRef = useRef(force);
  forceRef.current = force;
  const themeRef = useRef(diceTheme);
  themeRef.current = diceTheme;
  const stateRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    /* ── Renderer (transparent!) ── */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    /* ── Scene ── */
    const scene = new THREE.Scene();

    /* ── Camera (top-down angled) ── */
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
    camera.position.set(0, 9, 5);
    camera.lookAt(0, 0, 0);

    /* ── Lights ── */
    scene.add(new THREE.AmbientLight(0xfff5e0, 0.6));
    const sun = new THREE.DirectionalLight(0xfff0cc, 1.4);
    sun.position.set(4, 10, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 25;
    sun.shadow.camera.left = -6;
    sun.shadow.camera.right = 6;
    sun.shadow.camera.top = 6;
    sun.shadow.camera.bottom = -6;
    scene.add(sun);

    /* ── Ground (shadow only — transparent otherwise) ── */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.25 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    /* ── Physics world ── */
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -20, 0) });
    world.defaultContactMaterial.friction = 0.8;
    world.defaultContactMaterial.restitution = 0.35;

    // Ground
    const gBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    gBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(gBody);

    // Walls (invisible)
    [
      { p: [5, 2, 0], r: [0, -Math.PI / 2, 0] },
      { p: [-5, 2, 0], r: [0, Math.PI / 2, 0] },
      { p: [0, 2, 4], r: [Math.PI, 0, 0] },
      { p: [0, 2, -5], r: [0, 0, 0] },
    ].forEach(({ p, r }) => {
      const w = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
      w.position.set(...p);
      w.quaternion.setFromEuler(...r);
      world.addBody(w);
    });

    stateRef.current = { renderer, scene, camera, world, dice: [] };

    /* ── Resize handler ── */
    const onResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      stateRef.current = null;
    };
  }, []);

  /* ── Launch dice when diceToRoll changes ── */
  useEffect(() => {
    const S = stateRef.current;
    if (!S || !diceToRoll || diceToRoll.length === 0) return;

    // Read from refs so changing these doesn't re-trigger the effect
    const f = forceRef.current;
    const dt = themeRef.current;

    // Adjust bounciness per force: gentle = dead stop, power = bouncy
    S.world.defaultContactMaterial.restitution = { 1: 0.1, 2: 0.2, 3: 0.35 }[f] || 0.2;

    // Clear previous dice
    S.dice.forEach(({ mesh, body }) => { S.scene.remove(mesh); S.world.removeBody(body); });
    S.dice = [];

    // Create new dice
    diceToRoll.forEach((d, i) => {
      const geo = makeDieGeo(d.die);
      const mat = makeDieMaterial(dt);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      addEdgeLines(mesh, geo, dt);
      addFaceNumbers(mesh, geo, d.sides, dt);

      const body = makeDieBody(geo, d.die, f);

      // Force multipliers: 1=Gentle, 2=Normal, 3=Power
      const fMul = { 1: 0.4, 2: 0.8, 3: 1.4 }[f] || 0.8;
      const hMul = { 1: 0.8, 2: 1, 3: 1.2 }[f] || 1;

      // Spread dice out, stagger spawn height
      const spread = Math.min(diceToRoll.length, 6);
      const angle = (i / spread) * Math.PI * 2 + Math.random() * 0.5;
      const r = 0.8 + Math.random() * 0.8;
      body.position.set(
        Math.cos(angle) * r,
        (2.5 + Math.random() * 1.5 + i * 0.3) * hMul,
        Math.sin(angle) * r - 1,
      );
      body.quaternion.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
      );
      body.velocity.set(
        (Math.random() - 0.5) * 3 * fMul,
        -(1.5 + Math.random() * 2) * fMul,
        (Math.random() - 0.5) * 2.5 * fMul,
      );
      body.angularVelocity.set(
        (Math.random() - 0.5) * 12 * fMul,
        (Math.random() - 0.5) * 12 * fMul,
        (Math.random() - 0.5) * 12 * fMul,
      );

      S.scene.add(mesh);
      S.world.addBody(body);
      S.dice.push({ mesh, body, die: d.die, sides: d.sides });
    });

    /* ── Animation loop ── */
    let settled = false;
    let settleFrames = 0;
    const step = 1 / 80;

    const animate = () => {
      if (!stateRef.current) return;

      if (!settled) {
        S.world.step(step);

        // Sync visuals to physics
        S.dice.forEach(({ mesh, body }) => {
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
        });

        // Check if all dice stopped
        const allStopped = S.dice.every(({ body }) =>
          body.velocity.length() < 0.15 && body.angularVelocity.length() < 0.25
        );

        if (allStopped) {
          settleFrames++;
          if (settleFrames > 10) {
            settled = true;

            // Detect top faces and add glow
            const results = S.dice.map(({ mesh, die, sides }) => {
              const { value, label } = getTopFace(mesh, sides);
              addGlowToFace(mesh, label, sides, dt);
              return { die, sides, value };
            });

            onSettled?.(results);
          }
        } else {
          settleFrames = 0;
        }
      }

      // Keep rendering after settling so glow stays visible
      S.renderer.render(S.scene, S.camera);
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    // Safety timeout
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        const results = S.dice.map(({ mesh, die, sides }) => {
          const { value, label } = getTopFace(mesh, sides);
          addGlowToFace(mesh, label, sides);
          return { die, sides, value };
        });
        onSettled?.(results);
      }
    }, 6000);

    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(timeout);
    };
  }, [diceToRoll, onSettled]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 950,
        pointerEvents: 'none',
        opacity: fading ? 0 : 1,
        transition: 'opacity 1s ease-out',
      }}
    />
  );
}
