import './styles/style.css';
import * as THREE from 'three';
import * as CANNON from 'cannon';
import { generateBox, cutBox } from './box';

window.focus(); // Captura las teclas inmediatamente (por defecto el foco está en el editor)

let camera, scene, renderer; // Variables globales de ThreeJS
let world; // Mundo de CannonJs
let lastTime; // Última marca de tiempo de animación
let stack; // Partes que permanecen sólidas unas encima de otras
let overhangs; // Partes sobresalientes que caen
let autopilot;
let gameEnded;
let robotPrecision; // Determina cuán precisa es el juego en piloto automático
let speed = 0.008;
let username = '';
const boxHeight = 1; // Altura de cada capa
const originalBoxSize = 3; // Ancho y alto originales de una caja

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const instructionsElement = document.getElementById('instructions');
const resultsElement = document.getElementById('results');

//init();

// Determina cuán precisa es el juego en piloto automático
function setRobotPrecision() {
  robotPrecision = Math.random() * 1 - 0.5;
}

function init() {
  autopilot = true;
  gameEnded = false;
  lastTime = 0;
  stack = [];
  overhangs = [];
  setRobotPrecision();

  // Inicializa CannonJS
  world = new CANNON.World();
  world.gravity.set(0, -10, 0); // La gravedad tira las cosas hacia abajo
  world.broadphase = new CANNON.NaiveBroadphase();
  world.solver.iterations = 40;

  // Inicializa ThreeJs
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  // Cámara ortográfica, indica que no hay perspectiva en la cámara, lo que a su vez significa que no hay profundidad
  // Entonces, no importa desde dónde se vea la cámara, los objetos se verán del mismo tamaño
  // No se usa PerspectiveCamera porque no se necesita perspectiva para este juego
  // Con la cámara ortográfica, no se proyecta sobre un solo punto (viewpoint) sino sobre una superficie
  // Cada línea proyectada es paralela a la siguiente
  camera = new THREE.OrthographicCamera(
    width / -2, // izquierda
    width / 2, // derecha
    height / 2, // arriba
    height / -2, // abajo
    0, // plano cercano
    100 // plano lejano
  );

  /*
  // Cámara de perspectiva en lugar de la ortográfica
  camera = new THREE.PerspectiveCamera(
    45, // campo de visión
    aspect, // relación de aspecto
    1, // plano cercano
    100 // plano lejano
  );
  */

  // Posición de la cámara
  // Como estamos usando una cámara ortográfica, la posición de la cámara no importa mucho
  // Los objetos se verán del mismo tamaño desde cualquier posición
  // Sin embargo, es importante la proporcion de la posición de la cámara	que se establece por su dirección
  camera.position.set(4, 4, 4);
  camera.lookAt(0, 0, 0);

  scene = new THREE.Scene();

  // Crear el piso
  const floorGeometry = new THREE.PlaneGeometry(10, 20);
  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xd2b48c }); //
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = Math.PI / -2; // Rotar el piso 90 grados para que quede horizontal
  scene.add(floor);

  // Crear la pared
  const wallGeometry = new THREE.PlaneGeometry(10, 10);
  const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xa0522d }); //
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.y = 5; // Mover la pared hacia arriba
  wall.position.z = -5; // Mover la pared hacia atrás
  scene.add(wall);

  const wallGeometry2 = new THREE.PlaneGeometry(10, 10);
  const wallMaterial2 = new THREE.MeshBasicMaterial({ color: 0xbc8f8f }); //
  const wall2 = new THREE.Mesh(wallGeometry2, wallMaterial2);
  wall2.rotation.y = Math.PI / 2; // Girar la pared 90 grados
  wall2.position.z = -5; // Mover la pared hacia atrás
  wall2.position.x = -10; // Mover la pared a la derecha
  scene.add(wall2);

  const wallGeometry3 = new THREE.PlaneGeometry(16, 10);
  const wallMaterial3 = new THREE.MeshBasicMaterial({ color: 0x006600 }); //
  const wall3 = new THREE.Mesh(wallGeometry3, wallMaterial3);
  wall3.position.y = 5; // Mover la pared hacia arriba
  wall3.position.z = -8; // Mover la pared hacia atrás
  scene.add(wall3);

  const wallGeometry4 = new THREE.PlaneGeometry(16, 10);
  const wallMaterial4 = new THREE.MeshBasicMaterial({ color: 0x001a00 }); //
  const wall4 = new THREE.Mesh(wallGeometry4, wallMaterial4);
  wall4.rotation.y = Math.PI / 2; // Girar la pared 90 grados
  wall4.position.z = -5; // Mover la pared hacia atrás
  wall4.position.x = -13; // Mover la pared a la derecha
  scene.add(wall4);

  floor.userData.isEnvironment = true;
  wall.userData.isEnvironment = true;
  wall2.userData.isEnvironment = true;
  wall3.userData.isEnvironment = true;
  wall4.userData.isEnvironment = true;

  // Base
  addLayer(0, 0, originalBoxSize, originalBoxSize);

  // Primer capa
  addLayer(-10, 0, originalBoxSize, originalBoxSize, 'x');

  // Configuración de luces
  // Luz de ambiente que ilumina desde todas las direcciones
  const ambientLight = new THREE.AmbientLight(0x303030, 0.3); // Luz de ambiente oscura
  scene.add(ambientLight);

  // La luz direccional tiene un posición que sirve como una dirección, funciona como el sol
  // Ilumina todo desde el mismo angulo siempre
  // En la posición, el primer parámetro es la posición x, el segundo es la posición y y el tercero es la posición z
  // El parametro Y tiene el mayor valor porque la luz se encuentra en la parte superior, lo que indica que el top de los cubos reciben más luz
  // El parametro X tiene un valor menor que el Y, lo que indica que el lado derecho de las cajas también recibirán luz, pero menos que el top
  // El parametro Z tiene un valor de 0, lo que indicaría que el lado frontal de las cajas no recibirán luz
  // Si no hubiese luz de ambiente, el lado frontal de las cajas no se mostraría, estaría completamente negro
  const dirLight = new THREE.DirectionalLight(0x606060, 0.6); // Luz direccional oscura
  dirLight.position.set(10, 20, 0);
  scene.add(dirLight);

  // Configuración del renderizador
  // Esta parte es la que es capaz de renderizar la imagen en un canvas de HTML
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0xadd8e6);
  renderer.setAnimationLoop(animation);
  document.body.appendChild(renderer.domElement);
}

