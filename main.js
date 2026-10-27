import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (selector) => document.querySelector(selector);
const container = $('#sceneContainer');
const loadingMessage = $('#loadingMessage');
const errorMessage = $('#errorMessage');
const animationButton = $('#animationButton');
const animationButtonText = $('#animationButtonText');
const restartGrowthButton = $('#restartGrowthButton');
const leafColorButton = $('#leafColorButton');
const resetCameraButton = $('#resetCameraButton');
const toggleLeavesButton = $('#toggleLeavesButton');
const toggleLeavesText = $('#toggleLeavesText');
const growthSpeed = $('#growthSpeed');
const growthSpeedValue = $('#growthSpeedValue');
const windStrength = $('#windStrength');
const windStrengthValue = $('#windStrengthValue');
const lightIntensity = $('#lightIntensity');
const lightValue = $('#lightValue');
const statusText = $('#statusText');
const statusDot = $('#statusDot');
const overallProgress = $('#overallProgress');
const progressTrack = $('#progressTrack');
const progressFill = $('#progressFill');
const stageLabel = $('#stageLabel');
const growthMessage = $('#growthMessage');
const sceneStage = $('#sceneStage');
const infoEmpty = $('#infoEmpty');
const infoDetails = $('#infoDetails');
const partName = $('#partName');
const partPlant = $('#partPlant');
const partGeometry = $('#partGeometry');
const partHeight = $('#partHeight');
const partProgress = $('#partProgress');
const partProgressFill = $('#partProgressFill');
const partDescription = $('#partDescription');
const selectionDot = document.querySelector('.selection-dot');

const leafPalette = ['#5d9e55', '#79b56b', '#3f8651', '#9cbf5f', '#4f9b85'];
let colorIndex = 0;
let animationActive = true;
let leavesVisible = true;
let simulationTime = 0;
let windTime = 0;
let previousFrameTime = performance.now();
let lastDisplayedProgress = -1;
let selectedMesh = null;
let selectedEntry = null;
let maxGrowthTime = 1;

initScene().catch((error) => {
  console.error(error);
  loadingMessage.hidden = true;
  errorMessage.hidden = false;
  errorMessage.textContent = `No se pudo iniciar el jardín botánico en crecimiento. Comprueba la conexión a internet y que el proyecto se ejecute mediante un servidor local. Detalle: ${error.message}`;
});

