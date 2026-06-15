// 3D Solar System Simulation - Core Logic using Three.js
// Maps and enhances features from the Processing sketch

// Simulation state variables
let scene, camera, renderer, controls;
let planets = [];
let planetMeshes = {}; // Maps planet name -> Mesh
let planetsGroup;
let starfield;
let asteroidBelt;
let asteroidData = [];
let comets = [];
let sunGlowMesh;

let simSpeed = 0.25;
let paused = false;
let showLabels = true;
let showOrbits = true;
let showAsteroids = true;
let infoMode = true;
let cinematicMode = false;
let cameraMode = 0; // 0=Angled, 1=Top, 2=Side, 3=Track

let selectedPlanet = null;
let hoveredPlanetName = null;
const sidebarWidth = 360;

// Planet data structure matching Processing sketch relative parameters (scaled down by 0.5 for fit)
const PLANET_CONFIGS = [
  {
    name: "Mercury",
    orbitRadius: 90,
    radius: 4.0,
    color: 0xa09b96,
    orbitSpeed: 0.246, // Keplerian speed
    rotationSpeed: 0.030,
    surfaceNote: "Rocky surface",
    moonNote: "No moon",
    factNote: "Fastest orbit",
    orbitPeriodNote: "88 days",
    sizeNote: "4,880 km",
    textureFn: generateMercuryTexture
  },
  {
    name: "Venus",
    orbitRadius: 120,
    radius: 6.0,
    color: 0xd2aa5a,
    orbitSpeed: 0.098,
    rotationSpeed: 0.022,
    surfaceNote: "Thick clouds",
    moonNote: "No moon",
    factNote: "Very hot planet",
    orbitPeriodNote: "225 days",
    sizeNote: "12,104 km",
    textureFn: generateVenusTexture
  },
  {
    name: "Earth",
    orbitRadius: 144,
    radius: 6.5,
    color: 0x4682ff,
    orbitSpeed: 0.060,
    rotationSpeed: 0.040,
    surfaceNote: "Blue oceans",
    moonNote: "1 moon",
    factNote: "Habitable world",
    orbitPeriodNote: "365 days",
    sizeNote: "12,742 km",
    textureFn: generateEarthTexture,
    hasMoon: true,
    moon: {
      name: "Moon",
      orbitRadius: 11,
      radius: 1.6,
      color: 0xd2d2dc,
      orbitSpeed: 0.12,
      rotationSpeed: 0.03,
      textureFn: generateMoonTexture
    }
  },
  {
    name: "Mars",
    orbitRadius: 180,
    radius: 5.0,
    color: 0xdc6446,
    orbitSpeed: 0.032,
    rotationSpeed: 0.035,
    surfaceNote: "Dusty red",
    moonNote: "Small moons",
    factNote: "Cold desert",
    orbitPeriodNote: "687 days",
    sizeNote: "6,779 km",
    textureFn: generateMarsTexture
  },
  {
    name: "Jupiter",
    orbitRadius: 363,
    radius: 13.5,
    color: 0xcda06e,
    orbitSpeed: 0.005,
    rotationSpeed: 0.055,
    surfaceNote: "Gas giant",
    moonNote: "Many moons",
    factNote: "Largest planet",
    orbitPeriodNote: "11.9 years",
    sizeNote: "139,820 km",
    textureFn: generateJupiterTexture
  },
  {
    name: "Saturn",
    orbitRadius: 522,
    radius: 11.5,
    color: 0xdcc382,
    orbitSpeed: 0.002,
    rotationSpeed: 0.050,
    surfaceNote: "Ring system",
    moonNote: "Many moons",
    factNote: "Gas giant",
    orbitPeriodNote: "29.5 years",
    sizeNote: "116,460 km",
    textureFn: generateSaturnTexture,
    hasRings: true
  },
  {
    name: "Uranus",
    orbitRadius: 810,
    radius: 9.0,
    color: 0x7ddcdc,
    orbitSpeed: 0.0007,
    rotationSpeed: 0.045,
    surfaceNote: "Icy giant",
    moonNote: "Tilted axis",
    factNote: "Cold atmosphere",
    orbitPeriodNote: "84 years",
    sizeNote: "50,724 km",
    textureFn: generateUranusTexture
  },
  {
    name: "Neptune",
    orbitRadius: 1072,
    radius: 8.5,
    color: 0x5578ff,
    orbitSpeed: 0.00036,
    rotationSpeed: 0.040,
    surfaceNote: "Deep blue",
    moonNote: "Strong winds",
    factNote: "Outer ice giant",
    orbitPeriodNote: "165 years",
    sizeNote: "49,244 km",
    textureFn: generateNeptuneTexture
  }
];

// Comet configurations with elliptical parameters
const COMET_CONFIGS = [
  { orbitA: 235, orbitB: 95, yOffset: -12.5, speed: 0.008, color: 0xc8ebff, label: "Comet Halley" },
  { orbitA: 260, orbitB: 150, yOffset: 15.0, speed: 0.006, color: 0xffdcbc, label: "Comet Encke" },
  { orbitA: 215, orbitB: 60, yOffset: -20.0, speed: 0.010, color: 0xb4ffe6, label: "Comet Borrelly" }
];

// Setup simulation on page load
window.addEventListener('DOMContentLoaded', () => {
  init();
  animate();
});

