import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  colors: {
    background: 0x000000,
    gridLine: 0x1a1a2e,
    nebulaCore: '#4A90D9',
    nebulaOuter: '#1a3a5c',
    sphereBase: '#2563EB',
    sphereHighlight: '#60A5FA',
    gravityWell: '#3B82F6',
    orbitRing: '#60A5FA',
  }
};

// ============================================
// ICON DEFINITIONS - All 20 icons
// ============================================
const ALL_ICONS = [
  { id: 'linkedin', name: 'LinkedIn', symbol: 'in', color1: '#0077B5', color2: '#004182' },
  { id: 'twitter', name: 'Twitter/X', symbol: '𝕏', color1: '#1DA1F2', color2: '#0d8ecf' },
  { id: 'email', name: 'Email', symbol: '✉', color1: '#EA4335', color2: '#c5221f' },
  { id: 'chat', name: 'Chat', symbol: '💬', color1: '#25D366', color2: '#128C7E' },
  { id: 'gear', name: 'Settings', symbol: '⚙', color1: '#6B7280', color2: '#374151' },
  { id: 'handshake', name: 'Partnership', symbol: '🤝', color1: '#F59E0B', color2: '#D97706' },
  { id: 'play', name: 'Media', symbol: '▶', color1: '#EF4444', color2: '#B91C1C' },
  { id: 'document', name: 'Content', symbol: '📄', color1: '#3B82F6', color2: '#1D4ED8' },
  { id: 'location', name: 'Location', symbol: '📍', color1: '#EF4444', color2: '#991B1B' },
  { id: 'user', name: 'Audience', symbol: '👤', color1: '#8B5CF6', color2: '#6D28D9' },
  { id: 'phone', name: 'Contact', symbol: '📞', color1: '#10B981', color2: '#047857' },
  { id: 'megaphone', name: 'Announcements', symbol: '📢', color1: '#F97316', color2: '#C2410C' },
  { id: 'target', name: 'Goals', symbol: '🎯', color1: '#EC4899', color2: '#BE185D' },
  { id: 'link', name: 'Links', symbol: '🔗', color1: '#6366F1', color2: '#4338CA' },
  { id: 'lightbulb', name: 'Ideas', symbol: '💡', color1: '#FBBF24', color2: '#D97706' },
  { id: 'star', name: 'Reviews', symbol: '⭐', color1: '#FCD34D', color2: '#F59E0B' },
  { id: 'camera', name: 'Visual', symbol: '📷', color1: '#14B8A6', color2: '#0F766E' },
  { id: 'podcast', name: 'Audio', symbol: '🎙', color1: '#A855F7', color2: '#7C3AED' },
  { id: 'calendar', name: 'Events', symbol: '📅', color1: '#06B6D4', color2: '#0891B2' },
  { id: 'analytics', name: 'Analytics', symbol: '📊', color1: '#22C55E', color2: '#15803D' },
];

// Rev B gets first 6, Rev C gets all 20
const REV_B_ICON_COUNT = 6;
const REV_C_ICON_COUNT = 20;

// ============================================
// SCENE SETUP
// ============================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);

// Camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 8, 16);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.minDistance = 10;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI / 1.5;
controls.minPolarAngle = Math.PI / 8;

// Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredIcon = null;

// State
let currentPhase = 0;
let time = 0;

// ============================================
// GRID BACKGROUND (subtle on black)
// ============================================
function createGrid() {
  const group = new THREE.Group();
  const gridSize = 50;
  const divisions = 50;
  const points = [];
  const step = gridSize / divisions;
  const half = gridSize / 2;

  for (let i = 0; i <= divisions; i++) {
    const pos = -half + i * step;
    points.push(new THREE.Vector3(pos, 0, -half), new THREE.Vector3(pos, 0, half));
    points.push(new THREE.Vector3(-half, 0, pos), new THREE.Vector3(half, 0, pos));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: CONFIG.colors.gridLine,
    transparent: true,
    opacity: 0.3
  });
  const grid = new THREE.LineSegments(geometry, material);
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -8;
  group.add(grid);
  return group;
}