function startGame() {
  //currentSphere = null;

  autopilot = false;
  gameEnded = false;
  lastTime = 0;
  speed = 0.008;
  stack = [];
  overhangs = [];

  if (instructionsElement) instructionsElement.style.display = 'none';
  if (resultsElement) resultsElement.style.display = 'none';
  if (scoreElement) scoreElement.innerText = 0;
  if (levelElement) levelElement.innerText = 1;

  if (world) {
    // Elimina cada objeto del mundo
    while (world.bodies.length > 0) {
      world.remove(world.bodies[0]);
    }
  }

  if (scene) {
    // Elimina cada malla de la escena
    while (
      scene.children.find((c) => c.type == 'Mesh' && !c.userData.isEnvironment)
    ) {
      const mesh = scene.children.find(
        (c) => c.type == 'Mesh' && !c.userData.isEnvironment
      );
      scene.remove(mesh);
    }

    // Fundación
    addLayer(0, 0, originalBoxSize, originalBoxSize);

    // Primer capa
    addLayer(-10, 0, originalBoxSize, originalBoxSize, 'x');
  }

  if (camera) {
    // Restablece las posiciones de la cámara
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 0, 0);
  }
}

// addLayer añade un nuevo cubo a la escena y también al stack
function addLayer(x, z, width, depth, direction) {
  const y = boxHeight * stack.length; // Añade la nueva caja a una capa superior
  const layer = generateBox(x, y, z, width, depth, false, stack, scene, world);
  layer.direction = direction;
  stack.push(layer);
}

function addOverhang(x, z, width, depth) {
  const y = boxHeight * (stack.length - 1); // Añade la nueva caja a la misma capa
  const overhang = generateBox(
    x,
    y,
    z,
    width,
    depth,
    true,
    stack,
    scene,
    world
  );
  overhangs.push(overhang);
}

window.addEventListener('mousedown', eventHandler);
window.addEventListener('touchstart', eventHandler);
window.addEventListener('keydown', function (event) {
  if (event.key == ' ') {
    event.preventDefault();
    eventHandler();
    return;
  }
  if (event.key == 'R' || event.key == 'r') {
    event.preventDefault();
    location.reload();
    return;
  }
});

function eventHandler() {
  if (autopilot) startGame();
  else splitBlockAndAddNextOneIfOverlaps();
}