function init() {
  const container = document.getElementById('canvas-container');

  // 1. SCENE & CAMERA
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040812, 0.00015);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1.0, 10000);
  camera.position.set(150, 120, 250);

  // 2. RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  // 3. ORBIT CONTROLS
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 2500;
  controls.minDistance = 20;

  // 4. LIGHTING
  const ambientLight = new THREE.AmbientLight(0x22222b);
  scene.add(ambientLight);

  // Point light inside the Sun representing sunlight
  const sunlight = new THREE.PointLight(0xfffae6, 1.8, 1800, 0.8);
  scene.add(sunlight);

  // Subtle blue ambient light coming from side to fill shadows slightly
  const skyLight = new THREE.DirectionalLight(0x5a78ff, 0.25);
  skyLight.position.set(-200, -100, 300);
  scene.add(skyLight);

  // 5. STARFIELD BACKGROUND
  createStarfield();

  // 6. THE GLOWING SUN
  createSun();

  // 7. PLANETS & MOONS
  createPlanets();

  // 8. ASTEROID BELT
  createAsteroidBelt();

  // 9. COMETS
  createComets();

  // 10. SETUP HTML OVERLAYS & UI HANDLERS
  setupUI();

  // Hide loading overlay
  setTimeout(() => {
    const loader = document.getElementById('loader');
    loader.classList.add('loaded');
    lucide.createIcons();
  }, 800);
}

// =========================================================
// CREATION METHODS
// =========================================================

function createStarfield() {
  const count = 1500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const colorPool = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xccccff),
    new THREE.Color(0xffeacc),
    new THREE.Color(0xffcccc)
  ];

  for (let i = 0; i < count; i++) {
    // Distribute stars on a large sphere surface
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const radius = 2500 + Math.random() * 500;

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);

    const c = colorPool[Math.floor(Math.random() * colorPool.length)];
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true
  });

  starfield = new THREE.Points(geometry, material);
  scene.add(starfield);
}

function createSun() {
  // Sun sphere mesh
  const sunGeom = new THREE.SphereGeometry(20, 48, 48);
  
  // Create Canvas from textures.js
  const sunCanvas = generateSunTexture();
  const sunTexture = new THREE.CanvasTexture(sunCanvas);
  
  const sunMat = new THREE.MeshBasicMaterial({
    map: sunTexture,
    color: 0xfff3d0
  });

  const sunMesh = new THREE.Mesh(sunGeom, sunMat);
  scene.add(sunMesh);

  // Glowing corona overlay
  const glowGeom = new THREE.SphereGeometry(21.5, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff9c28,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide
  });
  sunGlowMesh = new THREE.Mesh(glowGeom, glowMat);
  scene.add(sunGlowMesh);
  
  // Store reference to Sun center for screen coordinate projections
  planetMeshes["Sun"] = sunMesh;
}

function createPlanets() {
  planetsGroup = new THREE.Group();
  scene.add(planetsGroup);

  PLANET_CONFIGS.forEach(config => {
    // Create planetary object container
    const pData = {
      ...config,
      orbitAngle: Math.random() * Math.PI * 2,
      selfRotation: Math.random() * Math.PI * 2
    };
    planets.push(pData);

    const planetPivot = new THREE.Group();
    planetsGroup.add(planetPivot);

    // Procedural texture generation
    const canvas = config.textureFn();
    const texture = new THREE.CanvasTexture(canvas);

    // Dynamic phong/standard material based on planet type
    let pMat;
    if (config.name === "Earth") {
      pMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.15,
        metalness: 0.1,
        bumpScale: 0.25
      });
    } else {
      pMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: config.name.includes("Uranus") || config.name.includes("Neptune") ? 0.75 : 0.9,
        metalness: 0.05
      });
    }

    const geom = new THREE.SphereGeometry(config.radius, 32, 32);
    const mesh = new THREE.Mesh(geom, pMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData = { planetData: pData };
    
    // Position planet along orbit
    const x = Math.cos(pData.orbitAngle) * pData.orbitRadius;
    const z = Math.sin(pData.orbitAngle) * pData.orbitRadius;
    mesh.position.set(x, 0, z);
    planetPivot.add(mesh);
    planetMeshes[config.name] = mesh;

    // Special Additions:
    // Earth Clouds Overlay
    if (config.name === "Earth") {
      const cloudGeom = new THREE.SphereGeometry(config.radius + 0.08, 32, 32);
      const cloudCanvas = generateEarthCloudTexture();
      const cloudTex = new THREE.CanvasTexture(cloudCanvas);
      const cloudMat = new THREE.MeshStandardMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.65,
        depthWrite: false
      });
      const cloudMesh = new THREE.Mesh(cloudGeom, cloudMat);
      mesh.add(cloudMesh);
      pData.cloudMesh = cloudMesh; // track to rotate clouds slightly faster
    }

    // Saturn's Ring
    if (config.hasRings) {
      const ringGeom = new THREE.RingGeometry(config.radius * 1.5, config.radius * 2.8, 64);
      
      // Map UVs radially (U coordinate represents radius, V is constant)
      const uvs = ringGeom.attributes.uv;
      const pos = ringGeom.attributes.position;
      const innerR = config.radius * 1.5;
      const outerR = config.radius * 2.8;
      
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const py = pos.getY(i);
        const r = Math.sqrt(px * px + py * py);
        const u = (r - innerR) / (outerR - innerR);
        uvs.setXY(i, u, 0.5);
      }
      ringGeom.attributes.uv.needsUpdate = true;

      const ringCanvas = generateSaturnRingTexture();
      const ringTexture = new THREE.CanvasTexture(ringCanvas);
      
      const ringMat = new THREE.MeshStandardMaterial({
        map: ringTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
        roughness: 0.6
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2.6; // Angled ring
      mesh.add(ringMesh);
    }

    // Earth's Moon
    if (config.hasMoon && config.moon) {
      const moonConfig = config.moon;
      const moonPivot = new THREE.Group();
      mesh.add(moonPivot); // Attach moon pivot directly to Earth mesh

      const moonCanvas = moonConfig.textureFn();
      const moonTexture = new THREE.CanvasTexture(moonCanvas);
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTexture,
        roughness: 0.95
      });
      const moonGeom = new THREE.SphereGeometry(moonConfig.radius, 16, 16);
      const moonMesh = new THREE.Mesh(moonGeom, moonMat);
      
      moonMesh.position.set(moonConfig.orbitRadius, 0, 0);
      moonPivot.add(moonMesh);
      
      // Store references for updates
      pData.moonPivot = moonPivot;
      pData.moonData = {
        ...moonConfig,
        orbitAngle: Math.random() * Math.PI * 2
      };
      planetMeshes["Moon"] = moonMesh;
    }

    // Orbit Path Line (THREE.Line)
    const orbitPoints = [];
    const segments = 128;
    for (let j = 0; j <= segments; j++) {
      const theta = (j / segments) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.cos(theta) * pData.orbitRadius, 0, Math.sin(theta) * pData.orbitRadius));
    }
    const orbitGeom = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x1d2e54,
      transparent: true,
      opacity: 0.5,
      linewidth: 1
    });
    const orbitLine = new THREE.Line(orbitGeom, orbitMat);
    scene.add(orbitLine);
    pData.orbitLine = orbitLine;
  });
}

