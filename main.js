import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  colors: {
    background: 0xF5F3E8,
    gridLine: 0xD4D0C4,
    nebulaCore: '#4A90D9',
    nebulaOuter: '#2B5797',
    sphereBase: '#3B6B96',
    sphereHighlight: '#5A8FBC',
    gravityWell: '#6B7280',
    orbitRing: '#9CA3AF',
    iconStroke: '#4B5563',
  },
  phases: {
    revA: { month: 6, name: 'Rev A' },
    revB: { month: 24, name: 'Rev B' },
    revC: { month: 48, name: 'Rev C' },
  }
};

// ============================================
// ICON DEFINITIONS (SVG paths - Material Design Icons)
// ============================================
const ICONS = [
  { id: 'linkedin', name: 'LinkedIn', orbit: 1, angle: 0 },
  { id: 'twitter', name: 'Twitter/X', orbit: 1, angle: 72 },
  { id: 'user', name: 'Audience', orbit: 1, angle: 144 },
  { id: 'phone', name: 'Contact', orbit: 1, angle: 216 },
  { id: 'star', name: 'Reviews', orbit: 1, angle: 288 },
  { id: 'email', name: 'Email', orbit: 2, angle: 0 },
  { id: 'chat', name: 'Chat', orbit: 2, angle: 60 },
  { id: 'gear', name: 'Settings', orbit: 2, angle: 120 },
  { id: 'megaphone', name: 'Announcements', orbit: 2, angle: 180 },
  { id: 'target', name: 'Goals', orbit: 2, angle: 240 },
  { id: 'podcast', name: 'Audio', orbit: 2, angle: 300 },
  { id: 'handshake', name: 'Partnership', orbit: 3, angle: 0 },
  { id: 'play', name: 'Media', orbit: 3, angle: 45 },
  { id: 'document', name: 'Content', orbit: 3, angle: 90 },
  { id: 'location', name: 'Location', orbit: 3, angle: 135 },
  { id: 'link', name: 'Links', orbit: 3, angle: 180 },
  { id: 'lightbulb', name: 'Ideas', orbit: 3, angle: 225 },
  { id: 'camera', name: 'Visual', orbit: 3, angle: 270 },
  { id: 'calendar', name: 'Events', orbit: 3, angle: 315 },
];

// ============================================
// SCENE SETUP
// ============================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 6, 14);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Controls for sphere rotation
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 25;
controls.maxPolarAngle = Math.PI / 1.6;
controls.minPolarAngle = Math.PI / 6;

// ============================================
// RAYCASTING FOR INTERACTIONS
// ============================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredIcon = null;

// ============================================
// STATE
// ============================================
let currentPhase = 0;
let time = 0;

// ============================================
// GRID BACKGROUND
// ============================================
function createGrid() {
  const gridGroup = new THREE.Group();
  const gridSize = 40;
  const divisions = 80;
  const material = new THREE.LineBasicMaterial({ color: CONFIG.colors.gridLine, transparent: true, opacity: 0.2 });
  const points = [];
  const step = gridSize / divisions;
  const half = gridSize / 2;

  for (let i = 0; i <= divisions; i++) {
    const pos = -half + i * step;
    points.push(new THREE.Vector3(pos, 0, -half), new THREE.Vector3(pos, 0, half));
    points.push(new THREE.Vector3(-half, 0, pos), new THREE.Vector3(half, 0, pos));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const grid = new THREE.LineSegments(geometry, material);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -6;
  gridGroup.add(grid);
  return gridGroup;
}

// ============================================
// NEBULA (PHASE 1)
// ============================================
const nebulaVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    float swirl = angle + dist * 4.0 - uTime * 0.4;

    vec2 noiseCoord = vec2(cos(swirl) * dist * 2.5, sin(swirl) * dist * 2.5);
    float noise = fbm(noiseCoord + uTime * 0.15);
    noise = noise * 0.5 + 0.5;

    vec3 color1 = vec3(0.29, 0.56, 0.85);
    vec3 color2 = vec3(0.17, 0.34, 0.59);
    vec3 color3 = vec3(0.48, 0.70, 0.94);

    vec3 color = mix(color1, color2, dist * 2.0);
    color = mix(color, color3, noise * 0.5);

    float alpha = (1.0 - smoothstep(0.0, 0.5, dist)) * noise * uOpacity;
    gl_FragColor = vec4(color, alpha * 0.9);
  }