// Función que se llama en cada click o cuando se hace press en la tecla espacio
function splitBlockAndAddNextOneIfOverlaps() {
  if (gameEnded) return;

  if (username === null || username === '') {
    username = prompt('Por favor ingresa tu nombre');
    const usernameElement = document.getElementById('username');
    usernameElement.innerText = username;
  }

  const topLayer = stack[stack.length - 1];
  const previousLayer = stack[stack.length - 2];

  const direction = topLayer.direction;

  const size = direction == 'x' ? topLayer.width : topLayer.depth;
  const delta =
    topLayer.threejs.position[direction] -
    previousLayer.threejs.position[direction];
  const overhangSize = Math.abs(delta);
  const overlap = size - overhangSize;

  if (overlap > 0) {
    cutBox(topLayer, overlap, size, delta, world, scene, stack);

    // Sobresaliente
    const overhangShift = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
    const overhangX =
      direction == 'x'
        ? topLayer.threejs.position.x + overhangShift
        : topLayer.threejs.position.x;
    const overhangZ =
      direction == 'z'
        ? topLayer.threejs.position.z + overhangShift
        : topLayer.threejs.position.z;
    const overhangWidth = direction == 'x' ? overhangSize : topLayer.width;
    const overhangDepth = direction == 'z' ? overhangSize : topLayer.depth;

    addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

    // Siguiente capa
    const nextX = direction == 'x' ? topLayer.threejs.position.x : -10;
    const nextZ = direction == 'z' ? topLayer.threejs.position.z : -10;
    const newWidth = topLayer.width; // La nueva capa tiene el mismo tamaño que la capa superior cortada
    const newDepth = topLayer.depth; // La nueva capa tiene el mismo tamaño que la capa superior cortada
    const nextDirection = direction == 'x' ? 'z' : 'x';

    if (scoreElement) scoreElement.innerText = stack.length - 1;

    if (levelElement && (stack.length - 1) % 10 === 0) {
      speed += 0.001;
      levelElement.innerText = parseInt(levelElement.innerText) + 1;
    }

    addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);
  } else {
    missedTheSpot();
  }
}

function missedTheSpot() {
  const topLayer = stack[stack.length - 1];

  // Convierte la capa superior en un sobresaliente y déjala caer
  addOverhang(
    topLayer.threejs.position.x,
    topLayer.threejs.position.z,
    topLayer.width,
    topLayer.depth
  );
  world.remove(topLayer.cannonjs);
  scene.remove(topLayer.threejs);

  gameEnded = true;
  if (resultsElement && !autopilot) resultsElement.style.display = 'flex';
}

function animation(time) {
  if (lastTime) {
    const timePassed = time - lastTime;

    const topLayer = stack[stack.length - 1];
    const previousLayer = stack[stack.length - 2];

    // La caja de nivel superior debería moverse si el juego no ha terminado Y
    // no está en piloto automático o está en piloto automático y la caja aún no alcanzó la posición del robot
    const boxShouldMove =
      !gameEnded &&
      (!autopilot ||
        (autopilot &&
          topLayer.threejs.position[topLayer.direction] <
            previousLayer.threejs.position[topLayer.direction] +
              robotPrecision));

    if (boxShouldMove) {
      // Mantén la posición visible en la interfaz de usuario y la posición en el modelo sincronizadas
      topLayer.threejs.position[topLayer.direction] += speed * timePassed;
      topLayer.cannonjs.position[topLayer.direction] += speed * timePassed;

      // Si la caja fue más allá de la pila, entonces muestra la pantalla de falla
      if (topLayer.threejs.position[topLayer.direction] > 10) {
        missedTheSpot();
      }
    } else {
      // Si no debería moverse, ¿es porque el piloto automático alcanzó la posición correcta?
      // Porque si es así, entonces se acerca el próximo nivel
      if (autopilot) {
        splitBlockAndAddNextOneIfOverlaps();
        setRobotPrecision();
      }
    }

    // 4 es la altura inicial de la cámara
    if (camera.position.y < boxHeight * (stack.length - 2) + 4) {
      camera.position.y += speed * timePassed;
    }

    //Update on every loop
    updatePhysics(timePassed);
    renderer.render(scene, camera);
  }
  lastTime = time;
}

function updatePhysics(timePassed) {
  world.step(timePassed / 1000); // Avanza en el mundo de la física

  // Copia las coordenadas de Cannon.js a Three.js
  overhangs.forEach((element) => {
    element.threejs.position.copy(element.cannonjs.position);
    element.threejs.quaternion.copy(element.cannonjs.quaternion);
  });
}

window.addEventListener('resize', () => {
  // Ajustar cámara
  console.log('cambio de tamaño', window.innerWidth, window.innerHeight);
  const aspect = window.innerWidth / window.innerHeight;
  const width = 10;
  const height = width / aspect;

  camera.top = height / 2;
  camera.bottom = height / -2;

  // Reiniciar renderizador
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});

window.addEventListener('load', (event) => {
  init();
});