function createAsteroidBelt() {
  const asteroidCount = 380;
  
  // Low detail random rock geometry
  const rockGeom = new THREE.DodecahedronGeometry(1.2, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x877d78,
    roughness: 0.95,
    metalness: 0.1
  });

  asteroidBelt = new THREE.InstancedMesh(rockGeom, rockMat, asteroidCount);
  scene.add(asteroidBelt);

  const tempObj = new THREE.Object3D();
  
  for (let i = 0; i < asteroidCount; i++) {
    // Orbit radius scattered between Mars (180) and Jupiter (363)
    const orbitR = 230 + Math.random() * 40;
    const angle = Math.random() * Math.PI * 2;
    const yOffset = (Math.random() - 0.5) * 10;
    const scale = 0.5 + Math.random() * 1.5;
    const speed = 0.006 + Math.random() * 0.008;

    const data = {
      orbitRadius: orbitR,
      angle: angle,
      yOffset: yOffset,
      scale: scale,
      speed: speed,
      rotX: Math.random() * Math.PI,
      rotY: Math.random() * Math.PI,
      rotZ: Math.random() * Math.PI,
      rotSpeed: 0.01 + Math.random() * 0.02
    };
    asteroidData.push(data);

    // Initial transformations
    tempObj.position.set(Math.cos(angle) * orbitR, yOffset, Math.sin(angle) * orbitR);
    tempObj.rotation.set(data.rotX, data.rotY, data.rotZ);
    tempObj.scale.setScalar(scale);
    tempObj.updateMatrix();
    asteroidBelt.setMatrixAt(i, tempObj.matrix);
  }
  asteroidBelt.instanceMatrix.needsUpdate = true;

  // Add faint asteroid belt ring borders
  const beltGuides = [];
  const innerGeom = new THREE.BufferGeometry().setFromPoints(generateCirclePoints(230));
  const outerGeom = new THREE.BufferGeometry().setFromPoints(generateCirclePoints(270));
  const guideMat = new THREE.LineBasicMaterial({ color: 0x1d2e54, transparent: true, opacity: 0.25 });
  
  const innerLine = new THREE.Line(innerGeom, guideMat);
  const outerLine = new THREE.Line(outerGeom, guideMat);
  scene.add(innerLine);
  scene.add(outerLine);
  
  beltGuides.push(innerLine, outerLine);
  asteroidBelt.userData = { guides: beltGuides };
}

function generateCirclePoints(radius) {
  const points = [];
  for (let i = 0; i <= 64; i++) {
    const theta = (i / 64) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
  }
  return points;
}

function createComets() {
  const cometGeom = new THREE.SphereGeometry(2.0, 8, 8);

  COMET_CONFIGS.forEach((config, index) => {
    const comPivot = new THREE.Group();
    scene.add(comPivot);

    const comMat = new THREE.MeshBasicMaterial({
      color: config.color,
      toneMapped: false
    });

    const comMesh = new THREE.Mesh(cometGeom, comMat);
    comPivot.add(comMesh);

    const data = {
      ...config,
      angle: Math.random() * Math.PI * 2,
      mesh: comMesh,
      pivot: comPivot,
      trailParticles: []
    };
    comets.push(data);

    // Generate trail mesh pool
    // Each particle is a tiny fading mesh sphere
    const trailGeom = new THREE.SphereGeometry(1.0, 4, 4);
    const pPool = [];
    const poolSize = 80;
    for (let i = 0; i < poolSize; i++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: config.color,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const pMesh = new THREE.Mesh(trailGeom, pMat);
      scene.add(pMesh);
      pPool.push({
        mesh: pMesh,
        age: 0,
        active: false
      });
    }
    data.particlePool = pPool;
  });
}

