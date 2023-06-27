import * as THREE from 'three';
import * as CANNON from 'cannon';

function generateSphere(x, y, z, radius, falls, world, scene, stack) {
  // ThreeJS
  const geometry = new THREE.SphereGeometry(radius, 32, 32);

  const color = new THREE.Color(`hsl(${30 + stack.length * 4}, 100%, 50%)`);
  const emissiveColor = new THREE.Color(
    `hsl(${30 + stack.length * 4}, 100%, 75%)`
  );

  const material = new THREE.MeshLambertMaterial({
    color,
    emissive: emissiveColor,
    emissiveIntensity: 1,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const light = new THREE.PointLight(color, 2, 100); // Color igual al de la esfera, intensidad 2, distancia 100
  light.position.set(x, y, z);
  scene.add(light);

  // CannonJS
  const shape = new CANNON.Sphere(radius);
  let mass = falls ? 5 : 0;
  const body = new CANNON.Body({ mass, shape });
  body.position.set(x, y, z);
  world.addBody(body);

  return {
    threejs: mesh,
    cannonjs: body,
    radius,
  };
}
export { generateSphere };
