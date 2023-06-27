import * as THREE from 'three';
import * as CANNON from 'cannon';
import { generateSphere } from './sphere';

const boxHeight = 1; // Altura de cada capa
const originalBoxSize = 3; // Ancho y alto originales de una caja
function generateBox(x, y, z, width, depth, falls, stack, scene, world) {
  // ThreeJS

  // Añadir mesh = una forma cúbica -box con un material (color)
  // Mesh Basic material es para que se vea una iluminación,
  // con MeshBasiMaterial no se ve la iluminación(el cubo tendría el mismo color en cada lado)
  // The Lamber material necesita luces, si no hubiese luz, el lamber no se mostraría
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);

  // Cambiar el color de cada caja, usando el formato HSL (Hue, Saturation, Lightness)
  // El valor de Hue o matiz es un número entre 0 y 360, que representa un color en el círculo cromático
  // Nosotros empezamos con un color azul, y luego cambiamos el matiz para cada caja en 4 grados
  // De esta forma, a medida que se apilan las cajas, el color cambia gradualmente a azul-morado-rojo
  const color = new THREE.Color(`hsl(${180 + stack.length * 4}, 100%, 50%)`);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  // CannonJS
  const shape = new CANNON.Box(
    new CANNON.Vec3(width / 2, boxHeight / 2, depth / 2)
  );
  let mass = falls ? 5 : 0; // Si no debe caer, establecer la masa en cero la mantendrá estacionaria
  mass *= width / originalBoxSize; // Reducir la masa proporcionalmente por el tamaño
  mass *= depth / originalBoxSize; // Reducir la masa proporcionalmente por el tamaño
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    width,
    depth,
  };
}

function generarNumeroAleatorio() {
  // Generamos un número aleatorio entre 0 y 1
  var numero = Math.random();

  // Si el número es mayor o igual a 0.5, devolvemos 6. Si no, devolvemos -5.
  if (numero >= 0.5) {
    return 6;
  } else {
    return -5;
  }
}

function cutBox(topLayer, overlap, size, delta, world, scene, stack) {
  const direction = topLayer.direction;
  const newWidth = direction == 'x' ? overlap : topLayer.width;
  const newDepth = direction == 'z' ? overlap : topLayer.depth;

  // Actualizar metadatos
  topLayer.width = newWidth;
  topLayer.depth = newDepth;

  // Actualizar modelo ThreeJS
  topLayer.threejs.scale[direction] = overlap / size;
  topLayer.threejs.position[direction] -= delta / 2;

  // Actualizar modelo CannonJS
  topLayer.cannonjs.position[direction] -= delta / 2;

  // Reemplazar la forma por una más pequeña (en CannonJS no se puede simplemente escalar una forma)
  const shape = new CANNON.Box(
    new CANNON.Vec3(newWidth / 2, boxHeight / 2, newDepth / 2)
  );
  topLayer.cannonjs.shapes = [];
  topLayer.cannonjs.addShape(shape);

  const sphereRadius = Math.min(newWidth, newDepth) / 4;
  generateSphere(
    generarNumeroAleatorio(),
    topLayer.threejs.position.y + boxHeight + sphereRadius,
    2,
    sphereRadius,
    true,
    world,
    scene,
    stack
  );
}

// function addLayer(x, z, width, depth, direction, stack, scene, world) {
//   const y = boxHeight * stack.length; // Añade la nueva caja a una capa superior
//   const layer = generateBox(x, y, z, width, depth, false, stack, scene, world);
//   layer.direction = direction;
//   stack.push(layer);
// }

// function addOverhang(x, z, width, depth, stack, scene, world, overhangs) {
//   const y = boxHeight * (stack.length - 1); // Añade la nueva caja a la misma capa
//   const overhang = generateBox(x, y, z, width, depth, true, stack, scene, world);
//   overhangs.push(overhang);
// }

export { generateBox, cutBox };