// =========================================================
// SIMULATION & ANIMATION LOOP
// =========================================================

function animate() {
  requestAnimationFrame(animate);

  const deltaSpeed = paused ? 0 : simSpeed;

  // 1. UPDATE PLANETS AND MOONS Orbit Positions
  planets.forEach(p => {
    const mesh = planetMeshes[p.name];

    // Orbit Rotation
    p.orbitAngle += p.orbitSpeed * deltaSpeed * 0.5; // slow down factor matching web visuals
    mesh.position.x = Math.cos(p.orbitAngle) * p.orbitRadius;
    mesh.position.z = Math.sin(p.orbitAngle) * p.orbitRadius;

    // Self Spin
    p.selfRotation += p.rotationSpeed * deltaSpeed * 0.5;
    mesh.rotation.y = p.selfRotation;

    // Earth cloud rotation (slightly faster than planet spin)
    if (p.name === "Earth" && p.cloudMesh) {
      p.cloudMesh.rotation.y = p.selfRotation * 1.15;
    }

    // Moon Orbit rotation relative to Earth
    if (p.hasMoon && p.moonPivot && p.moonData) {
      p.moonData.orbitAngle += p.moonData.orbitSpeed * deltaSpeed * 0.6;
      p.moonPivot.rotation.y = p.moonData.orbitAngle;
    }
  });

  // 2. UPDATE ASTEROID BELT InstancedMesh
  if (showAsteroids && !paused) {
    const tempObj = new THREE.Object3D();
    for (let i = 0; i < asteroidData.length; i++) {
      const ast = asteroidData[i];
      ast.angle += ast.speed * deltaSpeed * 0.4;
      ast.rotY += ast.rotSpeed * deltaSpeed;

      tempObj.position.set(Math.cos(ast.angle) * ast.orbitRadius, ast.yOffset, Math.sin(ast.angle) * ast.orbitRadius);
      tempObj.rotation.set(ast.rotX, ast.rotY, ast.rotZ);
      tempObj.scale.setScalar(ast.scale);
      tempObj.updateMatrix();
      asteroidBelt.setMatrixAt(i, tempObj.matrix);
    }
    asteroidBelt.instanceMatrix.needsUpdate = true;
  }

  // 3. UPDATE COMETS & EMIT TRAILS
  comets.forEach(c => {
    // Elliptical Keplerian orbit position
    c.angle += c.speed * deltaSpeed * 0.8;
    const x = Math.cos(c.angle) * c.orbitA;
    const z = Math.sin(c.angle) * c.orbitB;
    c.mesh.position.set(x, c.yOffset, z);

    // Emit trail particle
    if (!paused && Math.random() < 0.8) {
      const inactiveParticle = c.particlePool.find(p => !p.active);
      if (inactiveParticle) {
        inactiveParticle.active = true;
        inactiveParticle.age = 0;
        inactiveParticle.mesh.position.copy(c.mesh.position);
        inactiveParticle.mesh.scale.setScalar(1.2 + Math.random() * 0.8);
        inactiveParticle.mesh.material.opacity = 0.85;
      }
    }

    // Update trails
    c.particlePool.forEach(p => {
      if (p.active) {
        p.age += 1;
        p.mesh.scale.multiplyScalar(0.975);
        p.mesh.material.opacity -= 0.015;
        
        // Dissipate after 60 frames or scale becomes tiny
        if (p.age > 60 || p.mesh.material.opacity <= 0.0) {
          p.active = false;
          p.mesh.material.opacity = 0;
        }
      }
    });
  });

  // Slow rotation for Starfield and Sun Glow
  if (!paused) {
    starfield.rotation.y += 0.00003;
    planetMeshes["Sun"].rotation.y += 0.0006 * deltaSpeed;
    sunGlowMesh.rotation.y -= 0.0002;
  }

  // 4. CAMERA VIEW PRESET LOGIC
  applyCameraPresets();

  // 5. UPDATE OVERLAYS (2D Labels & floating popup card)
  updateHTMLOverlays();

  controls.update();
  renderer.render(scene, camera);
}

function applyCameraPresets() {
  if (cinematicMode && !paused) {
    const time = Date.now() * 0.00015;
    
    if (cameraMode !== 3) {
      const radius = 250 + Math.sin(time * 0.45) * 60;
      camera.position.x = Math.cos(time * 0.25) * radius;
      camera.position.z = Math.sin(time * 0.25) * radius;
      camera.position.y = 80 + Math.sin(time * 0.15) * 45;
    } else if (selectedPlanet) {
      // revolve camera target around the selected tracked planet
      const mesh = planetMeshes[selectedPlanet.name];
      const targetPos = new THREE.Vector3();
      mesh.getWorldPosition(targetPos);

      const offsetDist = selectedPlanet.radius * 3.5;
      camera.position.x = targetPos.x + Math.cos(time * 0.8) * offsetDist;
      camera.position.z = targetPos.z + Math.sin(time * 0.8) * offsetDist;
      camera.position.y = targetPos.y + selectedPlanet.radius * 1.5;
    }
  }

  // Preset alignments
  if (cameraMode === 3 && selectedPlanet) {
    // Planet Tracking Camera
    const mesh = planetMeshes[selectedPlanet.name];
    const targetPos = new THREE.Vector3();
    mesh.getWorldPosition(targetPos);
    
    // Smooth camera target glide
    controls.target.lerp(targetPos, 0.08);
  } else {
    // Glide camera target back to origin (Sun)
    controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.08);
  }
}

