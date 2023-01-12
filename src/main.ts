import { GUI } from "dat.gui";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Clock,
  Color,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  sRGBEncoding,
  TextureLoader,
  WebGLRenderer,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

import firefliesVertexShader from "./shaders/fireflies/vertex.glsl?raw";
import firefliesFragmentShader from "./shaders/fireflies/fragment.glsl?raw";
import portalVertexShader from "./shaders/portal/vertex.glsl?raw";
import portalFragmentShader from "./shaders/portal/fragment.glsl?raw";

import "./style.css";

const debugObject: Record<string, any> = {};
const gui = new GUI({
  width: 400,
});

const canvas = document.querySelector<HTMLDivElement>("canvas.webgl")!;
const scene = new Scene();
const textureLoader = new TextureLoader();

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("draco/");

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

const bakedTexture = textureLoader.load("baked.jpg");
bakedTexture.flipY = false;
bakedTexture.encoding = sRGBEncoding;

const bakedMaterial = new MeshBasicMaterial({ map: bakedTexture });

debugObject.portalColorStart = "#fcfdff";
debugObject.portalColorEnd = "#6666ff";

gui
  .addColor(debugObject, "portalColorStart")
  .onChange(() =>
    portalLightMaterial.uniforms.uColorStart.value.set(
      debugObject.portalColorStart
    )
  );
gui
  .addColor(debugObject, "portalColorEnd")
  .onChange(() =>
    portalLightMaterial.uniforms.uColorEnd.value.set(debugObject.portalColorEnd)
  );

const portalLightMaterial = new ShaderMaterial({
  vertexShader: portalVertexShader,
  fragmentShader: portalFragmentShader,
  uniforms: {
    uTime: {
      value: 0,
    },
    uColorStart: { value: new Color(debugObject.portalColorStart) },
    uColorEnd: { value: new Color(debugObject.portalColorEnd) },
  },
});

const poleLightMaterial = new MeshBasicMaterial({ color: 0xffffe5 });

gltfLoader.load("portal.glb", (gltf) => {
  const children = gltf.scene.children as Mesh[];

  const bakedMesh = children.find((child) => child.name === "baked");
  const portalLightMesh = children.find(
    (child) => child.name === "portalLight"
  );
  const poleLightAMesh = children.find((child) => child.name === "poleLightA");
  const poleLightBMesh = children.find((child) => child.name === "poleLightB");

  if (!bakedMesh || !poleLightAMesh || !poleLightBMesh || !portalLightMesh) {
    return;
  }

  bakedMesh.material = bakedMaterial;
  poleLightAMesh.material = poleLightMaterial;
  poleLightBMesh.material = poleLightMaterial;
  portalLightMesh.material = portalLightMaterial;

  scene.add(gltf.scene);
});

const firefliesGeometry = new BufferGeometry();
const firefliesCount = 20;
const positions = new Float32Array(firefliesCount * 3);
const scales = new Float32Array(firefliesCount);

for (let i = 0; i < firefliesCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 4;
  positions[i * 3 + 1] = Math.random() + 0.5;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
  scales[i] = Math.random() * 2 + 0.2;
}

firefliesGeometry.setAttribute("position", new BufferAttribute(positions, 3));
firefliesGeometry.setAttribute("aScale", new BufferAttribute(scales, 1));

const firefliesMaterial = new ShaderMaterial({
  depthWrite: false,
  transparent: true,
  blending: AdditiveBlending,
  fragmentShader: firefliesFragmentShader,
  vertexShader: firefliesVertexShader,
  uniforms: {
    uPixelRatio: {
      value: Math.min(window.devicePixelRatio, 2),
    },
    uSize: {
      value: 100,
    },
    uTime: {
      value: 0,
    },
  },
});

gui
  .add(firefliesMaterial.uniforms.uSize, "value")
  .min(0)
  .max(500)
  .step(1)
  .name("firefliesSize");

const fireflies = new Points(firefliesGeometry, firefliesMaterial);
scene.add(fireflies);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  fireflies.material.uniforms.uPixelRatio.value = Math.min(
    window.devicePixelRatio,
    2
  );
});

const camera = new PerspectiveCamera(45, sizes.width / sizes.height, 0.1, 100);
camera.position.x = 4;
camera.position.y = 2;
camera.position.z = 4;
scene.add(camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const renderer = new WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = sRGBEncoding;

debugObject.clearColor = "#251717";
renderer.setClearColor(debugObject.clearColor);
gui
  .addColor(debugObject, "clearColor")
  .onChange(() => renderer.setClearColor(debugObject.clearColor));

const clock = new Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  fireflies.material.uniforms.uTime.value = elapsedTime;
  portalLightMaterial.uniforms.uTime.value = elapsedTime;

  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(tick);
};

tick();
