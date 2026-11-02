import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Original procedural mesh. No downloaded models, textures or patient scans.
export default function BabyScene({ week = 20, compact = false }) {
  const host = useRef(null), control = useRef(null), paused = useRef(false);
  const [failure, setFailure] = useState(false), [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { paused.current = !playing; }, [playing]);
  useEffect(() => { const media = window.matchMedia('(prefers-reduced-motion: reduce)'); const change = () => { if (media.matches) setPlaying(false); }; media.addEventListener('change', change); return () => media.removeEventListener('change', change); }, []);
  useEffect(() => {
    const element = host.current;
    let renderer, frame, controls, disposed = false;
    const scene = new THREE.Scene(), baby = new THREE.Group();
    try {
      renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.setAttribute('aria-label', 'Stylised 3D fetal illustration. Drag to rotate; pinch to zoom.');
      renderer.domElement.setAttribute('role', 'img');
      element.appendChild(renderer.domElement);
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
      camera.position.set(0, 0.2, 6.3);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enablePan = false; controls.minDistance = 3.8; controls.maxDistance = 9;
      controls.enableZoom = !compact; controls.enableRotate = !compact;
      control.current = controls;
      scene.add(new THREE.HemisphereLight(0xfff3dd, 0x8e554b, 2.6));
      const key = new THREE.DirectionalLight(0xffe1bd, 3); key.position.set(-3, 4, 4); scene.add(key);
      const rim = new THREE.PointLight(0xff9474, 15); rim.position.set(2, -1, -2); scene.add(rim);
      const skin = new THREE.MeshStandardMaterial({ color: 0xdca28b, roughness: 0.66 });
      const detail = new THREE.MeshStandardMaterial({ color: 0x95655c, roughness: 0.9 });
      const cordMat = new THREE.MeshStandardMaterial({ color: 0xc68278, roughness: 0.65 });
      function oval(parent, x, y, z, sx, sy, sz, material = skin) {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
        mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
      }
      function limb(points, radius, material = skin) {
        const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
        const mesh = new THREE.Mesh(new THREE.TubeGeometry(path, 20, radius, 8, false), material);
        baby.add(mesh); return mesh;
      }
      // Early-stage head is proportionally larger; later-stage limbs/body fill out.
      const stage = THREE.MathUtils.clamp((week - 12) / 28, 0, 1);
      const fullness = 0.85 + stage * 0.22;
      oval(baby, 0, -0.2, 0, 0.49 * fullness, 0.72, 0.39 * fullness).rotation.z = -0.30;
      const head = new THREE.Group(); head.position.set(0.20, 0.69, 0.04); head.rotation.z = -0.28;
      oval(head, 0, 0.1, 0, 0.56 - stage * 0.05, 0.63 - stage * 0.03, 0.48);
      oval(head, -0.13, -0.17, 0.33, 0.29, 0.30, 0.19);
      oval(head, -0.12, -0.11, 0.51, 0.085, 0.09, 0.07);
      oval(head, -0.29, 0.015, 0.421, 0.09, 0.012, 0.023, detail).rotation.z = -0.12;
      oval(head, 0.07, 0.015, 0.455, 0.075, 0.012, 0.018, detail).rotation.z = 0.1;
      oval(head, -0.12, -0.27, 0.50, 0.085, 0.015, 0.013, detail);
      oval(head, 0.48, -0.05, 0.07, 0.09, 0.13, 0.06);
      baby.add(head);
      limb([[-0.32, 0.15, 0.08], [-0.67, -0.09, 0.29], [-0.52, 0.37, 0.39]], 0.105 * fullness);
      limb([[0.32, 0.11, 0], [0.61, -0.27, 0.26], [0.24, -0.04, 0.53]], 0.10 * fullness);
      oval(baby, -0.51, 0.43, 0.39, 0.12, 0.16, 0.06).rotation.z = 0.4;
      oval(baby, 0.20, -0.01, 0.53, 0.12, 0.14, 0.06).rotation.z = -0.5;
      for (let i = 0; i < 4; i++) oval(baby, -0.58 + i * 0.047, 0.56, 0.4, 0.022, 0.07, 0.025);
      limb([[-0.29, -0.65, 0], [-0.61, -0.73, 0.43], [-0.68, -0.20, 0.59]], 0.15 * fullness);
      limb([[0.13, -0.72, 0], [0.39, -0.83, 0.42], [0.06, -0.43, 0.67]], 0.15 * fullness);
      oval(baby, -0.66, -0.13, 0.63, 0.13, 0.23, 0.1).rotation.z = -0.4;
      oval(baby, 0.00, -0.37, 0.72, 0.13, 0.22, 0.1).rotation.z = -0.7;
      limb([[-0.1, -0.20, 0.36], [0.85, -0.1, 0.35], [0.9, -1.35, -0.4], [-0.6, -1.50, -0.7]], 0.045, cordMat);
      baby.rotation.set(0.10, -0.3, 0.22); baby.position.y = 0.1; scene.add(baby);
      let needsRender = true, slowFrames = 0;
      controls.addEventListener('change', () => { needsRender = true; });
      const resize = () => { const width = element.clientWidth, height = element.clientHeight; renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); needsRender = true; };
      const observer = new ResizeObserver(resize); observer.observe(element); resize();
      let last = 0;
      function render(time) {
        if (disposed) return;
        frame = requestAnimationFrame(render);
        if (time - last < 40) return; last = time;
        if (document.hidden || (paused.current && !needsRender)) return;
        if (!paused.current && !document.hidden) { baby.rotation.z = 0.22 + Math.sin(time * 0.00045) * 0.035; baby.position.y = 0.1 + Math.sin(time * 0.0007) * 0.035; }
        const start = performance.now();
        controls.update(); renderer.render(scene, camera); needsRender = false;
        slowFrames = performance.now() - start > 120 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
        if (slowFrames >= 12) { cancelAnimationFrame(frame); setFailure(true); }
      }
      frame = requestAnimationFrame(render);
      const lost = e => { e.preventDefault(); setFailure(true); };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); scene.traverse(o => { o.geometry?.dispose(); if (o.material) o.material.dispose(); }); renderer.dispose(); renderer.domElement.remove(); };
    } catch { renderer?.dispose(); renderer?.domElement.remove(); setFailure(true); }
  }, [week, compact]);
  return <div className={`cl-scene ${compact ? 'cl-compact' : ''}`}><div ref={host} className="cl-canvas" />{failure && <div className="cl-fallback"><span aria-hidden="true">♡</span><p>Week {week} illustration</p><small>3D is unavailable on this device. Read the stage information below.</small></div>}{!compact && !failure && <div className="cl-scene-controls"><button onClick={() => { control.current?.reset(); }}>Reset view</button><button onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'} illustration</button></div>}</div>;
}
