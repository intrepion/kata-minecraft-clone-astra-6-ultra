import * as THREE from 'three';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './style.css';
import { VoxelWorld, BLOCKS } from './world';
import { Player } from './player';
import { GameUI } from './ui';
import { Atmosphere } from './atmosphere';
import { parseSave, SAVE_KEY, type WorldSave } from './storage';

const app = document.querySelector<HTMLDivElement>('#app')!;
const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
canvas.setAttribute('aria-label', 'Blockfield interactive voxel world');
canvas.tabIndex = 0;
app.appendChild(canvas);
const ui = new GameUI(app);
ui.setLoading(true);

type Panel = 'pause' | 'settings' | 'inventory' | 'help';
interface Target { block: THREE.Vector3; adjacent: THREE.Vector3; id: number }
interface Particle { mesh: THREE.Mesh; velocity: THREE.Vector3; life: number }

async function boot() {
  // Give the loading interface one frame before generating the landscape.
  await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.08, 250);
  camera.rotation.order = 'YXZ';
  const atmosphere = new Atmosphere(scene);
  let saved: WorldSave | null = null;
  try { saved = parseSave(localStorage.getItem(SAVE_KEY)); } catch { /* Private browsing may disable storage. */ }
  let world = new VoxelWorld(scene, saved?.seed ?? 73129, saved?.edits);
  const player = new Player(world, saved ? new THREE.Vector3(...saved.position) : world.getSpawn());
  if (saved) {
    player.yaw = saved.yaw;
    player.pitch = THREE.MathUtils.clamp(saved.pitch, -1.5, 1.5);
    player.flying = saved.flying;
  }
  let selected = saved?.selected ?? 0;
  let daytime = saved?.daytime ?? true;
  let muted = false;
  let sensitivity = 1;
  let started = false;
  let playing = false;
  let panel: Panel | null = null;
  let target: Target | null = null;
  let dirty = false;
  let storageFailed = false;
  let audio: AudioContext | null = null;
  let wasLocked = false;
  let drag: { x: number; y: number; total: number; button: number } | null = null;
  let lastAction = 0;
  let transition = 1;
  const cameraFrom = new THREE.Vector3();
  const cameraRotationFrom = new THREE.Quaternion();
  const keys = new Set<string>();
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const raycaster = new THREE.Raycaster();
  raycaster.far = 6.5;
  const screenCenter = new THREE.Vector2(0, 0);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.007, 1.007, 1.007)),
    new THREE.LineBasicMaterial({ color: '#fffbe4', transparent: true, opacity: 0.85, depthTest: true }),
  );
  outline.visible = false;
  scene.add(outline);
  const particles: Particle[] = [];
  const particleGeometry = new THREE.BoxGeometry(0.13, 0.13, 0.13);
  const particleMaterials = new Map<number, THREE.MeshLambertMaterial>();
  ui.setSelected(selected);
  ui.setDaytime(daytime);
  ui.setFlying(player.flying);
  atmosphere.setDay(daytime);

  function sound(kind: 'break' | 'place' | 'select') {
    if (muted) return;
    try {
      audio ??= new AudioContext();
      if (audio.state === 'suspended') void audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = kind === 'break' ? 'triangle' : 'sine';
      const frequency = kind === 'break' ? 165 : kind === 'place' ? 260 : 420;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.45, audio.currentTime + 0.09);
      gain.gain.setValueAtTime(kind === 'select' ? 0.025 : 0.075, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.12);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.13);
    } catch { /* Sound is optional; the sandbox remains playable. */ }
  }

  function saveWorld(showStatus = true) {
    if (!started) return;
    const state: WorldSave = {
      version: 1, seed: world.seed, edits: world.getEdits(),
      position: player.position.toArray() as [number, number, number],
      yaw: player.yaw, pitch: player.pitch, selected, flying: player.flying, daytime,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      if (showStatus && dirty) ui.setSaved();
      dirty = false;
    } catch {
      if (!storageFailed) ui.toast('Your browser could not save this world. Keep this tab open to continue building.');
      storageFailed = true;
    }
  }

  function select(index: number) {
    selected = ((index % 9) + 9) % 9;
    ui.setSelected(selected);
    dirty = true;
    sound('select');
  }

  async function requestLook() {
    if (isTouch || document.pointerLockElement === canvas) return;
    try {
      await canvas.requestPointerLock();
    } catch {
      ui.toast('Click and drag to look around. Arrow keys work, too.');
    }
  }

  function resume() {
    const firstStart = !started;
    started = true;
    playing = true;
    panel = null;
    keys.clear();
    ui.setPlaying(true);
    ui.showPanel(null);
    canvas.focus({ preventScroll: true });
    if (firstStart) {
      cameraFrom.copy(camera.position);
      cameraRotationFrom.copy(camera.quaternion);
      transition = 0;
      ui.toast(saved ? 'Welcome back. Your little world is just as you left it.' : 'Make yourself at home. Press F to fly, E for your blocks.');
    }
    void requestLook();
  }

  function openPanel(next: Panel) {
    panel = next;
    playing = false;
    keys.clear();
    drag = null;
    target = null;
    outline.visible = false;
    ui.setTarget(null);
    ui.showPanel(next);
    if (document.pointerLockElement) document.exitPointerLock();
    saveWorld();
  }

  function closePanel() {
    if (started) resume();
    else { panel = null; ui.showPanel(null); }
  }

  function updateTarget() {
    if (!playing || transition < 1) { outline.visible = false; return; }
    camera.updateMatrixWorld();
    raycaster.setFromCamera(screenCenter, camera);
    const hit = raycaster.intersectObjects(world.getMeshes(), false)[0];
    if (hit?.face) {
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      const block = hit.point.clone().addScaledVector(normal, -0.005).floor();
      const adjacent = hit.point.clone().addScaledVector(normal, 0.005).floor();
      const id = world.getBlock(block.x, block.y, block.z);
      if (id && id !== 10) {
        target = { block, adjacent, id };
        outline.position.copy(block).addScalar(0.5);
        outline.visible = true;
        ui.setTarget(BLOCKS.find(b => b.id === id)?.name ?? 'Block');
        return;
      }
    }
    target = null;
    outline.visible = false;
    ui.setTarget(null);
  }

  function blockParticles(position: THREE.Vector3, id: number) {
    let material = particleMaterials.get(id);
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color: BLOCKS.find(b => b.id === id)?.color ?? '#8a9b60' });
      particleMaterials.set(id, material);
    }
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(particleGeometry, material);
      mesh.position.copy(position).addScalar(0.5).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.7));
      scene.add(mesh);
      particles.push({ mesh, velocity: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3 + 1, (Math.random() - 0.5) * 3), life: 0.6 });
    }
  }

  function editBlock(place: boolean) {
    if (!playing || performance.now() - lastAction < 140) return;
    updateTarget();
    if (!target) { ui.toast('Move a little closer to a block to build.'); return; }
    lastAction = performance.now();
    if (place) {
      const { x, y, z } = target.adjacent;
      if (player.overlapsBlock(x, y, z)) { ui.toast('Leave a little room for yourself.'); return; }
      if (world.isSolid(x, y, z)) return;
      if (!world.setBlock(x, y, z, selected + 1)) { ui.toast('You’ve reached the edge of this little world.'); return; }
      sound('place');
    } else {
      const { x, y, z } = target.block;
      if (y === 0) { ui.toast('That’s the foundation of your world.'); return; }
      blockParticles(target.block, target.id);
      world.setBlock(x, y, z, 0);
      sound('break');
    }
    world.rebuildDirty();
    renderer.shadowMap.needsUpdate = true;
    dirty = true;
    updateTarget();
  }

  ui.onAction = (action, value) => {
    switch (action) {
      case 'play':
        if (value === 'explore') { player.flying = true; ui.setFlying(true); }
        resume();
        break;
      case 'resume': resume(); break;
      case 'pause': openPanel('pause'); break;
      case 'settings': openPanel('settings'); break;
      case 'inventory': panel === 'inventory' ? closePanel() : openPanel('inventory'); break;
      case 'help': openPanel('help'); break;
      case 'close-panel': closePanel(); break;
      case 'select': select(Number(value)); break;
      case 'sound': muted = !muted; ui.setMuted(muted); if (!muted) sound('select'); break;
      case 'daytime': daytime = !daytime; atmosphere.setDay(daytime); ui.setDaytime(daytime); dirty = true; break;
      case 'sensitivity': sensitivity = Number(value); break;
      case 'view-distance': atmosphere.setDistance(Number(value)); break;
      case 'fly': ui.setFlying(player.toggleFlight()); dirty = true; break;
      case 'break': editBlock(false); break;
      case 'place': editBlock(true); break;
      case 'touch-start': keys.add(String(value)); break;
      case 'touch-end': keys.delete(String(value)); break;
      case 'new-world': {
        world.dispose();
        world = new VoxelWorld(scene, Math.floor(Math.random() * 1_000_000));
        renderer.shadowMap.needsUpdate = true;
        player.setWorld(world);
        player.reset(world.getSpawn());
        player.yaw = 0; player.pitch = -0.12; player.flying = false;
        ui.setFlying(false);
        dirty = true;
        started = true;
        saveWorld(false);
        resume();
        ui.toast('A fresh start. Make this world your own.');
        break;
      }
    }
  };

  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (!locked && wasLocked && playing && !panel) openPanel('pause');
    wasLocked = locked;
  });
  document.addEventListener('mousemove', event => {
    if (playing && document.pointerLockElement === canvas) player.look(event.movementX, event.movementY, sensitivity);
  });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  canvas.addEventListener('pointerdown', event => {
    if (!playing) return;
    if (document.pointerLockElement === canvas) {
      if (event.button === 0 || event.button === 2) editBlock(event.button === 2);
    } else {
      drag = { x: event.clientX, y: event.clientY, total: 0, button: event.button };
      canvas.setPointerCapture(event.pointerId);
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || !playing) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.total += Math.abs(dx) + Math.abs(dy);
    player.look(dx, dy, sensitivity);
    drag.x = event.clientX; drag.y = event.clientY;
  });
  canvas.addEventListener('pointerup', () => {
    if (drag && drag.total < 5) editBlock(drag.button === 2);
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  document.addEventListener('keydown', event => {
    if (event.code === 'Escape') {
      event.preventDefault();
      if (panel) closePanel(); else if (playing) openPanel('pause');
      return;
    }
    if ((event.target instanceof HTMLInputElement) || (event.target instanceof HTMLTextAreaElement)) return;
    if (!started) return;
    if (event.code === 'KeyE' && !event.repeat) {
      event.preventDefault();
      if (panel === 'inventory') closePanel(); else if (!panel) openPanel('inventory');
      return;
    }
    if (!playing) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(event.code)) event.preventDefault();
    keys.add(event.code);
    if (event.repeat) return;
    if (/^Digit[1-9]$/.test(event.code)) select(Number(event.code.slice(5)) - 1);
    if (event.code === 'KeyF') {
      ui.setFlying(player.toggleFlight());
      ui.toast(player.flying ? 'A different perspective. Space to rise, Shift to descend.' : 'Feet back on the ground.');
      dirty = true;
    }
    if (event.code === 'KeyR') { player.reset(world.getSpawn()); ui.setFlying(false); ui.toast('Back to your little clearing.'); dirty = true; }
    if (event.code === 'KeyM') { muted = !muted; ui.setMuted(muted); }
    if (event.code === 'KeyQ') editBlock(false);
    if (event.code === 'KeyB') editBlock(true);
    if (event.code === 'Tab' || event.code === 'KeyH') openPanel('help');
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); if (playing) openPanel('pause'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); saveWorld(false); if (playing) openPanel('pause'); } });
  canvas.addEventListener('wheel', event => {
    if (!playing) return;
    event.preventDefault();
    select(selected + Math.sign(event.deltaY));
  }, { passive: false });
  window.addEventListener('beforeunload', () => saveWorld(false));
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  setInterval(() => saveWorld(), 5000);

  const titlePosition = new THREE.Vector3(24, 39, 38);
  const titleTarget = new THREE.Vector3(-24, 9, -10);
  const playerRotation = new THREE.Quaternion();
  const rotationEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  let previousTime = performance.now();
  let frame = 0;
  let elapsed = 0;
  function animate(now: number) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    if (document.hidden) return;
    elapsed += dt;
    atmosphere.update(dt);
    if (!started) {
      camera.position.copy(titlePosition);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        camera.position.x += Math.sin(elapsed * 0.07) * 1.8;
        camera.position.y += Math.sin(elapsed * 0.1) * 0.3;
      }
      camera.lookAt(titleTarget);
    } else {
      if (playing) {
        const lastPosition = player.position.clone();
        if (keys.has('ArrowLeft')) player.look(-dt * 600, 0, sensitivity);
        if (keys.has('ArrowRight')) player.look(dt * 600, 0, sensitivity);
        if (keys.has('ArrowUp')) player.look(0, -dt * 500, sensitivity);
        if (keys.has('ArrowDown')) player.look(0, dt * 500, sensitivity);
        player.update(dt, keys);
        if (!lastPosition.equals(player.position)) dirty = true;
      }
      rotationEuler.set(player.pitch, player.yaw, 0);
      playerRotation.setFromEuler(rotationEuler);
      if (transition < 1) {
        transition = Math.min(1, transition + dt * 1.4);
        const smooth = transition * transition * (3 - 2 * transition);
        camera.position.lerpVectors(cameraFrom, player.eyePosition, smooth);
        camera.quaternion.slerpQuaternions(cameraRotationFrom, playerRotation, smooth);
      } else {
        camera.position.copy(player.eyePosition);
        camera.quaternion.copy(playerRotation);
      }
      if (frame % 3 === 0) updateTarget();
      if (frame % 10 === 0) ui.setPosition(player.position.x, player.position.y, player.position.z);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const particle = particles[i];
      particle.life -= dt;
      particle.velocity.y -= dt * 12;
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      particle.mesh.rotation.x += dt * 3;
      particle.mesh.rotation.z += dt * 4;
      particle.mesh.scale.setScalar(Math.min(1, Math.max(0, particle.life * 4)));
      if (particle.life <= 0) { scene.remove(particle.mesh); particles.splice(i, 1); }
    }
    renderer.render(scene, camera);
    frame++;
  }
  camera.position.copy(titlePosition);
  camera.lookAt(titleTarget);
  renderer.render(scene, camera);
  ui.setLoading(false);
  requestAnimationFrame(animate);

  if (import.meta.env.DEV) {
    Object.assign(window, { __BLOCKFIELD__: {
      get world() { return world; }, player, camera, renderer,
      get target() { return target; },
      get state() { return { playing, started, panel, selected, daytime, muted }; },
      save: () => saveWorld(false),
    } });
  }
}

boot().catch(error => {
  console.error('Blockfield could not start:', error);
  ui.setLoading(false);
  const fallback = document.createElement('div');
  fallback.className = 'startup-error';
  fallback.innerHTML = '<h2>A little help getting started</h2><p>Blockfield needs a browser with WebGL enabled. Try Chrome, Firefox, or Safari with hardware acceleration turned on.</p><button type="button">Try again</button>';
  fallback.querySelector('button')!.addEventListener('click', () => location.reload());
  app.appendChild(fallback);
});
