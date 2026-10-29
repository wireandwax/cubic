
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ------------------------------------
// 1. SETUP
// ------------------------------------

//SCENE
const sceneElement = document.querySelector('#scene');
const scene = new THREE.Scene();

// Dark studio background gradient
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 512;
bgCanvas.height = 512;

const bgContext = bgCanvas.getContext('2d');

const gradient = bgContext.createRadialGradient(
  256, 220, 20,
  256, 256, 360
);

gradient.addColorStop(0, '#30343b');
gradient.addColorStop(0.35, '#191c22');
gradient.addColorStop(0.72, '#090b0e');
gradient.addColorStop(1, '#050607');

bgContext.fillStyle = gradient;
bgContext.fillRect(0, 0, 512, 512);

const bgTexture = new THREE.CanvasTexture(bgCanvas);
bgTexture.colorSpace = THREE.SRGBColorSpace;

scene.background = bgTexture;


 // ------------------------------------
 //  SPHERE DOTS BG
 // ------------------------------------

const dotSphere = new THREE.Group();
const dotCount = 400;
const sphereRadius = 28;

const dotPositions = [];
const dotColours = [];

const dotPalette = [
  new THREE.Color('#ffffff'),

];

for (let i = 0; i < dotCount; i++) {
  // Even distribution across a spherical surface
  const y = 1 - (i / (dotCount - 1)) * 2;
  const ringRadius = Math.sqrt(1 - y * y);
  const angle = i * Math.PI * (3 - Math.sqrt(5));

  const x = Math.cos(angle) * ringRadius;
  const z = Math.sin(angle) * ringRadius;

  dotPositions.push(
    x * sphereRadius,
    y * sphereRadius,
    z * sphereRadius
  );

  // Mostly cool technical colours, with rare cube-colour accents
  const colourIndex = Math.random() < 0.88
    ? Math.floor(Math.random() * 3)
    : 3 + Math.floor(Math.random() * 2);

  const colour = dotPalette[0].clone();

  // Vary brightness across the field
  colour.multiplyScalar(0.35 + Math.random() * 0.8);

  dotColours.push(colour.r, colour.g, colour.b);
}

const dotGeometry = new THREE.BufferGeometry();

dotGeometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(dotPositions, 3)
);

dotGeometry.setAttribute(
  'color',
  new THREE.Float32BufferAttribute(dotColours, 3)
);


const dotMaterial = new THREE.PointsMaterial({
  size: 0.3,
  vertexColors: true,
  transparent: true,
  opacity: 0.03,
  sizeAttenuation: true,
  depthWrite: false
});

const dotPoints = new THREE.Points(dotGeometry, dotMaterial);
dotSphere.add(dotPoints);
scene.add(dotSphere);




//CAMS
const camera = new THREE.PerspectiveCamera(
  45,
  sceneElement.clientWidth / sceneElement.clientHeight,
  0.1,
  1000
);

camera.position.set(7, 6, 8);

//RENDERER
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(sceneElement.clientWidth, sceneElement.clientHeight);
sceneElement.appendChild(renderer.domElement);

//CONTROLS
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);


// ------------------------------------
// BLOOM POST-PROCESSING
// ------------------------------------

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(
    sceneElement.clientWidth,
    sceneElement.clientHeight
  ),
  0.35, // Strength
  0.4,  // Radius
  0.45  // Threshold
);

composer.addPass(bloomPass);
// Lighting
/*scene.add(new THREE.AmbientLight(0xffffff, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 8, 6);
scene.add(light);
*/

scene.add(new THREE.AmbientLight(0xffffff, 1));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 8, 6);
scene.add(light);

// Central light
const centreLight = new THREE.PointLight(0xffffff,0, 8);
centreLight.position.set(0, 0, 0);
scene.add(centreLight);


// ------------------------------------
// 2. CUBE SEQUENCER
// ------------------------------------

const gridSize = 4;
const spacing = 1.15;
const cubeSize = 1;


const faceColours = {
  front:  '#b7ff3c',
  back:   '#45e6e6',
  right:  '#ff78db',
  left:   '#ac63ff',
  top:    '#ffa323',
  bottom: '#5b9dff'
};