// ============================================
// NEBULA (Phase 1 - Rev A)
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
    for (int i = 0; i < 6; i++) {
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
    float swirl = angle + dist * 5.0 - uTime * 0.5;

    vec2 noiseCoord = vec2(cos(swirl) * dist * 3.0, sin(swirl) * dist * 3.0);
    float noise = fbm(noiseCoord + uTime * 0.2);
    noise = noise * 0.5 + 0.5;

    vec3 color1 = vec3(0.15, 0.4, 0.9);
    vec3 color2 = vec3(0.1, 0.2, 0.5);
    vec3 color3 = vec3(0.3, 0.6, 1.0);

    vec3 color = mix(color1, color2, dist * 2.5);
    color = mix(color, color3, noise * 0.6);

    float alpha = (1.0 - smoothstep(0.0, 0.45, dist)) * noise * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

function createNebula() {
  const geometry = new THREE.PlaneGeometry(14, 14);
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
  mesh.rotation.x = -Math.PI / 2.2;
  mesh.position.y = 0;
  return { mesh, material };
}

// ============================================
// SPHERE (Phases 2 & 3)
// ============================================
function createSphere() {
  const geometry = new THREE.SphereGeometry(2.2, 64, 64);

  // Procedural gradient texture
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 512;
  texCanvas.height = 512;
  const ctx = texCanvas.getContext('2d');

  // Dark blue gradient
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 280);
  gradient.addColorStop(0, '#60A5FA');
  gradient.addColorStop(0.4, '#3B82F6');
  gradient.addColorStop(0.7, '#1D4ED8');
  gradient.addColorStop(1, '#1E3A8A');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // Add swirling patterns
  for (let i = 0; i < 15; i++) {
    ctx.strokeStyle = `rgba(96, 165, 250, ${0.1 + Math.random() * 0.2})`;
    ctx.lineWidth = 2 + Math.random() * 4;
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);
    for (let j = 0; j < 40; j++) {
      const angle = j * 0.15 + Math.random() * 0.2;
      const radius = j * 5;
      ctx.lineTo(startX + Math.cos(angle) * radius, startY + Math.sin(angle) * radius);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(texCanvas);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.5,
    metalness: 0.3,
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color(0x1D4ED8),
    emissiveIntensity: 0.2
  });

  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.y = 0;

  // Glow effect
  const glowGeometry = new THREE.SphereGeometry(2.6, 32, 32);
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: 0x3B82F6,
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
// GRAVITY WELL - Scalable depth
// ============================================
function createGravityWell(depth = 5, opacity = 0.4) {
  const group = new THREE.Group();
  const rings = 25;
  const segments = 64;

  // Horizontal rings
  for (let i = 0; i < rings; i++) {
    const t = i / (rings - 1);
    const y = -t * depth;
    const radius = 6 * (1 - t * 0.8);

    const points = [];
    for (let j = 0; j <= segments; j++) {
      const angle = (j / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius * 1.4,
        y,
        Math.sin(angle) * radius
      ));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const ringOpacity = opacity * (1 - t * 0.5);
    const material = new THREE.LineBasicMaterial({
      color: CONFIG.colors.gravityWell,
      transparent: true,
      opacity: 0
    });
    material.userData = { targetOpacity: ringOpacity };
    const ring = new THREE.Line(geometry, material);
    group.add(ring);
  }

  // Vertical lines
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const points = [];

    for (let j = 0; j < rings; j++) {
      const t = j / (rings - 1);
      const y = -t * depth;
      const radius = 6 * (1 - t * 0.8);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius * 1.4,
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
    material.userData = { targetOpacity: opacity * 0.6 };
    const line = new THREE.Line(geometry, material);
    group.add(line);
  }

  group.position.y = -2;
  return group;
}

// ============================================
// ORBITAL RING AROUND SPHERE
// ============================================
function createSphereOrbit() {
  const group = new THREE.Group();

  // Main ring
  const curve = new THREE.EllipseCurve(0, 0, 3.5, 3.5, 0, Math.PI * 2, false, 0);
  const points = curve.getPoints(100);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0x60A5FA,
    transparent: true,
    opacity: 0
  });
  const ring = new THREE.Line(geometry, material);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // Add small orbiting particles
  for (let i = 0; i < 8; i++) {
    const particleGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x60A5FA,
      transparent: true,
      opacity: 0
    });
    const particle = new THREE.Mesh(particleGeom, particleMat);
    particle.userData.orbitAngle = (i / 8) * Math.PI * 2;
    particle.userData.orbitSpeed = 0.5 + Math.random() * 0.3;
    group.add(particle);
  }

  return group;
}