`;

function createNebula() {
  const geometry = new THREE.PlaneGeometry(12, 12);
  const material = new THREE.ShaderMaterial({
    vertexShader: nebulaVertexShader,
    fragmentShader: nebulaFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 1 }
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2.5;
  mesh.position.y = 0.5;
  return { mesh, material };
}

// ============================================
// SPHERE (PHASES 2 & 3)
// ============================================
function createSphere() {
  const geometry = new THREE.SphereGeometry(2, 64, 64);

  // Create procedural texture
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 512;
  texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');

  // Base gradient
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  gradient.addColorStop(0, '#5A8FBC');
  gradient.addColorStop(0.5, '#3B6B96');
  gradient.addColorStop(1, '#2B5797');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add noise texture
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const alpha = Math.random() * 0.2;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 50, 100, ${alpha})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Add swirl patterns
  ctx.strokeStyle = 'rgba(90, 143, 188, 0.25)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);
    for (let j = 0; j < 30; j++) {
      const angle = j * 0.2 + Math.random() * 0.3;
      const radius = j * 6;
      ctx.lineTo(startX + Math.cos(angle) * radius, startY + Math.sin(angle) * radius);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(texCanvas);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.y = 0.5;
  sphere.userData.type = 'sphere';

  // Glow
  const glowGeometry = new THREE.SphereGeometry(2.3, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x5A8FBC,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide
  });
  const glow = new THREE.Mesh(glowGeometry, glowMaterial);
  sphere.add(glow);
  sphere.userData.glow = glow;

  return sphere;
}

// ============================================
// GRAVITY WELL (PHASES 2 & 3)
// ============================================
function createGravityWell() {
  const group = new THREE.Group();
  const rings = 20;
  const segments = 64;

  // Horizontal rings
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const y = -t * 5;
    const radius = 5.5 * (1 - t * 0.75);

    const points = [];
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius * 1.5,
        y,
        Math.sin(angle) * radius
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: CONFIG.colors.gravityWell,
      transparent: true,
      opacity: 0
    });
    const ring = new THREE.Line(geometry, material);
    group.add(ring);
  }

  // Vertical lines
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const points = [];

    for (let j = 0; j < rings; j++) {
      const t = j / (rings - 1);
      const y = -t * 5;
      const radius = 5.5 * (1 - t * 0.75);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius * 1.5,
        y,
        Math.sin(angle) * radius
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: CONFIG.colors.gravityWell,
      transparent: true,
      opacity: 0
    });
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }

  group.position.y = -1.5;
  return group;
}

// ============================================
// ORBITAL RINGS WITH ARROWS
// ============================================
function createOrbitalRings() {
  const group = new THREE.Group();
  const radii = [3.5, 5.0, 6.5];

  radii.forEach((radius, index) => {
    const ringGroup = new THREE.Group();

    // Dashed orbit line
    const curve = new THREE.EllipseCurve(0, 0, radius * 1.4, radius, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(120);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: CONFIG.colors.orbitRing,
      transparent: true,
      opacity: 0,
      dashSize: 0.4,
      gapSize: 0.2,
    });

    const ring = new THREE.Line(geometry, material);
    ring.computeLineDistances();
    ringGroup.add(ring);

    // Direction arrows
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const arrowGroup = new THREE.Group();

      // Arrow shape
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(0, 0);
      arrowShape.lineTo(-0.3, 0.15);
      arrowShape.lineTo(-0.2, 0);
      arrowShape.lineTo(-0.3, -0.15);
      arrowShape.lineTo(0, 0);

      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const arrowMaterial = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.orbitRing,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });

      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.position.x = Math.cos(angle) * radius * 1.4;
      arrow.position.y = Math.sin(angle) * radius;
      arrow.rotation.z = angle - Math.PI / 2;

      arrowGroup.add(arrow);
      arrowGroup.userData.baseAngle = angle;
      arrowGroup.userData.radius = radius;
      arrowGroup.userData.radiusX = radius * 1.4;
      ringGroup.add(arrowGroup);
    }

    ringGroup.rotation.x = -Math.PI / 2.3;
    ringGroup.position.y = 0.3;
    ringGroup.userData.orbitIndex = index;
    group.add(ringGroup);
  });

  return group;
}

// ============================================
// ICON SPRITES
// ============================================
function createIconSprite(iconData) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // White circle background
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = CONFIG.colors.iconStroke;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw icon based on type
  ctx.fillStyle = CONFIG.colors.iconStroke;
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const iconSymbols = {
    linkedin: 'in',
    twitter: '𝕏',
    email: '✉',
    chat: '💬',
    gear: '⚙',
    handshake: '🤝',
    play: '▶',
    document: '📄',
    location: '📍',
    user: '👤',
    phone: '📞',
    megaphone: '📢',
    target: '🎯',
    link: '🔗',
    lightbulb: '💡',
    star: '⭐',
    camera: '📷',
    podcast: '🎙',
    calendar: '📅',
  };

  ctx.fillText(iconSymbols[iconData.id] || '●', 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.8, 0.8, 1);
  sprite.userData = {
    ...iconData,
    type: 'icon',
    baseAngle: (iconData.angle * Math.PI) / 180,
    orbitSpeed: 0.15 + Math.random() * 0.1,
    currentAngle: (iconData.angle * Math.PI) / 180,
    animating: false,
    animationTime: 0,
    originalScale: 0.8
  };

  return sprite;
}

function createAllIcons() {
  const group = new THREE.Group();
  const radii = [3.5, 5.0, 6.5];

  ICONS.forEach(iconData => {
    const sprite = createIconSprite(iconData);
    const orbitIndex = iconData.orbit - 1;
    const radius = radii[orbitIndex];

    sprite.userData.radius = radius;
    sprite.userData.radiusX = radius * 1.4;

    const angle = sprite.userData.currentAngle;
    const x = Math.cos(angle) * radius * 1.4;
    const z = Math.sin(angle) * radius;

    sprite.position.set(x, 0.5, z);
    group.add(sprite);
  });

  group.rotation.x = -Math.PI / 2.3 + Math.PI / 2;
  group.position.y = 0.3;
  return group;
}

// ============================================
// LIGHTING
// ============================================
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 7);
  scene.add(directional);

  const backLight = new THREE.DirectionalLight(0x5A8FBC, 0.4);
  backLight.position.set(-5, -5, -5);
  scene.add(backLight);
}

// ============================================
// INITIALIZE SCENE
// ============================================
const grid = createGrid();
scene.add(grid);

const { mesh: nebula, material: nebulaMaterial } = createNebula();
scene.add(nebula);

const sphere = createSphere();
scene.add(sphere);

const gravityWell = createGravityWell();
scene.add(gravityWell);

const orbitalRings = createOrbitalRings();
scene.add(orbitalRings);

const icons = createAllIcons();
scene.add(icons);

setupLighting();

// ============================================
// PHASE TRANSITIONS
// ============================================
function updatePhase(phase) {
  // Nebula fades out
  const nebulaOpacity = Math.max(0, 1 - phase * 1.5);
  nebulaMaterial.uniforms.uOpacity.value = nebulaOpacity;
  nebula.visible = nebulaOpacity > 0.01;

  // Sphere fades in
  const sphereOpacity = Math.min(1, Math.max(0, (phase - 0.3) * 2));
  sphere.material.opacity = sphereOpacity;
  sphere.userData.glow.material.opacity = sphereOpacity * 0.2;
  sphere.visible = sphereOpacity > 0.01;

  // Gravity well
  const wellOpacity = Math.min(0.5, Math.max(0, (phase - 0.5) * 1.5));
  gravityWell.children.forEach(child => {
    child.material.opacity = wellOpacity;
  });
  gravityWell.visible = wellOpacity > 0.01;

  // Orbital rings
  const ringOpacity = Math.min(0.7, Math.max(0, (phase - 0.6) * 2));
  orbitalRings.children.forEach(ringGroup => {
    ringGroup.children.forEach(child => {
      if (child.material) child.material.opacity = ringOpacity;
      child.children?.forEach(arrow => {
        if (arrow.material) arrow.material.opacity = ringOpacity;
      });
    });
  });

  // Icons stagger in
  icons.children.forEach((icon, index) => {
    const delay = 0.7 + (index / icons.children.length) * 0.3;
    const iconOpacity = Math.min(1, Math.max(0, (phase - delay) * 4));
    icon.material.opacity = iconOpacity;
  });

  updateLabels(phase);
}

function updateLabels(phase) {
  const label = document.getElementById('phase-label');
  const monthDisplay = document.getElementById('month-display');
  if (!label || !monthDisplay) return;

  let phaseName, month;
  if (phase < 0.33) {
    phaseName = 'Rev A';
    month = Math.round(6 + phase * 54);
  } else if (phase < 0.66) {
    phaseName = 'Rev B';
    month = Math.round(6 + phase * 54);
  } else {
    phaseName = 'Rev C';
    month = Math.round(6 + phase * 54);
  }
  month = Math.min(48, Math.max(6, month));

  label.textContent = `BRAND GRAVITY ECOSYSTEM | ${phaseName}`;
  monthDisplay.textContent = `MONTH: ${month}`;
}

// ============================================
// ICON CLICK ANIMATION
// ============================================
function animateIcon(icon) {
  if (icon.userData.animating) return;
  icon.userData.animating = true;
  icon.userData.animationTime = 0;
}

function updateIconAnimations(delta) {
  icons.children.forEach(icon => {
    if (icon.userData.animating) {
      icon.userData.animationTime += delta;
      const t = icon.userData.animationTime;

      // Pulse + spin
      const pulseScale = icon.userData.originalScale * (1 + Math.sin(t * 12) * 0.4 * Math.exp(-t * 2.5));
      icon.scale.set(pulseScale, pulseScale, 1);

      if (t > 1.2) {
        icon.userData.animating = false;
        icon.scale.set(icon.userData.originalScale, icon.userData.originalScale, 1);
      }
    }
  });
}

// ============================================
// ORBIT ANIMATION
// ============================================
function updateOrbits(delta) {
  if (currentPhase < 0.7) return;

  const orbitFactor = Math.min(1, (currentPhase - 0.7) * 3.33);

  icons.children.forEach(icon => {
    icon.userData.currentAngle += icon.userData.orbitSpeed * delta * orbitFactor;

    const angle = icon.userData.currentAngle;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Transform for tilted orbit
    icon.position.x = cosA * icon.userData.radiusX;
    const yBase = sinA * icon.userData.radius;
    icon.position.z = yBase * Math.cos(-Math.PI / 2.3 + Math.PI / 2);
    icon.position.y = 0.3 + yBase * Math.sin(-Math.PI / 2.3 + Math.PI / 2) + 0.5;
  });
}

// ============================================
// EVENT HANDLERS
// ============================================
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(icons.children);

  if (intersects.length > 0) {
    const icon = intersects[0].object;
    if (hoveredIcon !== icon) {
      if (hoveredIcon && !hoveredIcon.userData.animating) {
        hoveredIcon.scale.set(hoveredIcon.userData.originalScale, hoveredIcon.userData.originalScale, 1);
      }
      hoveredIcon = icon;
      if (!icon.userData.animating) {
        icon.scale.set(icon.userData.originalScale * 1.3, icon.userData.originalScale * 1.3, 1);
      }
      canvas.style.cursor = 'pointer';
      showTooltip(event.clientX, event.clientY, icon.userData.name);
    }
  } else {
    if (hoveredIcon && !hoveredIcon.userData.animating) {
      hoveredIcon.scale.set(hoveredIcon.userData.originalScale, hoveredIcon.userData.originalScale, 1);
    }
    hoveredIcon = null;
    canvas.style.cursor = 'grab';
    hideTooltip();
  }
}

function onClick() {
  if (hoveredIcon) {
    animateIcon(hoveredIcon);
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function showTooltip(x, y, text) {
  let tooltip = document.getElementById('icon-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'icon-tooltip';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = text;
  tooltip.style.left = (x + 15) + 'px';
  tooltip.style.top = (y - 10) + 'px';
  tooltip.style.display = 'block';
}

function hideTooltip() {
  const tooltip = document.getElementById('icon-tooltip');
  if (tooltip) tooltip.style.display = 'none';
}

function setupTimeline() {
  const slider = document.getElementById('timeline-slider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      currentPhase = parseFloat(e.target.value);
      updatePhase(currentPhase);
    });
  }
}

// ============================================
// ANIMATION LOOP
// ============================================
let lastTime = 0;
let isVisible = true;

function animate(currentTime) {
  requestAnimationFrame(animate);
  if (!isVisible) return;

  const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
  lastTime = currentTime;
  time += delta;

  // Nebula animation
  nebulaMaterial.uniforms.uTime.value = time;

  // Sphere rotation
  if (sphere.visible) {
    sphere.rotation.y += delta * 0.15;
  }

  // Orbit icons
  updateOrbits(delta);

  // Icon animations
  updateIconAnimations(delta);

  controls.update();
  renderer.render(scene, camera);
}

// ============================================
// INIT
// ============================================
window.addEventListener('resize', onResize);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);
document.addEventListener('visibilitychange', () => { isVisible = !document.hidden; });

setupTimeline();
updatePhase(0);
animate(0);

// Export for potential external control
window.brandGravity = {
  setPhase: (p) => { currentPhase = p; updatePhase(p); },
  getPhase: () => currentPhase
};