const faceVoices = {
  front:  0, // Kick
  back:   1, // Snare
  right:  2, // Hi-hat
  left:   3, // Synth
  top:    4, // Hi Click
  bottom: 5  // Low Tom
};

const notes = [261.63, 293.66, 329.63, 392.00];

const cubelets = [];
const faceMeshes = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


const voiceLabels = [
{ text: 'KICK',       x: -1.75, y: -2.45, z:  2.35, rotationY: 0,rotationX:0, rotationZ:0},
  { text: 'SNARE',      x:  1.75, y: -2.45, z: -2.25, rotationY: Math.PI, rotationX:0, rotationZ:0 },
  { text: 'HI-HAT',     x:  2.25, y: -2.45, z:  1.75, rotationY: Math.PI / 2,rotationX:0, rotationZ:0 },
  { text: 'SYNTH',      x: -2.35, y: -2.45, z: -1.75, rotationY: -Math.PI / 2,rotationX:0, rotationZ:0 },
  { text: 'HIGH CLICK', x: 2.45, y: 2.25, z: 1.75, rotationY: 0, rotationX: -Math.PI / 2, rotationZ: Math.PI/2 },
{ text: 'LOW TOM', x: 2.45, y: -2.35, z: -1.75, rotationY: 0, rotationX: Math.PI / 2, rotationZ: Math.PI / 2 }
];

const labelMaterial = new THREE.MeshBasicMaterial({
  color: '#b8c3ce',
  transparent: true,
  side: THREE.DoubleSide
});

function createVoiceLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.font = '70px Arial';
  context.fillStyle = '#b8c3ce';
  context.textBaseline = 'middle';
  context.fillText(text, 12, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = labelMaterial.clone();
  material.map = texture;

  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.225),
    material
  );
}


function createFaceNumber(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.font = '50px Arial';
  context.fillStyle = '#b8c3ce';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(String(number), 8, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.22),
    material
  );
}


function fadeLayerNumbers(layer, targetOpacity, duration = 120) {
  const layerSet = new Set(layer);

  const labels = [];

  scene.traverse(object => {
    if (
      object.userData.cubelet &&
      layerSet.has(object.userData.cubelet) &&
      object.userData.displayedNumber !== undefined
    ) {
      labels.push(object);
    }
  });

  const startOpacities = labels.map(
    label => label.material.opacity
  );

  const startTime = performance.now();

  return new Promise(resolve => {
    function animateFade(now) {
      const progress = Math.min(
        (now - startTime) / duration,
        1
      );

      const eased = progress * progress * (3 - 2 * progress);

      labels.forEach((label, index) => {
        label.material.opacity =
          startOpacities[index] +
          (targetOpacity - startOpacities[index]) * eased;
      });

      if (progress < 1) {
        requestAnimationFrame(animateFade);
      } else {
        labels.forEach(label => {
          label.material.opacity = targetOpacity;
        });

        resolve();
      }
    }

    requestAnimationFrame(animateFade);
  });
}

function updateFaceNumber(numberLabel, number) {
  if (numberLabel.userData.displayedNumber === number) return;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.font = '50px Arial';
  context.fillStyle = '#b8c3ce';
  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillText(String(number), 8, 8);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = numberLabel.material;
  const oldTexture = material.map;

  material.map = texture;
  material.needsUpdate = true;

  if (oldTexture) oldTexture.dispose();

  numberLabel.userData.displayedNumber = number;
}



const geometry = new THREE.BoxGeometry(
  cubeSize,
  cubeSize,
  cubeSize
);


for (let x = 0; x < gridSize; x++) {
  for (let y = 0; y < gridSize; y++) {
    for (let z = 0; z < gridSize; z++) {

      const material = new THREE.MeshStandardMaterial({
        color: '#202830',
        roughness: 0.55,
        metalness: 0.15
      });

      const cubelet = new THREE.Mesh(geometry, material);

cubelet.userData.x = x;
cubelet.userData.y = y;
cubelet.userData.z = z;
cubelet.userData.active = false;

      cubelet.position.set(
        (x - 1.5) * spacing,
        (y - 1.5) * spacing,
        (z - 1.5) * spacing
      );

      // Fine outlines around each cubelet
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: '#46515e' })
      );