// ============================================
// 3D ICON WITH GRADIENT
// ============================================
function create3DIcon(iconData, orbitRadius, angle) {
  const group = new THREE.Group();

  // Main sphere body with gradient
  const geometry = new THREE.SphereGeometry(0.4, 32, 32);

  // Create gradient texture
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 128;
  texCanvas.height = 128;
  const ctx = texCanvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 40, 0, 64, 64, 70);
  gradient.addColorStop(0, iconData.color1);
  gradient.addColorStop(0.6, iconData.color2);
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  // Add highlight
  const highlight = ctx.createRadialGradient(45, 35, 0, 64, 64, 60);
  highlight.addColorStop(0, 'rgba(255,255,255,0.4)');
  highlight.addColorStop(0.3, 'rgba(255,255,255,0.1)');
  highlight.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = highlight;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(texCanvas);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.3,
    metalness: 0.5,
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color(iconData.color2),
    emissiveIntensity: 0.3
  });

  const sphere = new THREE.Mesh(geometry, material);
  group.add(sphere);

  // Icon label (as sprite for always-facing camera)
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 64;
  labelCanvas.height = 64;
  const labelCtx = labelCanvas.getContext('2d');
  labelCtx.fillStyle = '#ffffff';
  labelCtx.font = 'bold 32px Arial';
  labelCtx.textAlign = 'center';
  labelCtx.textBaseline = 'middle';
  labelCtx.fillText(iconData.symbol, 32, 32);

  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  const labelMaterial = new THREE.SpriteMaterial({
    map: labelTexture,
    transparent: true,
    opacity: 0
  });
  const label = new THREE.Sprite(labelMaterial);
  label.scale.set(0.5, 0.5, 1);
  label.position.y = 0;
  group.add(label);

  // Glow ring
  const glowCurve = new THREE.EllipseCurve(0, 0, 0.5, 0.5, 0, Math.PI * 2, false, 0);
  const glowPoints = glowCurve.getPoints(32);
  const glowGeom = new THREE.BufferGeometry().setFromPoints(glowPoints);
  const glowMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(iconData.color1),
    transparent: true,
    opacity: 0
  });
  const glowRing = new THREE.Line(glowGeom, glowMat);
  glowRing.rotation.x = Math.PI / 2;
  group.add(glowRing);

  group.userData = {
    ...iconData,
    type: 'icon',
    orbitRadius: orbitRadius,
    orbitRadiusX: orbitRadius * 1.3,
    currentAngle: angle,
    orbitSpeed: 0.2 + Math.random() * 0.15,
    animating: false,
    animationTime: 0,
    originalScale: 1,
    sphereMaterial: material,
    labelMaterial: labelMaterial,
    glowMaterial: glowMat
  };

  return group;
}

// ============================================
// ORBITAL RINGS FOR ICONS
// ============================================
function createOrbitalRings() {
  const group = new THREE.Group();
  const radii = [4.5, 6.0, 7.5];

  radii.forEach((radius, index) => {
    const curve = new THREE.EllipseCurve(0, 0, radius * 1.3, radius, 0, Math.PI * 2, false, 0);
    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: CONFIG.colors.orbitRing,
      transparent: true,
      opacity: 0,
      dashSize: 0.5,
      gapSize: 0.25,
    });

    const ring = new THREE.Line(geometry, material);
    ring.computeLineDistances();
    ring.rotation.x = -Math.PI / 2.2;
    ring.position.y = 0;
    ring.userData.orbitIndex = index;
    group.add(ring);

    // Direction arrows
    for (let i = 0; i < 4; i++) {
      const arrowAngle = (i / 4) * Math.PI * 2;
      const arrowGeom = new THREE.ConeGeometry(0.15, 0.4, 8);
      const arrowMat = new THREE.MeshBasicMaterial({
        color: CONFIG.colors.orbitRing,
        transparent: true,
        opacity: 0
      });
      const arrow = new THREE.Mesh(arrowGeom, arrowMat);

      const x = Math.cos(arrowAngle) * radius * 1.3;
      const z = Math.sin(arrowAngle) * radius;
      arrow.position.set(x, 0, z);
      arrow.rotation.x = Math.PI / 2;
      arrow.rotation.z = -arrowAngle + Math.PI / 2;

      ring.add(arrow);
    }
  });

  return group;
}

