import * as THREE from 'three';

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // Colors (extracted from video)
  colors: {
    background: 0xF5F3E8,      // Cream/beige
    gridLine: 0xD4D0C4,        // Light gray grid
    nebulaCore: '#4A90D9',     // Light blue center
    nebulaOuter: '#2B5797',    // Darker blue edges
    nebulaHighlight: '#7BB3F0', // Bright blue highlights
    particles: '#3B7DD8',       // Particle blue
    orbitRings: '#B8B4A8',     // Gray orbit lines
  },
  // Animation speeds
  animation: {
    nebulaRotation: 0.0003,
    nebulaFlow: 0.15,
    particleDrift: 0.0005,
    particleFloat: 0.002,
  },
  // Counts
  particles: {
    count: 200,
    innerCount: 80,  // Dense particles near center
  }
};

// ============================================
// SCENE SETUP
// ============================================
const canvas = document.getElementById('webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);

// Camera - orthographic for 2D-like feel
const frustumSize = 10;
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  frustumSize * aspect / -2,
  frustumSize * aspect / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  100
);
camera.position.z = 10;

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
  alpha: false
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// ============================================
// GRID BACKGROUND
// ============================================
function createGridBackground() {
  const gridSize = 20;
  const divisions = 40;

  const gridGroup = new THREE.Group();

  // Main grid lines
  const gridMaterial = new THREE.LineBasicMaterial({
    color: CONFIG.colors.gridLine,
    transparent: true,
    opacity: 0.3
  });

  const gridGeometry = new THREE.BufferGeometry();
  const gridPoints = [];

  const step = gridSize / divisions;
  const halfSize = gridSize / 2;

  // Vertical lines
  for (let i = 0; i <= divisions; i++) {
    const x = -halfSize + i * step;
    gridPoints.push(x, -halfSize, 0);
    gridPoints.push(x, halfSize, 0);
  }

  // Horizontal lines
  for (let i = 0; i <= divisions; i++) {
    const y = -halfSize + i * step;
    gridPoints.push(-halfSize, y, 0);
    gridPoints.push(halfSize, y, 0);
  }

  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
  grid.position.z = -5;
  gridGroup.add(grid);

  return gridGroup;
}

// ============================================
// ORBITAL RINGS
// ============================================
function createOrbitalRings() {
  const ringsGroup = new THREE.Group();
  const radii = [1.2, 2.0, 2.8, 3.6, 4.4];

  radii.forEach((radius, index) => {
    const curve = new THREE.EllipseCurve(
      0, 0,
      radius * 1.4, radius, // Slightly elliptical
      0, 2 * Math.PI,
      false,
      0
    );

    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: CONFIG.colors.orbitRings,
      transparent: true,
      opacity: 0.25 - index * 0.03
    });

    const ellipse = new THREE.Line(geometry, material);
    ellipse.rotation.x = Math.PI * 0.1; // Slight tilt
    ellipse.position.z = -1;
    ringsGroup.add(ellipse);
  });

  return ringsGroup;
}

// ============================================
// NEBULA SHADER
// ============================================
const nebulaVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nebulaFragmentShader = `
  uniform float uTime;
  uniform vec3 uColorCore;
  uniform vec3 uColorOuter;
  uniform vec3 uColorHighlight;

  varying vec2 vUv;
  varying vec3 vPosition;

  // Simplex noise functions
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                        -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
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

  // Fractal Brownian Motion
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * snoise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);

    // Create swirling motion
    float angle = atan(uv.y, uv.x);
    float swirl = angle + dist * 3.0 - uTime * 0.3;

    // Generate turbulent noise
    vec2 noiseCoord = vec2(
      cos(swirl) * dist * 2.0,
      sin(swirl) * dist * 2.0
    );

    float noise1 = fbm(noiseCoord + uTime * 0.1);
    float noise2 = fbm(noiseCoord * 1.5 - uTime * 0.15);
    float noise3 = fbm(noiseCoord * 0.5 + vec2(uTime * 0.05, -uTime * 0.08));

    // Combine noises for watercolor effect
    float combinedNoise = (noise1 + noise2 * 0.7 + noise3 * 0.5) / 2.2;
    combinedNoise = combinedNoise * 0.5 + 0.5;

    // Radial falloff for vortex shape
    float vortexShape = 1.0 - smoothstep(0.0, 0.45, dist);
    vortexShape *= combinedNoise;

    // Edge turbulence
    float edgeTurbulence = fbm(uv * 8.0 + uTime * 0.1) * 0.5 + 0.5;
    float edgeMask = smoothstep(0.25, 0.4, dist) * (1.0 - smoothstep(0.4, 0.55, dist));

    // Color mixing
    vec3 color = mix(uColorCore, uColorOuter, dist * 2.0);
    color = mix(color, uColorHighlight, combinedNoise * edgeTurbulence * 0.4);

    // Alpha with soft edges and watercolor feel
    float alpha = vortexShape * 0.85;
    alpha += edgeMask * edgeTurbulence * 0.3;
    alpha *= smoothstep(0.55, 0.35, dist); // Soft outer edge

    // Add some variation for watercolor texture
    alpha *= 0.7 + combinedNoise * 0.3;

    gl_FragColor = vec4(color, alpha);
  }
`;

function createNebula() {
  const geometry = new THREE.PlaneGeometry(8, 8, 1, 1);

  const material = new THREE.ShaderMaterial({
    vertexShader: nebulaVertexShader,
    fragmentShader: nebulaFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color(CONFIG.colors.nebulaHighlight) },
      uColorOuter: { value: new THREE.Color(CONFIG.colors.nebulaOuter) },
      uColorHighlight: { value: new THREE.Color(CONFIG.colors.nebulaCore) }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending
  });

  const nebula = new THREE.Mesh(geometry, material);
  nebula.position.z = 0;

  return { mesh: nebula, material };
}