// Project 3D vector coordinates onto 2D viewport space
const tempV = new THREE.Vector3();
function getScreenPosition(object, offset3D = new THREE.Vector3()) {
  tempV.copy(offset3D);
  object.localToWorld(tempV);
  tempV.project(camera);

  // Translate to screen coords
  const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
  const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
  return { x, y, z: tempV.z };
}

function updateHTMLOverlays() {
  // 1. UPDATE CELESTIAL LABELS
  const labelsContainer = document.getElementById('labels-container');
  if (!labelsContainer) return;

  PLANET_CONFIGS.forEach(p => {
    const mesh = planetMeshes[p.name];
    const labelEl = document.getElementById(`label-${p.name}`);
    if (!labelEl) return;

    // Position label slightly above the planet body
    const pos = getScreenPosition(mesh, new THREE.Vector3(0, p.radius + 2, 0));

    // Hide if label is turned off, or if planet falls behind camera plane (pos.z > 1)
    // Also hide if layout sidebar covers it completely on desktop
    const insideView = pos.x > 10 && pos.x < (window.innerWidth - (sidebarOpen() ? sidebarWidth : 10)) &&
                       pos.y > 10 && pos.y < window.innerHeight - 10;

    if (showLabels && pos.z < 1.0 && insideView) {
      labelEl.style.left = `${pos.x}px`;
      labelEl.style.top = `${pos.y}px`;
      labelEl.style.opacity = '1';

      // Assign highlight states
      if (selectedPlanet && selectedPlanet.name === p.name) {
        labelEl.className = 'webgl-label selected';
      } else if (hoveredPlanetName === p.name) {
        labelEl.className = 'webgl-label hovered';
      } else {
        labelEl.className = 'webgl-label';
      }
    } else {
      labelEl.style.opacity = '0';
    }

    // Earth's Moon label
    if (p.hasMoon) {
      const moonMesh = planetMeshes["Moon"];
      const moonEl = document.getElementById('label-Moon');
      if (moonMesh && moonEl) {
        const mPos = getScreenPosition(moonMesh, new THREE.Vector3(0, p.moon.radius + 1.2, 0));
        const moonInsideView = mPos.x > 10 && mPos.x < (window.innerWidth - (sidebarOpen() ? sidebarWidth : 10)) &&
                               mPos.y > 10 && mPos.y < window.innerHeight - 10;
        
        // Only show moon label if zoom is close enough (to prevent visual clutter)
        const closeZoom = camera.position.distanceTo(mesh.position) < 140;

        if (showLabels && closeZoom && mPos.z < 1.0 && moonInsideView) {
          moonEl.style.left = `${mPos.x}px`;
          moonEl.style.top = `${mPos.y}px`;
          moonEl.style.opacity = '1';
        } else {
          moonEl.style.opacity = '0';
        }
      }
    }
  });

  // 2. UPDATE FLOATING CARD (POPUP NEAR SELECTED PLANET)
  const card = document.getElementById('planet-card');
  if (selectedPlanet && card) {
    const mesh = planetMeshes[selectedPlanet.name];
    const pos = getScreenPosition(mesh, new THREE.Vector3(0, selectedPlanet.radius, 0));
    
    const maxSideOffset = sidebarOpen() ? sidebarWidth : 10;
    const insideView = pos.x > 10 && pos.x < (window.innerWidth - maxSideOffset) &&
                       pos.y > 10 && pos.y < window.innerHeight - 10 && pos.z < 1.0;

    if (insideView) {
      card.classList.remove('hidden');

      const cardW = 240;
      const cardH = infoMode ? 180 : 120;
      let left = pos.x + 22;
      let top = pos.y - cardH * 0.5;

      // Wrap-around bounds checks
      if (left + cardW > window.innerWidth - maxSideOffset) {
        left = pos.x - cardW - 22;
      }
      if (top < 10) top = 10;
      if (top + cardH > window.innerHeight - 80) top = window.innerHeight - cardH - 80;

      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
    } else {
      card.classList.add('hidden');
    }
  } else if (card) {
    card.classList.add('hidden');
  }

  // 3. UPDATE HOVER INDICATOR RING (HTML CSS OVERLAY)
  const hoverInd = document.getElementById('hover-indicator');
  if (hoverInd) {
    if (hoveredPlanetName) {
      const hMesh = planetMeshes[hoveredPlanetName];
      const hData = planets.find(p => p.name === hoveredPlanetName);
      
      const pos = getScreenPosition(hMesh, new THREE.Vector3(0, 0, 0));
      const edge = getScreenPosition(hMesh, new THREE.Vector3(hData.radius * 1.5, 0, 0));
      const ringRadius = Math.abs(edge.x - pos.x);

      const insideView = pos.x > 10 && pos.x < (window.innerWidth - (sidebarOpen() ? sidebarWidth : 10)) &&
                         pos.y > 10 && pos.y < window.innerHeight - 10 && pos.z < 1.0;

      if (insideView) {
        hoverInd.classList.remove('hidden');
        hoverInd.style.left = `${pos.x}px`;
        hoverInd.style.top = `${pos.y}px`;
        hoverInd.style.width = `${ringRadius * 2}px`;
        hoverInd.style.height = `${ringRadius * 2}px`;
      } else {
        hoverInd.classList.add('hidden');
      }
    } else {
      hoverInd.classList.add('hidden');
    }
  }
}