// ============================================
// CREATE ALL ICONS
// ============================================
function createAllIcons() {
  const group = new THREE.Group();
  const radii = [4.5, 6.0, 7.5];

  ALL_ICONS.forEach((iconData, index) => {
    const orbitIndex = Math.floor(index / 7) % 3;
    const angleOffset = (index % 7) / 7 * Math.PI * 2;
    const radius = radii[orbitIndex];

    const icon = create3DIcon(iconData, radius, angleOffset);
    icon.userData.iconIndex = index;
    icon.userData.orbitIndex = orbitIndex;

    // Position on tilted orbit
    const x = Math.cos(angleOffset) * radius * 1.3;
    const z = Math.sin(angleOffset) * radius;
    icon.position.set(x, 0, z);

    group.add(icon);
  });

  group.rotation.x = -Math.PI / 2.2 + Math.PI / 2;
  group.position.y = 0;
  return group;
}

// ============================================
// LIGHTING
// ============================================
function setupLighting() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(5, 10, 7);
  scene.add(mainLight);

  const blueLight = new THREE.PointLight(0x3B82F6, 1, 20);
  blueLight.position.set(0, 5, 0);
  scene.add(blueLight);

  const rimLight = new THREE.DirectionalLight(0x60A5FA, 0.5);
  rimLight.position.set(-5, -5, -5);
  scene.add(rimLight);
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

const sphereOrbit = createSphereOrbit();
scene.add(sphereOrbit);

// Create two gravity wells - shallow for Rev B, deep for Rev C
const gravityWellB = createGravityWell(4, 0.35);
scene.add(gravityWellB);

const gravityWellC = createGravityWell(8, 0.5);
scene.add(gravityWellC);

const orbitalRings = createOrbitalRings();
scene.add(orbitalRings);

const icons = createAllIcons();
scene.add(icons);

setupLighting();

// ============================================
// PHASE TRANSITIONS
// ============================================
function updatePhase(phase) {
  // NEBULA: Visible in Rev A (phase 0-0.33), fades in transition
  const nebulaOpacity = Math.max(0, 1 - phase * 2.5);
  nebulaMaterial.uniforms.uOpacity.value = nebulaOpacity;
  nebula.visible = nebulaOpacity > 0.01;

  // SPHERE: Appears in Rev B and C (phase > 0.33)
  const sphereStart = 0.25;
  const sphereOpacity = Math.min(1, Math.max(0, (phase - sphereStart) * 3));
  sphere.material.opacity = sphereOpacity;
  sphere.userData.glow.material.opacity = sphereOpacity * 0.25;
  sphere.visible = sphereOpacity > 0.01;

  // SPHERE ORBIT: Appears with sphere
  sphereOrbit.children.forEach(child => {
    if (child.material) child.material.opacity = sphereOpacity * 0.6;
  });

  // GRAVITY WELL B: Visible in Rev B (phase 0.33-0.66)
  const wellBStart = 0.3;
  const wellBEnd = 0.7;
  const wellBOpacity = phase < wellBStart ? 0 :
                       phase < wellBEnd ? Math.min(1, (phase - wellBStart) * 4) :
                       Math.max(0, 1 - (phase - wellBEnd) * 4);
  gravityWellB.children.forEach(child => {
    const target = child.material.userData?.targetOpacity || 0.35;
    child.material.opacity = wellBOpacity * target;
  });
  gravityWellB.visible = wellBOpacity > 0.01;

  // GRAVITY WELL C: Visible in Rev C (phase > 0.66), deeper
  const wellCStart = 0.6;
  const wellCOpacity = Math.min(1, Math.max(0, (phase - wellCStart) * 3));
  gravityWellC.children.forEach(child => {
    const target = child.material.userData?.targetOpacity || 0.5;
    child.material.opacity = wellCOpacity * target;
  });
  gravityWellC.visible = wellCOpacity > 0.01;

  // ORBITAL RINGS: Appear with icons
  const ringStart = 0.35;
  const ringOpacity = Math.min(0.6, Math.max(0, (phase - ringStart) * 2));
  orbitalRings.children.forEach(ring => {
    if (ring.material) ring.material.opacity = ringOpacity;
    ring.children?.forEach(arrow => {
      if (arrow.material) arrow.material.opacity = ringOpacity;
    });
  });

  // ICONS: Rev B shows 6, Rev C shows 20
  const iconStart = 0.4;
  icons.children.forEach((icon, index) => {
    // Determine if this icon should be visible based on phase
    let shouldShow = false;
    let iconOpacity = 0;

    if (phase >= iconStart) {
      if (phase < 0.66) {
        // Rev B: Show first 6 icons
        shouldShow = index < REV_B_ICON_COUNT;
        if (shouldShow) {
          const delay = iconStart + (index / REV_B_ICON_COUNT) * 0.15;
          iconOpacity = Math.min(1, Math.max(0, (phase - delay) * 5));
        }
      } else {
        // Rev C: Show all 20 icons
        shouldShow = index < REV_C_ICON_COUNT;
        if (shouldShow) {
          if (index < REV_B_ICON_COUNT) {
            iconOpacity = 1; // Already visible from Rev B
          } else {
            // Stagger new icons
            const newIndex = index - REV_B_ICON_COUNT;
            const totalNew = REV_C_ICON_COUNT - REV_B_ICON_COUNT;
            const delay = 0.66 + (newIndex / totalNew) * 0.25;
            iconOpacity = Math.min(1, Math.max(0, (phase - delay) * 4));
          }
        }
      }
    }

    // Apply opacity to icon components
    icon.userData.sphereMaterial.opacity = iconOpacity;
    icon.userData.labelMaterial.opacity = iconOpacity * 0.9;
    icon.userData.glowMaterial.opacity = iconOpacity * 0.5;
    icon.visible = iconOpacity > 0.01;
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

      // Pulse and glow
      const scale = 1 + Math.sin(t * 15) * 0.5 * Math.exp(-t * 2);
      icon.scale.set(scale, scale, scale);

      // Increase emissive during animation
      icon.userData.sphereMaterial.emissiveIntensity = 0.3 + Math.sin(t * 15) * 0.4 * Math.exp(-t * 2);

      if (t > 1.5) {
        icon.userData.animating = false;
        icon.scale.set(1, 1, 1);
        icon.userData.sphereMaterial.emissiveIntensity = 0.3;
      }
    }
  });
}