// ============================================
// PARTICLE SYSTEM
// ============================================
function createParticles() {
  const particleGroup = new THREE.Group();

  // Create particle texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Draw soft circle
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(59, 125, 216, 1)');
  gradient.addColorStop(0.3, 'rgba(59, 125, 216, 0.8)');
  gradient.addColorStop(1, 'rgba(59, 125, 216, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);

  // Outer scattered particles
  const outerCount = CONFIG.particles.count;
  const outerPositions = new Float32Array(outerCount * 3);
  const outerSizes = new Float32Array(outerCount);
  const outerVelocities = [];

  for (let i = 0; i < outerCount; i++) {
    // Distribute in elliptical pattern
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.5 + Math.random() * 3.5;

    outerPositions[i * 3] = Math.cos(angle) * radius * 1.3;
    outerPositions[i * 3 + 1] = Math.sin(angle) * radius;
    outerPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

    outerSizes[i] = 0.03 + Math.random() * 0.06;

    outerVelocities.push({
      x: (Math.random() - 0.5) * 0.002,
      y: (Math.random() - 0.5) * 0.002,
      angle: angle,
      radius: radius,
      speed: 0.0001 + Math.random() * 0.0003,
      floatOffset: Math.random() * Math.PI * 2
    });
  }

  const outerGeometry = new THREE.BufferGeometry();
  outerGeometry.setAttribute('position', new THREE.BufferAttribute(outerPositions, 3));
  outerGeometry.setAttribute('size', new THREE.BufferAttribute(outerSizes, 1));

  const outerMaterial = new THREE.PointsMaterial({
    size: 0.08,
    map: texture,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const outerParticles = new THREE.Points(outerGeometry, outerMaterial);
  outerParticles.userData.velocities = outerVelocities;
  particleGroup.add(outerParticles);

  // Inner dense particles (near nebula)
  const innerCount = CONFIG.particles.innerCount;
  const innerPositions = new Float32Array(innerCount * 3);
  const innerVelocities = [];

  for (let i = 0; i < innerCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.3 + Math.random() * 1.2;

    innerPositions[i * 3] = Math.cos(angle) * radius;
    innerPositions[i * 3 + 1] = Math.sin(angle) * radius;
    innerPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    innerVelocities.push({
      angle: angle,
      radius: radius,
      speed: 0.0005 + Math.random() * 0.001,
      floatOffset: Math.random() * Math.PI * 2
    });
  }

  const innerGeometry = new THREE.BufferGeometry();
  innerGeometry.setAttribute('position', new THREE.BufferAttribute(innerPositions, 3));

  const innerMaterial = new THREE.PointsMaterial({
    size: 0.05,
    map: texture,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true
  });

  const innerParticles = new THREE.Points(innerGeometry, innerMaterial);
  innerParticles.userData.velocities = innerVelocities;
  particleGroup.add(innerParticles);

  return particleGroup;
}

// ============================================
// INITIALIZE SCENE
// ============================================
const grid = createGridBackground();
scene.add(grid);

const orbitalRings = createOrbitalRings();
scene.add(orbitalRings);

const { mesh: nebula, material: nebulaMaterial } = createNebula();
scene.add(nebula);

const particles = createParticles();
scene.add(particles);

// ============================================
// ANIMATION
// ============================================
let time = 0;
let animationId;
let isVisible = true;

function animateParticles() {
  particles.children.forEach((particleSystem, systemIndex) => {
    const positions = particleSystem.geometry.attributes.position.array;
    const velocities = particleSystem.userData.velocities;

    for (let i = 0; i < velocities.length; i++) {
      const vel = velocities[i];

      // Orbital motion
      vel.angle += vel.speed;

      // Calculate new position with gentle floating
      const floatY = Math.sin(time * 2 + vel.floatOffset) * 0.02;
      const floatX = Math.cos(time * 1.5 + vel.floatOffset) * 0.01;

      positions[i * 3] = Math.cos(vel.angle) * vel.radius * (systemIndex === 0 ? 1.3 : 1) + floatX;
      positions[i * 3 + 1] = Math.sin(vel.angle) * vel.radius + floatY;
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
  });
}

function animate() {
  if (!isVisible) {
    animationId = requestAnimationFrame(animate);
    return;
  }

  time += 0.016; // Approximately 60fps timing

  // Update nebula shader
  nebulaMaterial.uniforms.uTime.value = time * CONFIG.animation.nebulaFlow;

  // Slowly rotate nebula
  nebula.rotation.z += CONFIG.animation.nebulaRotation;

  // Animate particles
  animateParticles();

  // Subtle orbital ring rotation
  orbitalRings.rotation.z += 0.0001;

  renderer.render(scene, camera);
  animationId = requestAnimationFrame(animate);
}

// ============================================
// EVENT HANDLERS
// ============================================
function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;

  camera.left = frustumSize * aspect / -2;
  camera.right = frustumSize * aspect / 2;
  camera.top = frustumSize / 2;
  camera.bottom = frustumSize / -2;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onWindowResize);

// Pause when tab is hidden
document.addEventListener('visibilitychange', () => {
  isVisible = !document.hidden;
});

// ============================================
// WEBGL SUPPORT CHECK
// ============================================
function checkWebGLSupport() {
  try {
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    return !!gl;
  } catch (e) {
    return false;
  }
}

if (!checkWebGLSupport()) {
  canvas.style.display = 'none';
  const fallback = document.getElementById('video-fallback');
  if (fallback) fallback.style.display = 'block';
} else {
  animate();
}

// ============================================
// CLEANUP (for HMR in dev)
// ============================================
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(animationId);
    renderer.dispose();
  });
}