// Face highlights on all four vertical sides
const faceMaterial = new THREE.MeshBasicMaterial({
  color: '#202830',
  side: THREE.DoubleSide
});

const faceGeometry = new THREE.PlaneGeometry(cubeSize, cubeSize);

const facePositions = [
  {
    name: 'front',
    x: 0, y: 0, z: cubeSize / 2 + 0.002,
    rotation: 0
  },
  {
    name: 'back',
    x: 0, y: 0, z: -cubeSize / 2 - 0.002,
    rotation: 0
  },
  {
    name: 'right',
    x: cubeSize / 2 + 0.002, y: 0, z: 0,
    rotation: Math.PI / 2
  },
  {
    name: 'left',
    x: -cubeSize / 2 - 0.002, y: 0, z: 0,
    rotation: Math.PI / 2
  },
  {
    name: 'top',
    x: 0, y: cubeSize / 2 + 0.002, z: 0,
    rotationX: -Math.PI / 2,
    rotation: 0
  },
  {
    name: 'bottom',
    x: 0, y: -cubeSize / 2 - 0.002, z: 0,
    rotationX: Math.PI / 2,
    rotation: 0
  }
];

for (const face of facePositions) {

  // Only add highlights to the outside of the main cube
  if (face.name === 'front' && z !== 3) continue;
  if (face.name === 'back' && z !== 0) continue;
  if (face.name === 'right' && x !== 3) continue;
  if (face.name === 'left' && x !== 0) continue;
  if (face.name === 'top' && y !== 3) continue;
  if (face.name === 'bottom' && y !== 0) continue;

  const faceMesh = new THREE.Mesh(
    faceGeometry,
    faceMaterial.clone()
  );

  faceMesh.position.set(face.x, face.y, face.z);
  faceMesh.rotation.set(face.rotationX || 0, face.rotation || 0, 0);

  faceMesh.userData.isSequencerFace = true;
  faceMesh.userData.face = face.name;
  faceMesh.userData.active = false;


cubelet.add(faceMesh);
faceMeshes.push(faceMesh);

// Number the 16 squares on each outer face
let step;

switch (face.name) {
  case 'front':
    step = (3 - y) * 4 + x;
    break;

  case 'back':
    step = (3 - y) * 4 + (3 - x);
    break;

  case 'right':
    step = (3 - y) * 4 + (3 - z);
    break;

  case 'left':
    step = (3 - y) * 4 + z;
    break;

  case 'top':
    step = (3 - z) + x * 4;
    break;

  case 'bottom':
    step = z + x * 4;
    break;
}

const numberLabel = createFaceNumber(step + 1);
faceMesh.userData.numberLabel = numberLabel;
numberLabel.userData.displayedNumber = step + 1;

// Small inset from the top-left corner

switch (face.name) {
  case 'back':
    numberLabel.position.set(0.35, 0.35, -0.006);
    numberLabel.rotation.y = Math.PI;
    break;

  case 'left':
    numberLabel.position.set(0.35, 0.30, -0.006);
    numberLabel.rotation.y = Math.PI;
    break;

  case 'top':
    numberLabel.rotation.z = Math.PI / 2;
    numberLabel.position.set(-0.35, -0.35, 0.006);
    break;

case 'bottom':
  numberLabel.rotation.z = Math.PI / 2;
  numberLabel.position.set(-0.35, -0.35, 0.006);
  break;

  default:
    numberLabel.position.set(-0.35, 0.35, 0.006);
    break;
}


faceMesh.add(numberLabel);
scene.updateMatrixWorld(true);

const worldPosition = new THREE.Vector3();
const worldQuaternion = new THREE.Quaternion();

numberLabel.getWorldPosition(worldPosition);
numberLabel.getWorldQuaternion(worldQuaternion);
numberLabel.userData.cubelet = cubelet;

scene.add(numberLabel);

numberLabel.position.copy(worldPosition);
numberLabel.quaternion.copy(worldQuaternion);
}

