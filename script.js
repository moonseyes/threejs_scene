import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights (keeping ambient and directional for general scene lighting)
const ambientLight = new THREE.AmbientLight(0x404040); // soft white light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

const loader = new GLTFLoader();
let modelCenter = new THREE.Vector3(); // Store model center globally
let cameraDistance = 0; // Store camera distance globally
let rotationAngle = 0; // Initialize rotation angle

loader.load(
    './public/3D_model/croissant.glb',
    function (gltf) {
        const model = gltf.scene; // Get the loaded model (gltf.scene is the root object)
        scene.add(model); // Add the entire glTF scene to your Three.js scene

        console.log("Loaded GLTF model:", model);

        // Check for PointLights in the model's children and decrease intensity
        model.traverse(function (child) {
            if (child.isPointLight) {
                console.log("Found a PointLight:", child);
                const originalIntensity = child.intensity;
                child.intensity = originalIntensity / 1000;
                console.log(`PointLight intensity decreased from ${originalIntensity} to ${child.intensity}`);
            }
        });

        // Calculate bounding box of the model to get its size and center
        const boundingBox = new THREE.Box3().setFromObject(model);
        modelCenter = boundingBox.getCenter(new THREE.Vector3()); // Store the center globally
        const size = boundingBox.getSize(new THREE.Vector3());

        // Calculate initial camera distance based on model size
        cameraDistance = Math.max(size.x, size.y, size.z) * 1.5; // Store distance globally

        // Initial camera position (no rotation yet, positioned behind model along Z)
        camera.position.set(modelCenter.x, modelCenter.y + 1, modelCenter.z + cameraDistance);
        camera.lookAt(modelCenter); // Look at the center

        renderer.render(scene, camera); // Initial render
    },
    function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error happened loading the glTF model:', error);
    }
);


function animate() {
    requestAnimationFrame(animate);

    if (modelCenter && cameraDistance) { // Ensure model is loaded and center/distance are available
        rotationAngle += 0.01; // Adjust rotation speed here (smaller value = slower rotation)

        // Calculate new camera position in a circle around the model's center (Y-axis rotation)
        camera.position.x = modelCenter.x + cameraDistance * Math.sin(rotationAngle);
        camera.position.z = modelCenter.z + cameraDistance * Math.cos(rotationAngle);
        camera.position.y = modelCenter.y + 1; // Keep the camera at the same height as the model center

        camera.lookAt(modelCenter); // Keep looking at the model's center
    }

    renderer.render(scene, camera);
}

animate();