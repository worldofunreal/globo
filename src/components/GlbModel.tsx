import { useEffect, useRef } from 'react';
import { useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { processImagePixels } from '../utils/imageProcessing';

export function GlbModel() {
    const { glbFileUrl, activeFilters } = useStore();

    // Load the GLTF safely (it suspends if missing, but we only mount if glbFileUrl exists)
    const { scene } = useGLTF(glbFileUrl as string);

    // Compute bounds and center the model
    const groupRef = useRef<THREE.Group>(null);

    // We want to extract original textures *once* and keep references to them so we can re-filter them non-destructively
    const originalTexturesRef = useRef<Map<THREE.Material, {
        originalImage: HTMLImageElement | ImageBitmap | any,
        material: THREE.MeshStandardMaterial
    }>>(new Map());

    // Initialization: find all materials with base textures and store their originals
    useEffect(() => {
        if (!scene) return;

        // Clear out previous map
        originalTexturesRef.current.clear();

        scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                if (mesh.material) {
                    // Handle both single materials and arrays
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

                    materials.forEach((mat) => {
                        const standardMat = mat as THREE.MeshStandardMaterial;
                        if (standardMat.map && (standardMat.map.image || (standardMat.map as any).source?.data)) {
                            // We only want to process things we haven't seen yet
                            if (!originalTexturesRef.current.has(standardMat)) {
                                originalTexturesRef.current.set(standardMat, {
                                    originalImage: standardMat.map.image || (standardMat.map as any).source?.data,
                                    material: standardMat
                                });
                            }
                        }
                    });
                }
            }
        });
    }, [scene]);

    // When filters change, redraw 
    useEffect(() => {
        const filters = activeFilters;

        // Create an offscreen canvas for processing
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) return;

        originalTexturesRef.current.forEach(({ originalImage, material }) => {
            // Setup canvas size
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;

            // Draw original image first
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(originalImage, 0, 0);

            // Extract pixels, run selective color math, put back
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            processImagePixels(imageData, filters);
            ctx.putImageData(imageData, 0, 0);

            // Create new Threejs texture from the canvas
            const newTexture = new THREE.CanvasTexture(canvas);

            // Copy vital properties from original map if needed (flipY, colorSpace, etc)
            if (material.map) {
                newTexture.flipY = material.map.flipY;
                newTexture.colorSpace = material.map.colorSpace;
                newTexture.wrapS = material.map.wrapS;
                newTexture.wrapT = material.map.wrapT;
            }

            // Assign the new filtered texture
            material.map = newTexture;
            material.needsUpdate = true;
        });

    }, [activeFilters, scene]);

    return (
        <Center>
            <group ref={groupRef}>
                <primitive object={scene} />
            </group>
        </Center>
    );
}
