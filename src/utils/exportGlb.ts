import { WebIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import type { SelectiveColorState } from '../utils/imageProcessing';
import { processImagePixels } from '../utils/imageProcessing';

/**
 * Applies the advanced pixel manipulation filters to the given raw image buffer and returns the new image buffer.
 */
async function applyFiltersToBuffer(buffer: Uint8Array, mimeType: string, filters: SelectiveColorState): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        // Some TS environments complain about Uint8Array vs ArrayBufferView, so we specifically extract the ArrayBuffer instance
        const cleanBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
        const blob = new Blob([cleanBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas context not available'));

            // Draw original
            ctx.drawImage(img, 0, 0);

            // Extract pixels, run selective color math, put back
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            processImagePixels(imageData, filters);
            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob((newBlob) => {
                if (!newBlob) return reject(new Error('Failed to create blob from canvas'));
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        resolve(new Uint8Array(e.target.result as ArrayBuffer));
                    } else {
                        reject(new Error('Failed to read baked buffer'));
                    }
                };
                reader.readAsArrayBuffer(newBlob);
            }, mimeType || 'image/png'); // Default to PNG if missing
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image from buffer'));
        };
        img.src = url;
    });
}

/**
 * Reads original GLB, applies filters to all base color textures, and triggers a download.
 */
export async function exportModifiedGlb(originalBuffer: ArrayBuffer, filters: SelectiveColorState, originalFileName: string = 'model.glb') {
    try {
        const io = new WebIO().registerExtensions(KHRONOS_EXTENSIONS);

        // Convert ArrayBuffer to Uint8Array for glTF-transform
        const glbData = new Uint8Array(originalBuffer);
        const gltfDocument = await io.readBinary(glbData);

        const materials = gltfDocument.getRoot().listMaterials();

        // Keep track of textures we've already processed to avoid double-processing shared textures
        const processedTextures = new Set();

        for (const mat of materials) {
            // Base color texture
            const baseColorTextureInfo = mat.getBaseColorTexture();
            if (baseColorTextureInfo) {
                const texture = baseColorTextureInfo;
                if (texture && !processedTextures.has(texture)) {
                    processedTextures.add(texture);
                    const imageBuffer = texture.getImage();
                    const mimeType = texture.getMimeType();

                    if (imageBuffer && mimeType) {
                        // Apply our color grading to the buffer
                        const newImageBuffer = await applyFiltersToBuffer(imageBuffer, mimeType, filters);
                        texture.setImage(newImageBuffer);
                    }
                }
            }
        }

        // Export back to GLB
        const newGlbBuffer = await io.writeBinary(gltfDocument);

        // Trigger download
        const blob = new Blob([newGlbBuffer], { type: 'model/gltf-binary' });
        const localUrl = URL.createObjectURL(blob);

        const a = globalThis.document.createElement('a');
        a.href = localUrl;
        a.download = originalFileName.replace('.glb', '_graded.glb');
        globalThis.document.body.appendChild(a);
        a.click();

        // Cleanup
        setTimeout(() => {
            globalThis.document.body.removeChild(a);
            URL.revokeObjectURL(localUrl);
        }, 100);

    } catch (error) {
        console.error("Failed to export GLB:", error);
        alert("Failed to export GLB. See console for details.");
    }
}
