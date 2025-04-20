import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import model_url from './public/3D_model/ny_room.glb';    // how parcel works

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- Initial Camera Setup
camera.position.set(0, 1.6, 2); // Start at a reasonable position (e.g., eye level, slightly back)
camera.lookAt(0, 1, 0); // Look towards the center of the scene initially
camera.rotation.order = 'YXZ'; // Use YXZ order for FPS-style rotation (Yaw, Pitch, Roll)


// Lights
const ambientLight = new THREE.AmbientLight(0x666666); // Slightly brighter ambient
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);


const loader = new GLTFLoader();

let isDragging = false; // Keep for mouse down/up state
let previousMouseX = 0;
let previousMouseY = 0;
const sensitivity = 0.002; // Mouse sensitivity for rotation (adjust as needed)

const zoomSensitivity = 0.005; // Sensitivity for scroll wheel movement

// Animation variables
let mixer;
let clock = new THREE.Clock();

// --- Camera Movement Variables ---
let isMovingForward = false;
let isMovingBackward = false;
let isMovingLeft = false;
let isMovingRight = false;
const moveSpeed = 2.0; // Units per second (might need adjustment)
const cameraDirection = new THREE.Vector3(); // To store camera's full 3D direction
const cameraRight = new THREE.Vector3();     // To store camera's calculated right direction (horizontal)
const horizontalDirection = new THREE.Vector3(); // To store horizontal component of cameraDirection
const worldUp = new THREE.Vector3(0, 1, 0); // Define world up direction globally

// --- Camera Rotation Variables ---
// We will directly modify camera.rotation using mouse movement
const maxPitch = Math.PI / 2 - 0.05; // Max look up angle (radians) - slightly less than 90 deg
const minPitch = -Math.PI / 2 + 0.05; // Min look down angle (radians)
// --- End Camera Rotation Variables ---