cubelet.add(edges);
scene.add(cubelet);
cubelets.push(cubelet);

if (x === 0 && y === 0 && z === 0) {
  console.log(
    'FIRST CUBELET:',
    cubelet.userData.x,
    cubelet.userData.y,
    cubelet.userData.z,
    cubelet.userData.active
  );
}
    }
  }
}


for (const item of voiceLabels) {
  const label = createVoiceLabel(item.text);

  label.position.set(item.x, item.y, item.z);
  label.rotation.y = item.rotationY;
  label.rotation.x = item.rotationX;
  label.rotation.z = item.rotationZ;

  scene.add(label);
}

// ------------------------------------
// 3. CUBELET APPEARANCE
// ------------------------------------

function getWorldFace(cubelet, faceMesh) {
  const localNormal = new THREE.Vector3();

  switch (faceMesh.userData.face) {
    case 'front':  localNormal.set(0, 0, 1); break;
    case 'back':   localNormal.set(0, 0, -1); break;
    case 'right':  localNormal.set(1, 0, 0); break;
    case 'left':   localNormal.set(-1, 0, 0); break;
    case 'top':    localNormal.set(0, 1, 0); break;
    case 'bottom': localNormal.set(0, -1, 0); break;
  }

  localNormal.applyQuaternion(cubelet.quaternion);

  const ax = Math.abs(localNormal.x);
  const ay = Math.abs(localNormal.y);
  const az = Math.abs(localNormal.z);

  if (ay >= ax && ay >= az) {
    return localNormal.y > 0 ? 'top' : 'bottom';
  }

  if (ax >= az) {
    return localNormal.x > 0 ? 'right' : 'left';
  }

  return localNormal.z > 0 ? 'front' : 'back';
}


let currentStep = -1;


function pulseCubelet(cubelet) {
  const startTime = performance.now();
  const duration = 150;
  const maxScale = 1.16;

  function animatePulse(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const pulse = Math.sin(progress * Math.PI);

    cubelet.scale.setScalar(
      1 + (maxScale - 1) * pulse
    );

    if (progress < 1) {
      requestAnimationFrame(animatePulse);
    } else {
      cubelet.scale.setScalar(1);
    }
  }

  requestAnimationFrame(animatePulse);
}



function updateCubelet(cubelet) {
  const { x, y, z } = cubelet.userData;

  cubelet.material.color.set('#202830');

  cubelet.children.forEach(child => {
    if (!child.userData.isSequencerFace) return;

    const face = getWorldFace(cubelet, child);

    let step;

    switch (face) {
      case 'front':
        step = (3 - y) * 4 + x;
        break;

      case 'back':
        step = (3 - y) * 4 + (3 - x);
        break;

      case 'right':
        step = (3 - y) * 4 + (3 - z);
        break;

      case 'left':
        step = (3 - y) * 4 + z;
        break;

      case 'top':
        step = (3 - z) + x * 4;
        break;

      case 'bottom':
        step = z + x * 4;
        break;
    }


  // if (child.userData.numberLabel) {
  //   updateFaceNumber(child.userData.numberLabel, step + 1);
  // }

    const isCurrentStep = step === currentStep;

 if (child.userData.active) {
  const baseColour = new THREE.Color(faceColours[face]);

  if (isCurrentStep) {
    baseColour.multiplyScalar(1.6);
  }

  child.material.color.copy(baseColour);
} else {
  child.material.color.set(
    isCurrentStep ? '#cbd3da' : '#202830'
  );
}



  });

 // cubelet.scale.setScalar(1);
}



function updateAllCubelets() {
  cubelets.forEach(updateCubelet);
  updateEventCount();
}


let spaceHeld = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStarted = false;

window.addEventListener('keydown', event => {
  if (event.code === 'Space') {
    spaceHeld = true;
    controls.enabled = false;
    event.preventDefault();
  }
});