async function initScene() {
  const [vertexShader, fragmentShader] = await Promise.all([
    loadShader('./shaders/wind.vert'),
    loadShader('./shaders/wind.frag')
  ]);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e7eee2');
  scene.fog = new THREE.Fog('#e7eee2', 15, 33);

  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
  const initialCameraPosition = new THREE.Vector3(8.4, 7.0, 10.6);
  const initialTarget = new THREE.Vector3(0, 1.05, -0.45);
  camera.position.copy(initialCameraPosition);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('aria-label', 'Jardín botánico 3D en crecimiento. Haz clic sobre una parte visible para consultar su progreso.');
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(initialTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 4.8;
  controls.maxDistance = 19;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();

  scene.add(new THREE.HemisphereLight('#f6fff0', '#a4b69b', 1.35));
  const keyLight = new THREE.DirectionalLight('#fff4d9', Number(lightIntensity.value));
  keyLight.position.set(5, 10, 6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -8;
  keyLight.shadow.camera.right = 8;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -8;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);
  const fillLight = new THREE.PointLight('#d5e7ff', 0.55, 22);
  fillLight.position.set(-4, 4.5, -4);
  scene.add(fillLight);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#e7eee2', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;
  scene.add(ground);

  const platform = new THREE.Mesh(new THREE.CylinderGeometry(4.25, 4.35, 0.18, 96), new THREE.MeshStandardMaterial({ color: '#d7e2d1', roughness: 0.86 }));
  platform.position.y = 0.03;
  platform.receiveShadow = true;
  platform.castShadow = true;
  scene.add(platform);
  const borderRing = new THREE.Mesh(new THREE.TorusGeometry(4.18, 0.055, 12, 100), new THREE.MeshStandardMaterial({ color: '#a9bea3', roughness: 0.7 }));
  borderRing.rotation.x = Math.PI / 2;
  borderRing.position.y = 0.13;
  scene.add(borderRing);

  const stoneMaterial = new THREE.MeshStandardMaterial({ color: '#bdc9b6', roughness: 1 });
  [[-3.15, .17, -1.1, .13], [-3.15, .17, 1.2, .10], [3.18, .17, -1.25, .11], [3.15, .17, 1.25, .14], [-.75, .17, -3.55, .12], [.85, .17, -3.56, .10], [-.75, .17, 3.35, .11], [.85, .17, 3.36, .09]].forEach(([x, y, z, size]) => {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), stoneMaterial);
    stone.position.set(x, y, z);
    stone.rotation.set(.2, x * .4, z * .2);
    stone.castShadow = true;
    stone.receiveShadow = true;
    scene.add(stone);
  });

  const selectableMeshes = [];
  const growthEntries = [];
  const leafMeshes = [];
  const leafMaterials = [];
  const animatedPlants = [];
  const flowerGroups = [];
  let currentPlant = null;

  const potMaterial = new THREE.MeshStandardMaterial({ color: '#bd7959', roughness: .82 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: '#d3906d', roughness: .75 });
  const soilMaterial = new THREE.MeshStandardMaterial({ color: '#584333', roughness: 1 });

  function registerStatic(mesh, plantName, name, geometry, description, category = 'static') {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.partInfo = { plantName, name, geometry, description, category };
    selectableMeshes.push(mesh);
    return mesh;
  }

  function growthSchedule(category, startY, plant) {
    const offset = plant.growthDelay || 0;
    if (category === 'stem') return { start: offset + Math.max(0, startY) * .08, duration: 1.5 };
    if (category === 'branch') return { start: offset + .72 + Math.max(0, startY) * .23, duration: .9 };
    if (category === 'leaf') return { start: offset + 1.48 + Math.max(0, startY) * .22, duration: .72 };
    if (category === 'spine') return { start: offset + 1.45 + Math.max(0, startY) * .1, duration: .45 };
    if (category === 'flower') return { start: offset + 2.6 + Math.max(0, startY) * .08, duration: .78 };
    return { start: offset, duration: 1 };
  }

  function registerGrowable(mesh, plant, info, category, segment = null) {
    const startY = segment ? segment.start.y : mesh.position.y;
    const timing = growthSchedule(category, startY, plant);
    const entry = {
      mesh, plantName: plant.name, name: info.name, geometry: info.geometry,
      description: info.description, category, start: timing.start, duration: timing.duration,
      baseScale: mesh.scale.clone(), progress: 0, segment
    };
    mesh.userData.partInfo = { ...info, plantName: plant.name, category };
    mesh.userData.growthEntry = entry;
    mesh.visible = false;
    selectableMeshes.push(mesh);
    growthEntries.push(entry);
    return mesh;
  }

  function addPart(parent, plant, geometry, material, position, info, scale = null, rotation = null, category = null) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position.x, position.y, position.z);
    if (scale) mesh.scale.set(scale.x, scale.y, scale.z);
    if (rotation) mesh.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    parent.add(mesh);
    const actualCategory = category || info.category;
    if (actualCategory && ['stem', 'branch', 'leaf', 'spine', 'flower'].includes(actualCategory)) registerGrowable(mesh, plant, info, actualCategory);
    else registerStatic(mesh, plant.name, info.name, info.geometry, info.description, actualCategory || 'static');
    return mesh;
  }

  function addSegment(parent, plant, start, end, radius, material, info, category = 'branch') {
    const startPoint = new THREE.Vector3(start.x, start.y, start.z);
    const endPoint = new THREE.Vector3(end.x, end.y, end.z);
    const direction = new THREE.Vector3().subVectors(endPoint, startPoint);
    const length = direction.length();
    const axis = direction.clone().normalize();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .72, radius, length, 12), material);
    mesh.position.copy(startPoint).add(endPoint).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    registerGrowable(mesh, plant, info, category, { start: startPoint, axis, length });
    return mesh;
  }

  function createLeaf(parent, plant, position, scale, rotation, label = 'Hoja', delayOffset = 0, description = 'Capta la luz para realizar la fotosíntesis y contribuir a la producción de azúcares.') {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWindStrength: { value: Number(windStrength.value) },
        uLeafColor: { value: new THREE.Color(plant.leafColor) },
        uPhase: { value: (plant.phase || 0) + position.x * 2.1 + position.z * 1.3 }
      },
      vertexShader, fragmentShader, side: THREE.DoubleSide
    });
    leafMaterials.push(material);
    const leaf = addPart(parent, plant, new THREE.SphereGeometry(1, 20, 14), material, position,
      { name: label, geometry: 'Esfera escalada', description, category: 'leaf' }, scale, rotation, 'leaf');
    leaf.userData.growthEntry.start += delayOffset;
    leafMeshes.push(leaf);
    return leaf;
  }

  function createFlower(parent, plant, position, petals = 7, size = 1, color = plant.flowerColor) {
    const flower = new THREE.Group();
    flower.name = `Flor de ${plant.name}`;
    flower.position.set(position.x, position.y, position.z);
    parent.add(flower);
    flowerGroups.push({ group: flower, phase: plant.phase || 0, speed: plant.speed || .8 });
    const petalMaterial = new THREE.MeshStandardMaterial({ color, roughness: .65, side: THREE.DoubleSide });
    const centerMaterial = new THREE.MeshStandardMaterial({ color: plant.centerColor || '#7d5730', roughness: .9 });
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      addPart(flower, plant, new THREE.SphereGeometry(1, 16, 12), petalMaterial,
        { x: Math.cos(angle) * .16 * size, y: .015 * size, z: Math.sin(angle) * .16 * size },
        { name: `Pétalo ${i + 1}`, geometry: 'Esfera escalada', description: 'El color y la forma de los pétalos ayudan a atraer polinizadores.', category: 'flower' },
        { x: .085 * size, y: .15 * size, z: .06 * size }, { x: 0, y: -angle, z: Math.cos(angle) * .24 }, 'flower');
    }
    addPart(flower, plant, new THREE.SphereGeometry(.105 * size, 18, 14), centerMaterial,
      { x: 0, y: .035 * size, z: 0 },
      { name: 'Centro de la flor', geometry: 'Esfera', description: 'Representa el centro floral, donde se encuentran las estructuras reproductivas.', category: 'flower' }, null, null, 'flower');
    return flower;
  }

  function createPot(root, plant) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.49, .35, .52, 36, 1, true), potMaterial);
    body.position.y = .27;
    root.add(body);
    registerStatic(body, plant.name, 'Maceta', 'Cilindro abierto', 'Contiene el sustrato y sostiene la planta.');
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(.355, 36), potMaterial);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = .012;
    root.add(bottom);
    registerStatic(bottom, plant.name, 'Base de la maceta', 'Círculo plano', 'Representa la base del recipiente.');
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.475, .045, 10, 40), rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = .535;
    root.add(rim);
    registerStatic(rim, plant.name, 'Borde de la maceta', 'Toroide', 'Representa el grosor de la abertura de la maceta.');
    const soil = new THREE.Mesh(new THREE.CircleGeometry(.455, 36), soilMaterial);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = .526;
    root.add(soil);
    registerStatic(soil, plant.name, 'Sustrato', 'Círculo plano', 'Representa la tierra donde las raíces obtienen agua, aire y nutrientes.');
  }

  function buildSunflower(plant, parts) {
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#4e7d43', roughness: .8 });
    const branchMaterial = new THREE.MeshStandardMaterial({ color: '#5e8c4b', roughness: .8 });
    addSegment(parts, plant, { x: 0, y: 0, z: 0 }, { x: 0, y: 1.68, z: 0 }, .075, stemMaterial,
      { name: 'Tallo principal', geometry: 'Cilindro', description: 'Sostiene hojas y flor, y transporta agua, minerales y azúcares.' }, 'stem');
    const levels = [
      { y: .32, side: -1, dz: .05, length: .46 }, { y: .56, side: 1, dz: -.07, length: .49 },
      { y: .8, side: -1, dz: -.04, length: .45 }, { y: 1.03, side: 1, dz: .06, length: .42 },
      { y: 1.27, side: -1, dz: .03, length: .38 }
    ];
    levels.forEach((level, index) => {
      const pivot = new THREE.Group();
      pivot.position.set(0, level.y, 0);
      parts.add(pivot);
      pivot.userData.windPhase = index * .9 + plant.phase;
      animatedPlants.push({ group: pivot, speed: plant.speed, phase: index * .9 + plant.phase, amplitude: .055 });
      const end = { x: level.side * level.length, y: .2, z: level.dz };
      addSegment(pivot, plant, { x: 0, y: 0, z: 0 }, end, .034, branchMaterial,
        { name: `Rama ${index + 1}`, geometry: 'Cilindro', description: 'Extiende el tallo y distribuye las hojas para que reciban luz.' }, 'branch');
      createLeaf(pivot, plant, { x: end.x + level.side * .1, y: end.y + .05, z: end.z }, { x: .25, y: .09, z: .14 }, { x: 0, y: level.side * -.2, z: level.side * -.25 }, `Hoja ${index * 2 + 1}`, .06);
      createLeaf(pivot, plant, { x: end.x - level.side * .04, y: end.y + .24, z: end.z }, { x: .24, y: .085, z: .13 }, { x: 0, y: level.side * .15, z: level.side * .3 }, `Hoja ${index * 2 + 2}`, .23);
    });
    createLeaf(parts, plant, { x: -.18, y: 1.42, z: .04 }, { x: .24, y: .085, z: .13 }, { x: 0, y: -.35, z: -.2 }, 'Hoja superior');
    createFlower(parts, plant, { x: 0, y: 1.7, z: 0 }, 10, 1.2, plant.flowerColor);
  }

  function buildFern(plant, parts) {
    const frondMaterial = new THREE.MeshStandardMaterial({ color: '#386b40', roughness: .85 });
    for (let frond = 0; frond < 5; frond++) {
      const angle = (frond / 5) * Math.PI * 2;
      const dx = Math.cos(angle), dz = Math.sin(angle);
      const endpoint = { x: dx * .62, y: .99 + (frond % 2) * .07, z: dz * .62 };
      addSegment(parts, plant, { x: 0, y: .03, z: 0 }, endpoint, .025, frondMaterial,
        { name: `Fronda ${frond + 1}`, geometry: 'Cilindro', description: 'Sostiene los foliolos del helecho y los expone a la luz.' }, 'branch');
      for (let leaflet = 1; leaflet <= 4; leaflet++) {
        const t = leaflet / 5;
        const center = { x: dx * .62 * t, y: .06 + .88 * t, z: dz * .62 * t };
        const sideX = -dz * .17, sideZ = dx * .17;
        const size = .17 - t * .035;
        createLeaf(parts, plant, { x: center.x + sideX, y: center.y, z: center.z + sideZ }, { x: size, y: .042, z: size * .56 }, { x: 0, y: angle, z: .32 }, `Foliolo ${frond + 1}.${leaflet}`);
        createLeaf(parts, plant, { x: center.x - sideX, y: center.y, z: center.z - sideZ }, { x: size, y: .042, z: size * .56 }, { x: 0, y: angle, z: -.32 }, `Foliolo ${frond + 1}.${leaflet}b`, .08);
      }
    }
  }

  function buildCactus(plant, parts) {
    const green = new THREE.MeshStandardMaterial({ color: '#43845a', roughness: .72 });
    const pale = new THREE.MeshStandardMaterial({ color: '#f1ead6', roughness: .65 });
    addSegment(parts, plant, { x: 0, y: 0, z: 0 }, { x: 0, y: 1.35, z: 0 }, .205, green,
      { name: 'Tallo suculento principal', geometry: 'Cilindro', description: 'Almacena agua y realiza la fotosíntesis, con adaptaciones a ambientes secos.' }, 'stem');
    addSegment(parts, plant, { x: 0, y: .46, z: 0 }, { x: -.32, y: .54, z: 0 }, .10, green,
      { name: 'Brazo izquierdo', geometry: 'Cilindro', description: 'Ramificación que amplía la superficie verde del cactus.' }, 'branch');
    addSegment(parts, plant, { x: -.32, y: .54, z: 0 }, { x: -.32, y: .91, z: 0 }, .09, green,
      { name: 'Brazo izquierdo vertical', geometry: 'Cilindro', description: 'Crecimiento lateral que almacena agua y realiza fotosíntesis.' }, 'branch');
    addSegment(parts, plant, { x: .04, y: .68, z: 0 }, { x: .3, y: .77, z: 0 }, .09, green,
      { name: 'Brazo derecho', geometry: 'Cilindro', description: 'Ramificación del cactus con tejido verde adaptado a ambientes secos.' }, 'branch');
    addSegment(parts, plant, { x: .3, y: .77, z: 0 }, { x: .3, y: 1.04, z: 0 }, .08, green,
      { name: 'Extremo del brazo derecho', geometry: 'Cilindro', description: 'Parte joven de una ramificación del cactus.' }, 'branch');
    for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2 + (row % 2) * .2;
      const spike = addPart(parts, plant, new THREE.ConeGeometry(.014, .075, 5), pale,
        { x: Math.cos(angle) * .205, y: .2 + row * .22, z: Math.sin(angle) * .205 },
        { name: 'Espina', geometry: 'Cono', description: 'Ayuda a proteger al cactus y puede crear sombra sobre su superficie.', category: 'spine' },
        null, { x: Math.sin(angle) * .15, y: 0, z: -Math.cos(angle) * .15 }, 'spine');
      spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(angle), .12, Math.sin(angle)).normalize());
    }
    createFlower(parts, plant, { x: .015, y: 1.39, z: 0 }, 6, .62, plant.flowerColor);
  }

  function buildTropical(plant, parts) {
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#5b8048', roughness: .8 });
    const stalks = [
      { x: -.19, z: .03, h: 1.24, side: -1 }, { x: .1, z: .02, h: 1.42, side: 1 }, { x: .02, z: -.12, h: 1.08, side: 1 }
    ];
    stalks.forEach((s, i) => {
      addSegment(parts, plant, { x: s.x * .35, y: .02, z: s.z }, { x: s.x, y: s.h, z: s.z }, .032, stemMaterial,
        { name: `Peciolo ${i + 1}`, geometry: 'Cilindro', description: 'Conecta la hoja con la base y la orienta hacia la luz.' }, 'stem');
      [-1, 1].forEach((side, j) => createLeaf(parts, plant,
        { x: s.x + side * (.22 + i * .025), y: s.h - .07 - j * .13, z: s.z + (j ? -.07 : .08) },
        { x: .34, y: .075, z: .19 }, { x: 0, y: side * .18, z: side * -.28 }, `Hoja tropical ${i * 2 + j + 1}`));
    });
    createLeaf(parts, plant, { x: -.16, y: .62, z: .12 }, { x: .31, y: .075, z: .18 }, { x: 0, y: -.3, z: -.42 }, 'Hoja basal');
  }

  function buildRose(plant, parts) {
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#477844', roughness: .8 });
    const branchMaterial = new THREE.MeshStandardMaterial({ color: '#58884a', roughness: .78 });
    addSegment(parts, plant, { x: 0, y: 0, z: 0 }, { x: .02, y: 1.34, z: 0 }, .045, stemMaterial,
      { name: 'Tallo de la rosa', geometry: 'Cilindro', description: 'Sostiene la flor y las hojas, y transporta agua y nutrientes.' }, 'stem');
    [.32, .58, .83, 1.02].forEach((y, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      const start = { x: .02, y, z: 0 };
      const end = { x: .02 + side * .27, y: y + .11, z: side * .035 };
      addSegment(parts, plant, start, end, .025, branchMaterial,
        { name: `Rama lateral ${i + 1}`, geometry: 'Cilindro', description: 'Sostiene hojas para captar luz y contribuir al crecimiento.' }, 'branch');
      createLeaf(parts, plant, { x: end.x + side * .1, y: end.y + .03, z: end.z }, { x: .18, y: .055, z: .095 }, { x: 0, y: side * .25, z: side * -.25 }, `Hoja de rosa ${i + 1}`);
    });
    createFlower(parts, plant, { x: .02, y: 1.36, z: 0 }, 9, 1, plant.flowerColor);
  }

  function buildLavender(plant, parts) {
    const stemMaterial = new THREE.MeshStandardMaterial({ color: '#4e7c45', roughness: .8 });
    const budMaterial = new THREE.MeshStandardMaterial({ color: plant.flowerColor, roughness: .72 });
    const stems = [{ x: -.16, z: -.02, h: 1.1 }, { x: 0, z: .03, h: 1.3 }, { x: .16, z: -.01, h: 1.15 }, { x: -.06, z: .12, h: .96 }];
    stems.forEach((s, i) => {
      addSegment(parts, plant, { x: 0, y: .02, z: s.z }, { x: s.x, y: s.h, z: s.z }, .018, stemMaterial,
        { name: `Tallo floral ${i + 1}`, geometry: 'Cilindro', description: 'Eleva las pequeñas flores y transporta agua y nutrientes.' }, 'stem');
      for (let k = 0; k < 3; k++) {
        const y = .26 + k * .19, side = k % 2 === 0 ? -1 : 1;
        createLeaf(parts, plant, { x: s.x * (y / s.h) + side * .1, y, z: s.z }, { x: .14, y: .032, z: .05 }, { x: 0, y: 0, z: side * -.32 }, `Hoja estrecha ${i + 1}.${k + 1}`);
      }
      for (let b = 0; b < 5; b++) {
        const angle = b / 5 * Math.PI * 2;
        addPart(parts, plant, new THREE.SphereGeometry(.055, 12, 10), budMaterial,
          { x: s.x + Math.cos(angle) * .065, y: s.h - .07 - (b % 2) * .075, z: s.z + Math.sin(angle) * .065 },
          { name: 'Flor pequeña de lavanda', geometry: 'Esfera', description: 'Atrae polinizadores y participa en la reproducción de la planta.', category: 'flower' },
          { x: .72, y: 1.18, z: .72 }, null, 'flower');
      }
    });
  }

  const plants = [
    { name: 'Girasol ornamental', type: 'sunflower', position: [0, 0, .15], scale: 1, leafColor: '#4f914b', flowerColor: '#f0bf43', centerColor: '#6e4c2c', speed: .82, phase: 0 },
    { name: 'Helecho', type: 'fern', position: [-2.05, 0, .25], scale: .78, leafColor: '#3f8651', flowerColor: '#8eaf78', speed: .68, phase: 1 },
    { name: 'Cactus de jardín', type: 'cactus', position: [2.05, 0, .3], scale: .83, leafColor: '#548f60', flowerColor: '#e9a0b1', centerColor: '#f0d4b0', speed: .4, phase: 2.1 },
    { name: 'Planta tropical', type: 'tropical', position: [-1.55, 0, -1.72], scale: .83, leafColor: '#4b956d', flowerColor: '#bca0cf', speed: .74, phase: .8 },
    { name: 'Rosa de jardín', type: 'rose', position: [1.55, 0, -1.72], scale: .82, leafColor: '#4f8a50', flowerColor: '#df6682', centerColor: '#f7d1a9', speed: .93, phase: 1.6 },
    { name: 'Lavanda', type: 'lavender', position: [0, 0, -2.88], scale: .68, leafColor: '#628b50', flowerColor: '#9b83c8', speed: .62, phase: 2.5 }
  ];

  function createPlant(plant, index) {
    const root = new THREE.Group();
    root.name = plant.name;
    root.position.set(plant.position[0], .12, plant.position[2]);
    root.scale.setScalar(plant.scale);
    scene.add(root);
    createPot(root, plant);

    const parts = new THREE.Group();
    parts.name = `${plant.name} - partes vegetales`;
    parts.position.y = .525;
    root.add(parts);
    animatedPlants.push({ group: parts, speed: plant.speed, phase: plant.phase, amplitude: plant.type === 'cactus' ? .004 : .016 });
    const plantConfig = { ...plant, growthDelay: index * .18 };
    if (plant.type === 'sunflower') buildSunflower(plantConfig, parts);
    if (plant.type === 'fern') buildFern(plantConfig, parts);
    if (plant.type === 'cactus') buildCactus(plantConfig, parts);
    if (plant.type === 'tropical') buildTropical(plantConfig, parts);
    if (plant.type === 'rose') buildRose(plantConfig, parts);
    if (plant.type === 'lavender') buildLavender(plantConfig, parts);
    return plantConfig;
  }

  plants.forEach(createPlant);
  maxGrowthTime = Math.max(1, ...growthEntries.map((entry) => entry.start + entry.duration));

  function updateGrowth() {
    for (const entry of growthEntries) {
      const raw = THREE.MathUtils.clamp((simulationTime - entry.start) / entry.duration, 0, 1);
      entry.progress = raw <= 0 ? 0 : 1 - Math.pow(1 - raw, 3);
      if (entry.segment) {
        entry.mesh.scale.set(entry.baseScale.x, entry.baseScale.y * entry.progress, entry.baseScale.z);
        entry.mesh.position.copy(entry.segment.start).addScaledVector(entry.segment.axis, entry.segment.length * entry.progress / 2);
      } else {
        entry.mesh.scale.copy(entry.baseScale).multiplyScalar(entry.progress);
      }
      entry.mesh.visible = entry.progress > .008 && (entry.category !== 'leaf' || leavesVisible);
    }
  }

  function stageFromProgress(progress) {
    if (progress < .08) return { short: 'Brote inicial', overlay: 'BROTE INICIAL', message: 'Las primeras estructuras comienzan a crecer desde la base.' };
    if (progress < .27) return { short: 'Tallos en desarrollo', overlay: 'TALLOS EN DESARROLLO', message: 'Los tallos se alargan y preparan el soporte para las ramas.' };
    if (progress < .52) return { short: 'Ramas en desarrollo', overlay: 'RAMAS EN DESARROLLO', message: 'Las ramas laterales crecen y se extienden hacia la luz.' };
    if (progress < .82) return { short: 'Aparición de hojas', overlay: 'APARICIÓN DE HOJAS', message: 'Las hojas se despliegan progresivamente y comienzan a balancearse.' };
    if (progress < .99) return { short: 'Formación floral', overlay: 'FORMACIÓN FLORAL', message: 'Las flores aparecen al final del desarrollo de las plantas.' };
    return { short: 'Jardín desarrollado', overlay: 'JARDÍN DESARROLLADO', message: 'El jardín completó su crecimiento. Ajusta el viento para observar el movimiento de las plantas.' };
  }

  function updateOverallProgress(force = false) {
    const average = growthEntries.length ? growthEntries.reduce((sum, entry) => sum + entry.progress, 0) / growthEntries.length : 0;
    const percent = Math.round(THREE.MathUtils.clamp(average, 0, 1) * 100);
    if (force || percent !== lastDisplayedProgress) {
      overallProgress.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;
      progressTrack.setAttribute('aria-valuenow', String(percent));
      const stage = stageFromProgress(percent / 100);
      stageLabel.textContent = stage.short;
      sceneStage.textContent = `ETAPA: ${stage.overlay}`;
      growthMessage.textContent = stage.message;
      lastDisplayedProgress = percent;
    }
  }

  function updatePartPanel() {
    if (!selectedMesh) return;
    if (!selectedEntry) {
      partProgress.textContent = 'Estática';
      partProgressFill.style.width = '100%';
      return;
    }
    const percent = Math.round(selectedEntry.progress * 100);
    partProgress.textContent = `${percent}%`;
    partProgressFill.style.width = `${percent}%`;
  }

  function showPartInfo(mesh) {
    selectedMesh = mesh;
    selectedEntry = mesh.userData.growthEntry || null;
    const info = mesh.userData.partInfo || {};
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    partName.textContent = info.name || 'Parte vegetal';
    partPlant.textContent = info.plantName || 'Jardín botánico';
    partGeometry.textContent = info.geometry || 'Geometría 3D';
    partHeight.textContent = `${Math.max(0, worldPosition.y - .12).toFixed(2)} u.`;
    partDescription.textContent = info.description || 'Parte del modelo tridimensional de una planta.';
    infoEmpty.hidden = true;
    infoDetails.hidden = false;
    selectionDot.style.background = '#69ac70';
    selectionDot.style.boxShadow = '0 0 0 4px #69ac7020';
    updatePartPanel();
  }

  function resetSelection() {
    selectedMesh = null;
    selectedEntry = null;
    infoEmpty.hidden = false;
    infoDetails.hidden = true;
    selectionDot.style.background = '#e3e9e1';
    selectionDot.style.boxShadow = 'none';
  }

  function resetGrowth() {
    simulationTime = 0;
    updateGrowth();
    updateOverallProgress(true);
    updatePartPanel();
  }

  animationButton.addEventListener('click', () => {
    animationActive = !animationActive;
    animationButtonText.textContent = animationActive ? 'Pausar animación' : 'Reanudar animación';
    animationButton.querySelector('.button-symbol').textContent = animationActive ? 'Ⅱ' : '▶';
    animationButton.setAttribute('aria-pressed', String(!animationActive));
    statusText.textContent = animationActive ? 'Simulación activa' : 'Simulación pausada';
    statusDot.classList.toggle('paused', !animationActive);
  });
  restartGrowthButton.addEventListener('click', resetGrowth);
  leafColorButton.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % leafPalette.length;
    const color = new THREE.Color(leafPalette[colorIndex]);
    leafMaterials.forEach((material) => material.uniforms.uLeafColor.value.copy(color));
  });
  resetCameraButton.addEventListener('click', () => {
    camera.position.copy(initialCameraPosition);
    controls.target.copy(initialTarget);
    controls.update();
    resetSelection();
  });
  toggleLeavesButton.addEventListener('click', () => {
    leavesVisible = !leavesVisible;
    leafMeshes.forEach((mesh) => { mesh.visible = leavesVisible && mesh.userData.growthEntry.progress > .008; });
    toggleLeavesButton.setAttribute('aria-pressed', String(leavesVisible));
    toggleLeavesText.textContent = leavesVisible ? 'Ocultar hojas' : 'Mostrar hojas';
    if (!leavesVisible && selectedEntry?.category === 'leaf') resetSelection();
  });
  growthSpeed.addEventListener('input', () => { growthSpeedValue.textContent = `${Number(growthSpeed.value).toFixed(1)}×`; });
  windStrength.addEventListener('input', () => {
    const value = Number(windStrength.value);
    windStrengthValue.textContent = value.toFixed(2);
    leafMaterials.forEach((material) => { material.uniforms.uWindStrength.value = value; });
  });
  lightIntensity.addEventListener('input', () => {
    const value = Number(lightIntensity.value);
    keyLight.intensity = value;
    lightValue.textContent = value.toFixed(1);
    lightValue.value = value.toFixed(1);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;
  renderer.domElement.addEventListener('pointerdown', (event) => {
    if (event.button === 0) pointerStart = { x: event.clientX, y: event.clientY };
  });
  renderer.domElement.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (distance > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const visible = selectableMeshes.filter((mesh) => mesh.visible && isVisible(mesh));
    const intersections = raycaster.intersectObjects(visible, false);
    if (intersections.length) showPartInfo(intersections[0].object);
  });
  function isVisible(object) {
    let current = object;
    while (current && current !== scene) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  }

  function resizeRenderer() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  window.addEventListener('resize', resizeRenderer);
  if ('ResizeObserver' in window) new ResizeObserver(resizeRenderer).observe(container);
  resizeRenderer();
  updateGrowth();
  updateOverallProgress(true);
  loadingMessage.hidden = true;

  function animate(now) {
    requestAnimationFrame(animate);
    const delta = Math.min(Math.max(0, (now - previousFrameTime) / 1000), .05);
    previousFrameTime = now;
    if (animationActive) {
      simulationTime += delta * Number(growthSpeed.value);
      windTime += delta;
    }
    updateGrowth();
    updateOverallProgress();
    const wind = Number(windStrength.value);
    if (animationActive) {
      animatedPlants.forEach((item) => {
        item.group.rotation.z = Math.sin(windTime * item.speed + item.phase) * item.amplitude * wind;
        item.group.rotation.x = Math.cos(windTime * item.speed * .72 + item.phase) * item.amplitude * wind * .42;
      });
      flowerGroups.forEach((item) => {
        item.group.rotation.y = Math.sin(windTime * .65 * item.speed + item.phase) * .11 * wind;
      });
    }
    leafMaterials.forEach((material) => {
      material.uniforms.uTime.value = windTime;
      material.uniforms.uWindStrength.value = wind;
    });
    if (selectedEntry) updatePartPanel();
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(animate);
}

async function loadShader(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`No se pudo cargar ${path} (HTTP ${response.status}).`);
  return response.text();
}