loader.load(
    model_url,
    function (gltf) {
        const model = gltf.scene;
        scene.add(model);

        console.log("Loaded GLTF model:", model);

        // Adjust model position/scale if needed, now that camera isn't auto-positioned
        // Example: model.position.set(0, 0, 0);
        // Example: model.scale.set(1, 1, 1);

        model.traverse(function (child) {
            if (child.isPointLight) {
                console.log("Found a PointLight:", child);
                const originalIntensity = child.intensity;
                child.intensity = originalIntensity / 1000; // Keep light adjustment
                console.log(`PointLight intensity decreased from ${originalIntensity} to ${child.intensity}`);
            }
            // Optional: Enable shadows for objects and lights if desired
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        renderer.render(scene, camera); // Initial render

        if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.loop = THREE.LoopRepeat;
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

    const delta = clock.getDelta();

    if (mixer) {
        mixer.update(delta);
    }

    // --- Handle Camera Movement (WASD) ---
    const effectiveMoveSpeed = moveSpeed * delta; // Calculate once

    // Check if *any* movement key is pressed
    if (isMovingForward || isMovingBackward || isMovingLeft || isMovingRight) {
        // 1. Get the full 3D direction the camera is looking
        camera.getWorldDirection(cameraDirection);

        // 2. Calculate the horizontal component for forward/backward movement
        horizontalDirection.copy(cameraDirection);
        horizontalDirection.y = 0;
        if (horizontalDirection.lengthSq() > 0.0001) {
             horizontalDirection.normalize();
        } // else: looking straight up/down, no horizontal forward/backward movement

        // 3. Calculate the camera's "right" vector for strafing (always horizontal)
        // cameraRight = cameraDirection x worldUp (normalized)
        cameraRight.crossVectors(cameraDirection, worldUp);
         // No need to normalize cameraRight here if only used for direction check with addScaledVector
         // Normalizing horizontalDirection is important for consistent speed
        if (cameraRight.lengthSq() < 0.0001) {
             // If looking straight up/down, cross product is zero.
             // Need to calculate right based on yaw. Get quaternion, extract yaw, calculate right.
             // Simpler alternative for now: use previous cameraRight or derive from yaw if available.
             // For simplicity, strafing might stop at poles. Let's recalculate based on horizontalDirection:
             cameraRight.set(horizontalDirection.z, 0, -horizontalDirection.x); // Perpendicular to horizontalDirection
        }
        cameraRight.normalize(); // Normalize for consistent strafe speed


        // 4. Apply movement based on keys pressed
        if (isMovingForward) {
            if (horizontalDirection.lengthSq() > 0.0001) {
                camera.position.addScaledVector(horizontalDirection, effectiveMoveSpeed);
            }
        }
        if (isMovingBackward) {
            if (horizontalDirection.lengthSq() > 0.0001) {
                camera.position.addScaledVector(horizontalDirection, -effectiveMoveSpeed);
            }
        }
        if (isMovingLeft) { // 'A' key - move left (negative right vector)
            camera.position.addScaledVector(cameraRight, -effectiveMoveSpeed);
        }
        if (isMovingRight) { // 'D' key - move right (positive right vector)
            camera.position.addScaledVector(cameraRight, effectiveMoveSpeed);
        }
    }
    // --- End Handle Camera Movement ---

    renderer.render(scene, camera);
}

animate();

// --- Event Handlers ---

function onMouseDown(event) {
    // Lock pointer for seamless rotation (optional but recommended for FPS)
    // renderer.domElement.requestPointerLock(); // Uncomment to enable pointer lock
    isDragging = true;
    previousMouseX = event.clientX;
    previousMouseY = event.clientY;
}

function onMouseMove(event) {
    // Use movementX/Y for pointer lock, otherwise calculate delta
    let deltaX, deltaY;
    // if (document.pointerLockElement === renderer.domElement) { // Check if pointer is locked
    //     deltaX = event.movementX;
    //     deltaY = event.movementY;
    // } else
    if (isDragging) { // Fallback if pointer lock isn't used/active
        deltaX = event.clientX - previousMouseX;
        deltaY = event.clientY - previousMouseY;
        previousMouseX = event.clientX;
        previousMouseY = event.clientY;
    } else {
        return; // Don't rotate if mouse button isn't down (and pointer isn't locked)
    }


    // Calculate rotation amounts
    const deltaYaw = -deltaX * sensitivity;
    const deltaPitch = -deltaY * sensitivity;

    // Apply Yaw (rotate around the world's Y axis)
    camera.rotateOnWorldAxis(worldUp, deltaYaw);

    // Apply Pitch (rotate around the camera's local X axis)
    // Need to check pitch limits *before* applying the rotation fully
    const currentPitch = camera.rotation.x;
    let potentialPitch = currentPitch + deltaPitch;

    // Clamp potential pitch
    potentialPitch = Math.max(minPitch, Math.min(maxPitch, potentialPitch));

    // Calculate the actual pitch change allowed
    const actualDeltaPitch = potentialPitch - currentPitch;

    // Apply the clamped pitch rotation
    camera.rotateX(actualDeltaPitch);
}

function onMouseUp() {
    isDragging = false;
    // Optional: Exit pointer lock if it was enabled
    // if (document.pointerLockElement === renderer.domElement) {
    //     document.exitPointerLock();
    // }
}

function onMouseLeave() {
    // If not using pointer lock, stop rotation when mouse leaves canvas
    // if (document.pointerLockElement !== renderer.domElement) {
         isDragging = false;
    // }
}

function onMouseWheel(event) {
    event.preventDefault(); // Prevent default page scrolling

    // Calculate zoom amount - positive deltaY means scrolling down/out
    const zoomAmount = event.deltaY * zoomSensitivity;

    // Get camera direction
    camera.getWorldDirection(cameraDirection);

    // Move camera forward/backward along its direction
    // Scrolling down (positive deltaY/zoomAmount) should move backward (-)
    camera.position.addScaledVector(cameraDirection, -zoomAmount);
}

// --- Consolidated Keyboard Handlers (Keep as is) ---
function onKeyDown(event) {
    switch (event.key.toLowerCase()) {
        case 'w': isMovingForward = true; break;
        case 's': isMovingBackward = true; break;
        case 'a': isMovingLeft = true; break;
        case 'd': isMovingRight = true; break;
    }
}

function onKeyUp(event) {
    switch (event.key.toLowerCase()) {
        case 'w': isMovingForward = false; break;
        case 's': isMovingBackward = false; break;
        case 'a': isMovingLeft = false; break;
        case 'd': isMovingRight = false; break;
    }
}
// --- End Consolidated Keyboard Handlers ---


// --- Add Event Listeners ---
renderer.domElement.addEventListener('mousedown', onMouseDown);
// Listen on document or window for mouse move/up to catch events even if cursor leaves canvas
document.addEventListener('mousemove', onMouseMove);
document.addEventListener('mouseup', onMouseUp);
// renderer.domElement.addEventListener('mouseleave', onMouseLeave); // Use document mouseup instead
renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false }); // Use passive: false for preventDefault

window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

// Optional: Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Optional: Pointer Lock API listeners (Uncomment if using pointer lock)
// document.addEventListener('pointerlockchange', () => {
//     if (document.pointerLockElement !== renderer.domElement) {
//         isDragging = false; // Ensure dragging stops if lock is lost unexpectedly
//     }
// });
// document.addEventListener('pointerlockerror', () => {
//     console.error('Pointer lock failed.');
// });
// --- End Add Event Listeners ---