window.addEventListener('keyup', event => {
  if (event.code === 'Space') {
    spaceHeld = false;
    dragStarted = false;
    controls.enabled = true;
  }
});

let selectedLayerY = 3;
let selectedLayerX = 3;
let selectedLayerZ = 3;

const layerRaycaster = new THREE.Raycaster();
const layerPointer = new THREE.Vector2();


renderer.domElement.addEventListener('pointerdown', event => {
  if (!spaceHeld || event.button !== 0) return;

  dragStartX = event.clientX;
  dragStartY = event.clientY;
  dragStarted = true;

  const rect = renderer.domElement.getBoundingClientRect();

  layerPointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  layerPointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  layerRaycaster.setFromCamera(layerPointer, camera);

  const hits = layerRaycaster.intersectObjects(cubelets, false);

  if (hits.length > 0) {
    const cubelet = hits[0].object;

    selectedLayerY = cubelet.userData.y;
    selectedLayerX = cubelet.userData.x;
    selectedLayerZ = cubelet.userData.z;
    
  }
});


let dragTriggered = false;

renderer.domElement.addEventListener('pointermove', event => {
  if (!spaceHeld || !dragStarted || dragTriggered) return;

  const deltaX = event.clientX - dragStartX;
  const deltaY = event.clientY - dragStartY;

  // Wait until the pointer has moved far enough.
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 40) return;

  dragTriggered = true;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    // Existing horizontal rotation behaviour.
    const direction = deltaX > 0 ? 1 : -1;
    rotateLayer(selectedLayerY, direction);
  } else {
  const cameraRight = new THREE.Vector3(1, 0, 0)
    .applyQuaternion(camera.quaternion);

  const direction = deltaY > 0 ? 1 : -1;

  if (Math.abs(cameraRight.x) >= Math.abs(cameraRight.z)) {
    const cameraSide = camera.position.x >= 0 ? 1 : -1;

    rotateVerticalLayer(
      'x',
      selectedLayerX,
      direction * cameraSide
    );
  } else {
    const cameraSide = camera.position.z >= 0 ? 1 : -1;

    rotateVerticalLayer(
      'z',
      selectedLayerZ,
      direction * cameraSide
    );
  }
}
});


renderer.domElement.addEventListener('pointerup', () => {
  dragStarted = false;
  dragTriggered = false;
});



function resetCubeletPositions() {
  for (const cubelet of cubelets) {
    const { x, y, z } = cubelet.userData;

    cubelet.position.set(
      (x - 1.5) * spacing,
      (y - 1.5) * spacing,
      (z - 1.5) * spacing
    );
  }
}

function snapCubeletRotation(cubelet) {
  const quarterTurn = Math.PI / 2;

  const snap = angle =>
    Math.round(angle / quarterTurn) * quarterTurn;

  cubelet.rotation.set(
    snap(cubelet.rotation.x),
    snap(cubelet.rotation.y),
    snap(cubelet.rotation.z),
    cubelet.rotation.order
  );

  cubelet.updateMatrix();
}

let rotatingLayer = false;


