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
  },
  categories: {
    search: { primary: '#3B82F6', secondary: '#1D4ED8', glow: '#60A5FA' },      // Blue
    community: { primary: '#8B5CF6', secondary: '#6D28D9', glow: '#A78BFA' },   // Purple
    developer: { primary: '#10B981', secondary: '#047857', glow: '#34D399' },   // Green
    marketplace: { primary: '#F97316', secondary: '#C2410C', glow: '#FB923C' }, // Orange
    integration: { primary: '#EAB308', secondary: '#A16207', glow: '#FDE047' }, // Yellow
    comparison: { primary: '#14B8A6', secondary: '#0F766E', glow: '#2DD4BF' },  // Teal
  }
};

// ============================================
// FONT AWESOME ICON DEFINITIONS - 20 icons
// ============================================
const ALL_ICONS = [
  // SEARCH (3 icons) - Blue
  { id: 'google', name: 'Google', unicode: '\uf1a0', fontFamily: 'Font Awesome 6 Brands', category: 'search' },
  { id: 'microsoft', name: 'Bing', unicode: '\uf3ca', fontFamily: 'Font Awesome 6 Brands', category: 'search' },
  { id: 'robot', name: 'AI/LLMs', unicode: '\uf544', fontFamily: 'Font Awesome 6 Free', category: 'search' },

  // COMMUNITY (6 icons) - Purple
  { id: 'reddit', name: 'Reddit', unicode: '\uf1a1', fontFamily: 'Font Awesome 6 Brands', category: 'community' },
  { id: 'linkedin', name: 'LinkedIn', unicode: '\uf08c', fontFamily: 'Font Awesome 6 Brands', category: 'community' },
  { id: 'stackoverflow', name: 'Stack Overflow', unicode: '\uf16c', fontFamily: 'Font Awesome 6 Brands', category: 'community' },
  { id: 'discord', name: 'Discord', unicode: '\uf392', fontFamily: 'Font Awesome 6 Brands', category: 'community' },
  { id: 'slack', name: 'Slack', unicode: '\uf198', fontFamily: 'Font Awesome 6 Brands', category: 'community' },
  { id: 'xtwitter', name: 'X/Twitter', unicode: '\ue61b', fontFamily: 'Font Awesome 6 Brands', category: 'community' },

  // DEVELOPER (3 icons) - Green
  { id: 'github', name: 'GitHub', unicode: '\uf09b', fontFamily: 'Font Awesome 6 Brands', category: 'developer' },
  { id: 'code', name: 'Dev Portals', unicode: '\uf121', fontFamily: 'Font Awesome 6 Free', category: 'developer' },
  { id: 'server', name: 'MCP/Servers', unicode: '\uf233', fontFamily: 'Font Awesome 6 Free', category: 'developer' },

  // MARKETPLACE (4 icons) - Orange
  { id: 'aws', name: 'AWS', unicode: '\uf375', fontFamily: 'Font Awesome 6 Brands', category: 'marketplace' },
  { id: 'salesforce', name: 'Salesforce', unicode: '\uf83b', fontFamily: 'Font Awesome 6 Brands', category: 'marketplace' },
  { id: 'hubspot', name: 'HubSpot', unicode: '\uf3b2', fontFamily: 'Font Awesome 6 Brands', category: 'marketplace' },
  { id: 'cloud', name: 'Cloud Marketplaces', unicode: '\uf0c2', fontFamily: 'Font Awesome 6 Free', category: 'marketplace' },

  // INTEGRATION (2 icons) - Yellow
  { id: 'plug', name: 'Native Integrations', unicode: '\uf1e6', fontFamily: 'Font Awesome 6 Free', category: 'integration' },
  { id: 'bolt', name: 'Automation', unicode: '\uf0e7', fontFamily: 'Font Awesome 6 Free', category: 'integration' },

  // COMPARISON (2 icons) - Teal
  { id: 'wikipedia', name: 'Wikipedia', unicode: '\uf266', fontFamily: 'Font Awesome 6 Brands', category: 'comparison' },
  { id: 'chartbar', name: 'Reviews/Analysts', unicode: '\uf080', fontFamily: 'Font Awesome 6 Free', category: 'comparison' },
];

// Rev B shows 6 icons (one per category)
const REV_B_ICONS = [0, 4, 9, 12, 16, 18]; // google, linkedin, github, aws, plug, wikipedia
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
let fontsLoaded = false;

// ============================================
// FONT LOADING
// ============================================
let fontLoadAttempts = 0;
const MAX_FONT_ATTEMPTS = 10;