function sidebarOpen() {
  const sidebar = document.getElementById('sidebar');
  return sidebar && !sidebar.classList.contains('collapsed');
}

// =========================================================
// INTERACTIVE RAYCASTING & CLICKS
// =========================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);

function onMouseMove(e) {
  // Ignore clicks/hovers when hovering sidebar
  if (sidebarOpen() && e.clientX > window.innerWidth - sidebarWidth) {
    hoveredPlanetName = null;
    return;
  }

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Extract sphere meshes
  const interactable = Object.values(planetMeshes);
  const intersects = raycaster.intersectObjects(interactable);

  if (intersects.length > 0) {
    let parentMesh = intersects[0].object;
    // Walk up pivot group in case we hovered rings or clouds
    while (parentMesh.parent && parentMesh.parent !== planetsGroup && !parentMesh.userData.planetData) {
      parentMesh = parentMesh.parent;
    }

    if (parentMesh.userData && parentMesh.userData.planetData) {
      hoveredPlanetName = parentMesh.userData.planetData.name;
      document.body.style.cursor = 'pointer';
      return;
    }
  }
  hoveredPlanetName = null;
  document.body.style.cursor = 'default';
}

function onClick(e) {
  if (sidebarOpen() && e.clientX > window.innerWidth - sidebarWidth) return;
  // If clicked floating card close button or UI elements, do not trigger raycaster
  if (e.target.closest('#planet-card') || e.target.closest('#sidebar-open-btn') || e.target.closest('#education-banner')) return;

  raycaster.setFromCamera(mouse, camera);
  const interactable = Object.values(planetMeshes);
  const intersects = raycaster.intersectObjects(interactable);

  if (intersects.length > 0) {
    let parentMesh = intersects[0].object;
    while (parentMesh.parent && parentMesh.parent !== planetsGroup && !parentMesh.userData.planetData) {
      parentMesh = parentMesh.parent;
    }

    if (parentMesh.userData && parentMesh.userData.planetData) {
      selectPlanet(parentMesh.userData.planetData);
      return;
    }
  }
  
  // Clicking empty space deselects planet
  selectPlanet(null);
}

function selectPlanet(planetData) {
  selectedPlanet = planetData;
  const trackBtn = document.getElementById('track-btn');
  
  if (planetData) {
    document.getElementById('selected-val').textContent = planetData.name;
    trackBtn.removeAttribute('disabled');
    
    // Fill Card Data
    document.getElementById('card-name').textContent = planetData.name;
    document.getElementById('card-surface').textContent = planetData.surfaceNote;
    document.getElementById('card-moons').textContent = planetData.moonNote;
    document.getElementById('card-fact').textContent = planetData.factNote;
    document.getElementById('card-period').textContent = planetData.orbitPeriodNote;
    document.getElementById('card-diameter').textContent = planetData.sizeNote;
    
    // Update bottom educational banner
    document.getElementById('banner-text').textContent = `Education Mode: ${planetData.name} | Orbit Period: ${planetData.orbitPeriodNote} | Diameter: ${planetData.sizeNote}`;

    // Slide in floating card
    document.getElementById('planet-card').classList.remove('hidden');
  } else {
    document.getElementById('selected-val').textContent = "None";
    trackBtn.setAttribute('disabled', 'true');
    if (cameraMode === 3) {
      setCameraMode(0); // revert tracking to angled view
    }
    
    // Revert banner text
    document.getElementById('banner-text').textContent = "Education Mode ON: default speed is realistic and the zoom range is widened so Neptune can fit in the full system view.";
    document.getElementById('planet-card').classList.add('hidden');
  }
}

// =========================================================
// UI EVENT HANDLERS
// =========================================================