async function rotateLayer(layerY, direction = 1) {
  if (rotatingLayer) return;

  resetCubeletPositions();
  rotatingLayer = true;

  const layer = cubelets.filter(
    cubelet => cubelet.userData.y === layerY
  );
  

  // Fade the layer's numbers out BEFORE rotation begins.
  await fadeLayerNumbers(layer, 0, 120);

  // Create a pivot at the centre of the selected layer.
  const pivot = new THREE.Group();
  pivot.position.set(0, (layerY - 1.5) * spacing, 0);
  scene.add(pivot);

  // Attach the selected cubelets to the pivot.
  layer.forEach(cubelet => pivot.attach(cubelet));

  // Rotate the layer over 300 ms.
  const duration = 300;
  const startTime = performance.now();

  await new Promise(resolve => {
    function animateRotation(now) {
      const progress = Math.min(
        (now - startTime) / duration,
        1
      );

      // Smooth ease-in/ease-out.
      const eased = progress * progress * (3 - 2 * progress);

      pivot.rotation.y = eased * direction * Math.PI / 2;

      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      } else {
        // Ensure the final rotation is exact.
        pivot.rotation.y = direction * Math.PI / 2;
        pivot.updateMatrixWorld(true);
        resolve();
      }
    }

    requestAnimationFrame(animateRotation);
  });

  // Detach the cubelets while preserving their world transforms.
  layer.forEach(cubelet => scene.attach(cubelet));

  // Update grid coordinates using the existing rotation mapping.
  layer.forEach(cubelet => {
    const oldX = cubelet.userData.x;
    const oldZ = cubelet.userData.z;

    if (direction === 1) {
      cubelet.userData.x = oldZ;
      cubelet.userData.z = 3 - oldX;
    } else {
      cubelet.userData.x = 3 - oldZ;
      cubelet.userData.z = oldX;
    }

    cubelet.position.set(
      (cubelet.userData.x - 1.5) * spacing,
      (cubelet.userData.y - 1.5) * spacing,
      (cubelet.userData.z - 1.5) * spacing
    );

    snapCubeletRotation(cubelet);
  });

  // Remove the pivot after the cubelets have been repositioned.
  scene.remove(pivot);

  // Fade the numbers back in AFTER rotation has finished.
  await fadeLayerNumbers(layer, 1, 120);

  rotatingLayer = false;
  updateAllCubelets();
}


async function rotateVerticalLayer(axis, layerIndex, direction = 1) {
  if (rotatingLayer) return;

  rotatingLayer = true;

  const layer = cubelets.filter(
    cubelet => cubelet.userData[axis] === layerIndex
  );

  // Fade numbers out before rotation starts.
  await fadeLayerNumbers(layer, 0, 120);

  const pivot = new THREE.Group();

  if (axis === 'x') {
    pivot.position.x = (layerIndex - 1.5) * spacing;
  } else {
    pivot.position.z = (layerIndex - 1.5) * spacing;
  }

  scene.add(pivot);

  layer.forEach(cubelet => pivot.attach(cubelet));

  const duration = 300;
  const startTime = performance.now();

  function animateRotation(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = progress * progress * (3 - 2 * progress);

    pivot.rotation[axis] = eased * direction * Math.PI / 2;

    if (progress < 1) {
      requestAnimationFrame(animateRotation);
      return;
    }

    pivot.rotation[axis] = direction * Math.PI / 2;
    pivot.updateMatrixWorld(true);

    layer.forEach(cubelet => scene.attach(cubelet));

    layer.forEach(cubelet => {
      const oldX = cubelet.userData.x;
      const oldY = cubelet.userData.y;
      const oldZ = cubelet.userData.z;

      let gridX = oldX;
      let gridY = oldY;
      let gridZ = oldZ;

      // Original coordinate mappings preserved.
      if (axis === 'x') {
        if (direction === 1) {
          gridY = 3 - oldZ;
          gridZ = oldY;
        } else {
          gridY = oldZ;
          gridZ = 3 - oldY;
        }
      } else if (axis === 'z') {
        if (direction === 1) {
          gridX = 3 - oldY;
          gridY = oldX;
        } else {
          gridX = oldY;
          gridY = 3 - oldX;
        }
      }

      cubelet.position.set(
        (gridX - 1.5) * spacing,
        (gridY - 1.5) * spacing,
        (gridZ - 1.5) * spacing
      );

      cubelet.userData.x = gridX;
      cubelet.userData.y = gridY;
      cubelet.userData.z = gridZ;
    });

    scene.remove(pivot);

    // Fade numbers back in after rotation finishes.
    fadeLayerNumbers(layer, 1, 120).then(() => {
      rotatingLayer = false;
      updateAllCubelets();
    });
  }

  requestAnimationFrame(animateRotation);
}



window.addEventListener('keydown', event => {
  if (event.code === 'KeyR') {
    rotateTopLayer(3);
  }
});


function updateEventCount() {
  const count = faceMeshes.filter(
    face => face.userData.active
  ).length;

  document.querySelector('#eventCount').textContent = count;
}

 // ------------------------------------
 // 4. CLICK TO TOGGLE EVENTS
 // ------------------------------------