async function loadFonts() {
  fontLoadAttempts++;

  try {
    // Wait for all fonts to be ready
    await document.fonts.ready;

    // Check if FA fonts are available (Brands uses weight 400, Solid uses 900)
    const testBrands = document.fonts.check('400 48px "Font Awesome 6 Brands"');
    const testSolid = document.fonts.check('900 48px "Font Awesome 6 Free"');

    console.log(`Font check attempt ${fontLoadAttempts}: Brands=${testBrands}, Solid=${testSolid}`);

    if (testBrands && testSolid) {
      fontsLoaded = true;
      console.log('Font Awesome fonts loaded successfully');
      recreateIconTextures();
    } else if (fontLoadAttempts < MAX_FONT_ATTEMPTS) {
      // Retry after a short delay
      setTimeout(loadFonts, 500);
    } else {
      // Force load after max attempts - fonts might be loaded but check failing
      console.log('Max attempts reached, forcing font loaded state');
      fontsLoaded = true;
      recreateIconTextures();
    }
  } catch (e) {
    console.log('Font loading error:', e);
    if (fontLoadAttempts < MAX_FONT_ATTEMPTS) {
      setTimeout(loadFonts, 500);
    } else {
      fontsLoaded = true;
      recreateIconTextures();
    }
  }
}

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
// CREATE FONT AWESOME ICON TEXTURE
// ============================================
function createFAIconTexture(iconData, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const category = CONFIG.categories[iconData.category];

  // Clear with transparency
  ctx.clearRect(0, 0, size, size);

  // Draw circular background with gradient
  const bgGradient = ctx.createRadialGradient(size/2, size/2 - 20, 0, size/2, size/2, size/2);
  bgGradient.addColorStop(0, category.glow);
  bgGradient.addColorStop(0.5, category.primary);
  bgGradient.addColorStop(1, category.secondary);

  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
  ctx.fillStyle = bgGradient;
  ctx.fill();

  // Add highlight
  const highlight = ctx.createRadialGradient(size/2 - 30, size/2 - 40, 0, size/2, size/2, size/2);
  highlight.addColorStop(0, 'rgba(255,255,255,0.4)');
  highlight.addColorStop(0.3, 'rgba(255,255,255,0.15)');
  highlight.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
  ctx.fillStyle = highlight;
  ctx.fill();

  // Draw Font Awesome icon
  if (fontsLoaded) {
    ctx.fillStyle = '#FFFFFF';
    // Brands font uses weight 400, Solid (Free) uses weight 900
    const fontWeight = iconData.fontFamily.includes('Brands') ? '400' : '900';
    ctx.font = `${fontWeight} ${size * 0.45}px "${iconData.fontFamily}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add shadow for depth
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    ctx.fillText(iconData.unicode, size/2, size/2 + 5);

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  } else {
    // Fallback: draw a placeholder circle
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size * 0.2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Add outer glow ring
  ctx.strokeStyle = category.glow;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 5, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// ============================================
// 3D ICON WITH FONT AWESOME
// ============================================
function createFAIcon(iconData, orbitRadius, angle) {
  const group = new THREE.Group();
  const category = CONFIG.categories[iconData.category];

  // Create sprite with FA icon texture
  const texture = createFAIconTexture(iconData);
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 0,
    depthTest: true,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(1.2, 1.2, 1);
  group.add(sprite);

  // Add 3D backing sphere for depth
  const sphereGeom = new THREE.SphereGeometry(0.5, 32, 32);
  const sphereMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(category.primary),
    transparent: true,
    opacity: 0,
    emissive: new THREE.Color(category.secondary),
    emissiveIntensity: 0.3,
    roughness: 0.4,
    metalness: 0.6
  });
  const backingSphere = new THREE.Mesh(sphereGeom, sphereMat);
  backingSphere.position.z = -0.1;
  group.add(backingSphere);

  // Glow ring
  const glowCurve = new THREE.EllipseCurve(0, 0, 0.7, 0.7, 0, Math.PI * 2, false, 0);
  const glowPoints = glowCurve.getPoints(32);
  const glowGeom = new THREE.BufferGeometry().setFromPoints(glowPoints);
  const glowMat = new THREE.LineBasicMaterial({
    color: new THREE.Color(category.glow),
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
    spriteMaterial: spriteMaterial,
    sphereMaterial: sphereMat,
    glowMaterial: glowMat,
    texture: texture
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

    const icon = createFAIcon(iconData, radius, angleOffset);
    icon.userData.iconIndex = index;
    icon.userData.orbitIndex = orbitIndex;
    icon.userData.isRevBIcon = REV_B_ICONS.includes(index);

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
// RECREATE ICON TEXTURES (after fonts load)
// ============================================
function recreateIconTextures() {
  icons.children.forEach((icon, index) => {
    const iconData = ALL_ICONS[index];
    const newTexture = createFAIconTexture(iconData);
    icon.userData.spriteMaterial.map = newTexture;
    icon.userData.spriteMaterial.needsUpdate = true;
    icon.userData.texture.dispose();
    icon.userData.texture = newTexture;
  });
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

// Start loading fonts
loadFonts();

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

  // ICONS: Rev B shows 6 specific icons, Rev C shows all 20
  const iconStart = 0.4;
  icons.children.forEach((icon, index) => {
    let shouldShow = false;
    let iconOpacity = 0;

    if (phase >= iconStart) {
      if (phase < 0.66) {
        // Rev B: Show only the 6 designated Rev B icons
        shouldShow = icon.userData.isRevBIcon;
        if (shouldShow) {
          const revBIndex = REV_B_ICONS.indexOf(index);
          const delay = iconStart + (revBIndex / REV_B_ICON_COUNT) * 0.15;
          iconOpacity = Math.min(1, Math.max(0, (phase - delay) * 5));
        }
      } else {
        // Rev C: Show all 20 icons
        shouldShow = true;
        if (icon.userData.isRevBIcon) {
          iconOpacity = 1; // Already visible from Rev B
        } else {
          // Stagger new icons
          const newIconIndex = ALL_ICONS.findIndex((_, i) => !REV_B_ICONS.includes(i) && i <= index);
          const totalNew = REV_C_ICON_COUNT - REV_B_ICON_COUNT;
          const delay = 0.66 + (newIconIndex / totalNew) * 0.25;
          iconOpacity = Math.min(1, Math.max(0, (phase - delay) * 4));
        }
      }
    }

    // Apply opacity to icon components
    icon.userData.spriteMaterial.opacity = iconOpacity;
    icon.userData.sphereMaterial.opacity = iconOpacity * 0.3;
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

  // Check for icon intersections (use backing spheres for hit detection)
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