function setupUI() {
  // Create circular containers for labels dynamically
  const container = document.createElement('div');
  container.id = 'labels-container';
  container.style.position = 'absolute';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '100%';
  container.style.height = '100%';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '3';
  container.style.overflow = 'hidden';
  document.body.appendChild(container);

  PLANET_CONFIGS.forEach(p => {
    const el = document.createElement('div');
    el.className = 'webgl-label';
    el.id = `label-${p.name}`;
    el.textContent = p.name;
    container.appendChild(el);
  });

  // Earth's Moon label
  const moonEl = document.createElement('div');
  moonEl.className = 'webgl-label moon-label';
  moonEl.id = 'label-Moon';
  moonEl.textContent = 'Moon';
  container.appendChild(moonEl);

  // Hover Circle overlay
  const hoverInd = document.createElement('div');
  hoverInd.id = 'hover-indicator';
  hoverInd.className = 'hidden';
  document.body.appendChild(hoverInd);

  // Play Pause
  const playBtn = document.getElementById('play-pause-btn');
  playBtn.addEventListener('click', togglePlay);

  // Reset
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', resetSimulation);

  // Speed Slider
  const speedSlider = document.getElementById('speed-slider');
  const speedSliderVal = document.getElementById('speed-slider-val');
  speedSlider.addEventListener('input', (e) => {
    simSpeed = parseFloat(e.target.value);
    speedSliderVal.textContent = `${simSpeed.toFixed(2)}x`;
    document.getElementById('speed-val').textContent = `${simSpeed.toFixed(2)}x`;
  });

  // Camera Presets
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mode = parseInt(e.target.getAttribute('data-preset'));
      setCameraMode(mode);
    });
  });

  // Toggles
  document.getElementById('toggle-labels').addEventListener('change', (e) => {
    showLabels = e.target.checked;
  });

  document.getElementById('toggle-orbits').addEventListener('change', (e) => {
    showOrbits = e.target.checked;
    // Toggle orbit line meshes visibility
    planets.forEach(p => {
      if (p.orbitLine) p.orbitLine.visible = showOrbits;
    });
  });

  document.getElementById('toggle-asteroids').addEventListener('change', (e) => {
    showAsteroids = e.target.checked;
    asteroidBelt.visible = showAsteroids;
    // Faint guide rings
    if (asteroidBelt.userData && asteroidBelt.userData.guides) {
      asteroidBelt.userData.guides.forEach(g => g.visible = showAsteroids);
    }
  });

  document.getElementById('toggle-education').addEventListener('change', (e) => {
    infoMode = e.target.checked;
    const banner = document.getElementById('education-banner');
    const extraInfo = document.querySelectorAll('.info-mode-only');
    
    if (infoMode) {
      banner.style.display = 'flex';
      extraInfo.forEach(el => el.classList.remove('hidden'));
    } else {
      banner.style.display = 'none';
      extraInfo.forEach(el => el.classList.add('hidden'));
    }
  });

  document.getElementById('toggle-cinematic').addEventListener('change', (e) => {
    cinematicMode = e.target.checked;
    document.getElementById('camera-val').textContent = cinematicMode ? "Angled + Cinematic" : getCameraName(cameraMode);
  });

  // Sidebar Toggles
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('toggle-sidebar-btn');
  const sidebarOpenBtn = document.getElementById('sidebar-open-btn');

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.add('collapsed');
    sidebarOpenBtn.classList.remove('hidden');
  });

  sidebarOpenBtn.addEventListener('click', () => {
    sidebar.classList.remove('collapsed');
    sidebarOpenBtn.classList.add('hidden');
  });

  // Floating Card Close button
  document.getElementById('close-card-btn').addEventListener('click', () => {
    selectPlanet(null);
  });

  // Keyboard Shortcuts listener
  window.addEventListener('keydown', onKeyDown);

  // Resize listener
  window.addEventListener('resize', onWindowResize);
}

function togglePlay() {
  paused = !paused;
  const btn = document.getElementById('play-pause-btn');
  const text = document.getElementById('play-pause-text');
  const status = document.getElementById('status-val');

  if (paused) {
    btn.innerHTML = '<i data-lucide="play"></i> <span id="play-pause-text">Resume</span>';
    status.textContent = "Paused";
    status.className = "status-value paused";
  } else {
    btn.innerHTML = '<i data-lucide="pause"></i> <span id="play-pause-text">Pause</span>';
    status.textContent = "Running";
    status.className = "status-value running";
  }
  lucide.createIcons();
}

function resetSimulation() {
  // Reset speed
  simSpeed = 0.25;
  document.getElementById('speed-slider').value = 0.25;
  document.getElementById('speed-slider-val').textContent = "0.25x";
  document.getElementById('speed-val').textContent = "0.25x";

  // Re-enable run
  paused = false;
  const playBtn = document.getElementById('play-pause-btn');
  playBtn.innerHTML = '<i data-lucide="pause"></i> <span id="play-pause-text">Pause</span>';
  const status = document.getElementById('status-val');
  status.textContent = "Running";
  status.className = "status-value running";

  // Reset toggles to default
  resetSwitch('toggle-labels', true);
  resetSwitch('toggle-orbits', true);
  resetSwitch('toggle-asteroids', true);
  resetSwitch('toggle-education', true);
  resetSwitch('toggle-cinematic', false);

  showLabels = true;
  showOrbits = true;
  showAsteroids = true;
  infoMode = true;
  cinematicMode = false;

  // Toggle meshes
  planets.forEach(p => { if (p.orbitLine) p.orbitLine.visible = true; });
  asteroidBelt.visible = true;
  if (asteroidBelt.userData && asteroidBelt.userData.guides) {
    asteroidBelt.userData.guides.forEach(g => g.visible = true);
  }
  document.getElementById('education-banner').style.display = 'flex';
  const extraInfo = document.querySelectorAll('.info-mode-only');
  extraInfo.forEach(el => el.classList.remove('hidden'));

  // Reset Camera presets
  setCameraMode(0);
  selectPlanet(null);

  lucide.createIcons();
}

function resetSwitch(id, state) {
  const sw = document.getElementById(id);
  if (sw) sw.checked = state;
}