renderer.domElement.addEventListener('click', event => {
  if (spaceHeld || dragTriggered) return;
  const bounds = renderer.domElement.getBoundingClientRect();

  mouse.x =
    ((event.clientX - bounds.left) / bounds.width) * 2 - 1;

  mouse.y =
    -((event.clientY - bounds.top) / bounds.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(faceMeshes, false);

  if (hits.length === 0) return;

  const faceMesh = hits[0].object;
  const cubelet = faceMesh.parent;

  faceMesh.userData.active = !faceMesh.userData.active;

  updateCubelet(cubelet);
  updateEventCount();
});

// ------------------------------------
// 5. AUDIO
// ------------------------------------

let audioContext = null;
let audioAnalyser = null;
let audioData = null;
let audioLevel = 0;
let audioAnalyserConnected = false;

function startAudio() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  if (!audioAnalyser) {
  audioAnalyser = audioContext.createAnalyser();
  audioAnalyser.fftSize = 256;

  audioData = new Uint8Array(audioAnalyser.frequencyBinCount);
  }

  if (audioAnalyser && !audioAnalyserConnected) {
  audioAnalyser.connect(audioContext.destination);
  audioAnalyserConnected = true;
  }
}



// ------------------------------------
// AUDIO SAMPLE LOADING
// ------------------------------------

const sampleBuffers = new Array(6).fill(null);
console.log('SAMPLE SYSTEM INITIALISED', Date.now());

for (let i = 0; i < 6; i++) {
  const fileInput = document.querySelector(`#sample${i}`);
  const status = document.querySelector(`#sampleStatus${i}`);
  const previewButton = document.querySelector(`#preview${i}`);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;

    try {
      startAudio();
      status.textContent = 'Loading...';

      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer =
        await audioContext.decodeAudioData(arrayBuffer);

      sampleBuffers[i] = audioBuffer;
      status.textContent = file.name;
    } catch (error) {
      sampleBuffers[i] = null;
      status.textContent = 'Could not load sample';
      console.error('Sample loading error:', error);
    }
  });

  previewButton.addEventListener('click', () => {
    playVoice(i);
  });
}