// ============================================
// ORBIT ANIMATIONS
// ============================================
function updateOrbits(delta) {
  if (currentPhase < 0.4) return;

  const orbitFactor = Math.min(1, (currentPhase - 0.4) * 2);

  icons.children.forEach(icon => {
    if (!icon.visible) return;

    icon.userData.currentAngle += icon.userData.orbitSpeed * delta * orbitFactor;
    const angle = icon.userData.currentAngle;

    icon.position.x = Math.cos(angle) * icon.userData.orbitRadiusX;
    const zBase = Math.sin(angle) * icon.userData.orbitRadius;
    icon.position.z = zBase * Math.cos(-Math.PI / 2.2 + Math.PI / 2);
    icon.position.y = zBase * Math.sin(-Math.PI / 2.2 + Math.PI / 2);
  });

  // Update sphere orbit particles
  sphereOrbit.children.forEach(child => {
    if (child.userData.orbitAngle !== undefined) {
      child.userData.orbitAngle += child.userData.orbitSpeed * delta * orbitFactor;
      const angle = child.userData.orbitAngle;
      child.position.x = Math.cos(angle) * 3.5;
      child.position.z = Math.sin(angle) * 3.5;
      child.position.y = 0;
    }
  });
}

// ============================================
// EVENT HANDLERS
// ============================================
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Check for icon intersections
  const iconMeshes = [];
  icons.children.forEach(icon => {
    if (icon.visible) {
      icon.children.forEach(child => {
        if (child.type === 'Mesh') {
          child.userData.parentIcon = icon;
          iconMeshes.push(child);
        }
      });
    }
  });

  const intersects = raycaster.intersectObjects(iconMeshes);

  if (intersects.length > 0) {
    const icon = intersects[0].object.userData.parentIcon;
    if (hoveredIcon !== icon) {
      if (hoveredIcon && !hoveredIcon.userData.animating) {
        hoveredIcon.scale.set(1, 1, 1);
      }
      hoveredIcon = icon;
      if (!icon.userData.animating) {
        icon.scale.set(1.3, 1.3, 1.3);
      }
      canvas.style.cursor = 'pointer';
      showTooltip(event.clientX, event.clientY, icon.userData.name);
    }
  } else {
    if (hoveredIcon && !hoveredIcon.userData.animating) {
      hoveredIcon.scale.set(1, 1, 1);
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
    sphere.rotation.y += delta * 0.2;
  }

  // Orbit animations
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

window.brandGravity = {
  setPhase: (p) => { currentPhase = p; updatePhase(p); },
  getPhase: () => currentPhase
};
