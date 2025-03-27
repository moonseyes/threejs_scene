import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import model_url from './public/3D_model/ny_room.glb';    // how parcel works

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lights (keeping ambient and directional for general scene lighting)
const ambientLight = new THREE.AmbientLight(0x444444); // soft white light
scene.add(ambientLight);

// const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
// directionalLight.position.set(1, 1, 1);
// scene.add(directionalLight);

const loader = new GLTFLoader();
let modelCenter = new THREE.Vector3(); // Store model center globally
let cameraDistance = 0; // Store camera distance globally
let rotationAngle = 0; // Initialize rotation angle

let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;
const sensitivity = 0.005; // Adjust sensitivity as needed

// Spherical coordinates for camera control
let phi = Math.PI / 2; // Initial vertical angle (looking from the side)
let theta = 0;        // Initial horizontal angle (looking from behind)

// Zoom variables
const minZoomDistance = 0.5; // Minimum zoom distance
const maxZoomDistance = 10; // Maximum zoom distance
const zoomSensitivity = 0.1; // Adjust zoom speed

// Animation variables
let mixer; // Animation mixer
let clock = new THREE.Clock(); // Clock for animation

loader.load(
    model_url,
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
        modelCenter.y += 0.35;
        const size = boundingBox.getSize(new THREE.Vector3());

        // Calculate initial camera distance based on model size
        cameraDistance = Math.max(size.x, size.y, size.z) * 1.0; // Store distance globally

        // Initial camera position using spherical coordinates
        camera.position.setFromSphericalCoords(cameraDistance, phi, theta);
        camera.position.add(modelCenter); // Translate to model center
        camera.lookAt(modelCenter); // Look at the center

        renderer.render(scene, camera); // Initial render

        // Animation setup
        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.loop = THREE.LoopRepeat; // Set loop mode
                action.play();
            });
        } else {
            console.warn("No animations found in the GLTF model.");
        }
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

    // Update animation mixer
    if (mixer) {
        mixer.update(clock.getDelta());
    }

    renderer.render(scene, camera);
}

animate();

function onMouseDown(event) {
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
}

function onMouseMove(event) {
    if (isDragging) {
        const deltaX = event.clientX - previousMouseX;
        const deltaY = event.clientY - previousMouseY;

        // Update spherical coordinates based on mouse movement
        theta -= deltaX * sensitivity;  // left right
        phi -= deltaY * sensitivity;    //up down

        // Clamp vertical angle (phi) to prevent going too far up or down
        phi = Math.max(0.01, Math.min(Math.PI - 0.01, phi)); // Avoid straight up or down

        // Convert spherical coordinates back to Cartesian coordinates
        camera.position.setFromSphericalCoords(cameraDistance, phi, theta);
        camera.position.add(modelCenter); // Translate to model center

        camera.lookAt(modelCenter);

        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    }
}

function onMouseUp() {
    isDragging = false;
}

function onMouseLeave() {
    isDragging = false;
}

function onMouseWheel(event) {
    event.preventDefault(); // Prevent default scrolling behavior

    // Adjust camera distance based on scroll direction
    if (event.deltaY < 0) {
        // Scroll up (zoom in)
        cameraDistance -= zoomSensitivity;
    } else {
        // Scroll down (zoom out)
        cameraDistance += zoomSensitivity;
    }

    // Clamp the camera distance to prevent zooming too far in or out
    cameraDistance = Math.max(minZoomDistance, Math.min(maxZoomDistance, cameraDistance));

    // Update camera position based on new distance
    camera.position.setFromSphericalCoords(cameraDistance, phi, theta);
    camera.position.add(modelCenter);
    camera.lookAt(modelCenter);
}

renderer.domElement.addEventListener('mousedown', onMouseDown);
renderer.domElement.addEventListener('mousemove', onMouseMove);
renderer.domElement.addEventListener('mouseup', onMouseUp);
// renderer.domElement.addEventListener('mouseleave', onMouseLeave);
renderer.domElement.addEventListener('wheel', onMouseWheel);