function playVoice(voice) {
  startAudio();

  const buffer = sampleBuffers[voice];

  if (!buffer) {
    console.warn(`No sample loaded for voice ${voice}`);
    return;
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();

  source.buffer = buffer;
  gain.gain.value = 1;

  source.connect(gain);
  gain.connect(audioAnalyser);

  source.start();
}



function updateAudioLevel() {


  if (!audioAnalyser || !audioData) {
    audioLevel *= 0.9;
    return;
  }

  audioAnalyser.getByteTimeDomainData(audioData);

  let sum = 0;

  for (let i = 0; i < audioData.length; i++) {
    const sample = (audioData[i] - 128) / 128;
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / audioData.length);
  const target = Math.min(rms * 4, 1);

  audioLevel += (target - audioLevel) * 0.2;
}



  const dispSlider = document.querySelector('#displacement');
  const dispValue = document.querySelector('#displacementValue');

  let displacementAmount = Number(dispSlider.value);

  dispSlider.addEventListener('input', () => {
    displacementAmount = Number(dispSlider.value);
    dispValue.textContent = displacementAmount;
  });


function updateAudioDeformation() {

  // Avoid interfering with cube rotations
  if (rotatingLayer) return;

  const time = performance.now() * 0.001;

  for (const cubelet of cubelets) {
    // Reconstruct the cubelet's current grid position
    const { x, y, z } = cubelet.userData;

    const baseX = (x - 1.5) * spacing;
    const baseY = (y - 1.5) * spacing;
    const baseZ = (z - 1.5) * spacing;

    // Direction from the centre of the whole cube
    const direction = new THREE.Vector3(baseX, baseY, baseZ);
    const distance = direction.length();

    if (distance === 0) {
      cubelet.position.set(baseX, baseY, baseZ);
      continue;
    }

    direction.normalize();

    // Different parts of the cube respond at slightly different phases
    const phase =
      distance * 1.8 +
      x * 0.7 +
      y * 0.7 +
      z * 0.7 -
      time * 3;

    const ripple = Math.sin(phase);

    // Subtle sound-driven displacement
   const displacement = audioLevel * displacementAmount * ripple;

    cubelet.position.set(
      baseX + direction.x * displacement,
      baseY + direction.y * displacement,
      baseZ + direction.z * displacement
    );
  }
}


// ------------------------------------
// 6. SEQUENCER TRANSPORT
// ------------------------------------

let playing = false;
let timer = null;
let tempo = 450;


function playStep() {
  currentStep = (currentStep + 1) % 16;

  document.querySelector('#stepCount').textContent =
    currentStep + 1;

  const pulsedCubelets = new Set();

  for (const faceMesh of faceMeshes) {
    if (!faceMesh.userData.active) continue;

    const cubelet = faceMesh.parent;
    const { x, y, z } = cubelet.userData;

    let step;

    switch (getWorldFace(cubelet, faceMesh)) {
      case 'front':
        step = (3 - y) * 4 + x;
        break;
      case 'back':
        step = (3 - y) * 4 + (3 - x);
        break;
      case 'right':
        step = (3 - y) * 4 + (3 - z);
        break;
      case 'left':
        step = (3 - y) * 4 + z;
        break;
      case 'top':
        step = (3 - z) + x * 4;
        break;
      case 'bottom':
        step = z + x * 4;
        break;
    }



  if (step === currentStep) {
    const face = getWorldFace(cubelet, faceMesh);
    const voice = faceVoices[face];

    playVoice(voice, notes[0]);
    pulsedCubelets.add(cubelet);
  }
  pulsedCubelets.forEach(pulseCubelet);

  }

  updateAllCubelets();
}

function startSequencer() {
  if (playing) return;

  startAudio();
  playing = true;

  document.querySelector('#status').textContent = 'PLAYING';
  document.querySelector('#playBtn').textContent = '▶ PLAYING';

  playStep();

  timer = setInterval(() => {
    if (playing) playStep();
  }, 60000 / tempo);
}

function stopSequencer() {
  playing = false;
  clearInterval(timer);
  timer = null;
  currentStep = -1;

  document.querySelector('#status').textContent = 'READY';
  document.querySelector('#playBtn').textContent = '▶ PLAY';
  document.querySelector('#stepCount').textContent = '—';

  updateAllCubelets();
}

document.querySelector('#playBtn').addEventListener(
  'click',
  startSequencer
);

document.querySelector('#stopBtn').addEventListener(
  'click',
  stopSequencer
);

// ------------------------------------
// 7. TEMPO CONTROL
// ------------------------------------

const tempoSlider = document.querySelector('#tempo');
const tempoValue = document.querySelector('#tempoValue');

tempoSlider.addEventListener('input', () => {
  tempo = Number(tempoSlider.value);
  tempoValue.textContent = tempo;

  if (playing) {
    clearInterval(timer);

    timer = setInterval(() => {
      if (playing) playStep();
    }, 60000 / tempo);
  }
});

// ------------------------------------
// 8. RANDOMISE AND CLEAR
// ------------------------------------


document.querySelector('#randomBtn').addEventListener('click', () => {
  faceMeshes.forEach(face => {
    face.userData.active = Math.random() < 0.22;
  });

  updateAllCubelets();
});

document.querySelector('#clearBtn').addEventListener('click', () => {
  faceMeshes.forEach(face => {
    face.userData.active = false;
  });

  updateAllCubelets();
});

// ------------------------------------
// 9. RESIZE AND ANIMATION
// ------------------------------------

function resizeScene() {
  const width = sceneElement.clientWidth;
  const height = sceneElement.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  composer.setSize(width, height);
}

window.addEventListener('resize', resizeScene);




function animate() {
  requestAnimationFrame(animate);

  updateAudioLevel();
  updateAudioDeformation();

  controls.update();
  composer.render();
}


updateAllCubelets();
animate();