function setCameraMode(mode) {
  cameraMode = mode;
  
  // Highlight active preset button
  const presetBtns = document.querySelectorAll('.preset-btn');
  presetBtns.forEach(btn => {
    const m = parseInt(btn.getAttribute('data-preset'));
    if (m === mode) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.getElementById('camera-val').textContent = cinematicMode ? "Angled + Cinematic" : getCameraName(mode);

  // Set preset positions
  if (mode === 0) {
    // Angled View
    controls.maxPolarAngle = Math.PI; // free orbit
    gsapToCamera(150, 120, 250);
  } else if (mode === 1) {
    // Top View (orthogonal look down)
    controls.maxPolarAngle = 0.05; // lock vertical axis
    gsapToCamera(0, 480, 0.1);
  } else if (mode === 2) {
    // Side View
    controls.maxPolarAngle = Math.PI / 2;
    gsapToCamera(450, 4, 0);
  } else if (mode === 3 && selectedPlanet) {
    // Track selected: Zoom camera closer to planet
    controls.maxPolarAngle = Math.PI;
    const mesh = planetMeshes[selectedPlanet.name];
    const targetPos = new THREE.Vector3();
    mesh.getWorldPosition(targetPos);

    const offsetDist = selectedPlanet.radius * 4;
    gsapToCamera(targetPos.x + offsetDist, targetPos.y + selectedPlanet.radius * 1.5, targetPos.z + offsetDist);
  }
}

// Linear camera transitions (replicates processing smooth look)
function gsapToCamera(targetX, targetY, targetZ) {
  // Simple linear interpolation over a few frames inside the animate loop or direct setting.
  // Using direct position jumps is standard, but simple smooth step logic will make it feel extremely premium!
  const startPos = camera.position.clone();
  const destPos = new THREE.Vector3(targetX, targetY, targetZ);
  let alpha = 0;

  function smoothStep() {
    alpha += 0.06;
    camera.position.lerpVectors(startPos, destPos, alpha);
    if (alpha < 1.0) {
      requestAnimationFrame(smoothStep);
    }
  }
  smoothStep();
}

function getCameraName(mode) {
  if (mode === 0) return "Angled";
  if (mode === 1) return "Top View";
  if (mode === 2) return "Side View";
  if (mode === 3) return "Track Selected";
  return "Angled";
}

function onKeyDown(e) {
  const code = e.code;

  if (code === 'Space') {
    e.preventDefault();
    togglePlay();
  }
  if (code === 'KeyR') {
    resetSimulation();
  }
  if (code === 'KeyP') {
    // reset speed
    simSpeed = 0.25;
    document.getElementById('speed-slider').value = 0.25;
    document.getElementById('speed-slider-val').textContent = "0.25x";
    document.getElementById('speed-val').textContent = "0.25x";
  }
  if (code === 'Digit1') {
    setCameraMode(0);
  }
  if (code === 'Digit2') {
    setCameraMode(1);
  }
  if (code === 'Digit3') {
    setCameraMode(2);
  }
  if (code === 'Digit4' && selectedPlanet) {
    setCameraMode(3);
  }
  if (code === 'KeyL') {
    const sw = document.getElementById('toggle-labels');
    sw.checked = !sw.checked;
    showLabels = sw.checked;
  }
  if (code === 'KeyO') {
    const sw = document.getElementById('toggle-orbits');
    sw.checked = !sw.checked;
    showOrbits = sw.checked;
    planets.forEach(p => { if (p.orbitLine) p.orbitLine.visible = showOrbits; });
  }
  if (code === 'KeyB') {
    const sw = document.getElementById('toggle-asteroids');
    sw.checked = !sw.checked;
    showAsteroids = sw.checked;
    asteroidBelt.visible = showAsteroids;
    if (asteroidBelt.userData && asteroidBelt.userData.guides) {
      asteroidBelt.userData.guides.forEach(g => g.visible = showAsteroids);
    }
  }
  if (code === 'KeyI') {
    const sw = document.getElementById('toggle-education');
    sw.checked = !sw.checked;
    infoMode = sw.checked;
    document.getElementById('education-banner').style.display = infoMode ? 'flex' : 'none';
    const extraInfo = document.querySelectorAll('.info-mode-only');
    extraInfo.forEach(el => el.classList.toggle('hidden', !infoMode));
  }
  if (code === 'KeyC') {
    const sw = document.getElementById('toggle-cinematic');
    sw.checked = !sw.checked;
    cinematicMode = sw.checked;
    document.getElementById('camera-val').textContent = cinematicMode ? "Angled + Cinematic" : getCameraName(cameraMode);
  }
  if (code === 'ArrowUp') {
    e.preventDefault();
    simSpeed = Math.min(2.0, simSpeed + 0.05);
    document.getElementById('speed-slider').value = simSpeed;
    document.getElementById('speed-slider-val').textContent = `${simSpeed.toFixed(2)}x`;
    document.getElementById('speed-val').textContent = `${simSpeed.toFixed(2)}x`;
  }
  if (code === 'ArrowDown') {
    e.preventDefault();
    simSpeed = Math.max(0.0, simSpeed - 0.05);
    document.getElementById('speed-slider').value = simSpeed;
    document.getElementById('speed-slider-val').textContent = `${simSpeed.toFixed(2)}x`;
    document.getElementById('speed-val').textContent = `${simSpeed.toFixed(2)}x`;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
