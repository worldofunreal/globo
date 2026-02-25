import React, { useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useStore } from '../store';
import { Upload } from 'lucide-react';
import { GlbModel } from './GlbModel';
export function ModelViewer() {
    const { fileSelected, setGlbFile } = useStore();

    const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.name.toLowerCase().endsWith('.glb')) {
                const url = URL.createObjectURL(file);

                // Also read buffer for export later
                const reader = new FileReader();
                reader.onload = (event) => {
                    const buffer = event.target?.result as ArrayBuffer;
                    setGlbFile(url, buffer);
                };
                reader.readAsArrayBuffer(file);
            } else {
                alert("Please drop a .glb file.");
            }
        }
    }, [setGlbFile]);

    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    return (
        <div
            className="w-full h-full relative"
            onDrop={onDrop}
            onDragOver={onDragOver}
        >
            {!fileSelected && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="bg-zinc-900/80 backdrop-blur-sm p-8 rounded-2xl border border-zinc-800/50 shadow-2xl flex flex-col items-center">
                        <div className="p-4 bg-zinc-800 rounded-full mb-4 text-zinc-400">
                            <Upload size={32} />
                        </div>
                        <h2 className="text-xl font-semibold text-zinc-200 mb-2">Drop GLB File Here</h2>
                        <p className="text-zinc-500 text-sm">Preview and edit texture colors in real-time</p>
                    </div>
                </div>
            )}

            {fileSelected && (
                <Canvas shadows camera={{ position: [0, 1.5, 3], fov: 50 }}>
                    <color attach="background" args={['#18181b']} /> {/* zinc-900 to match UI */}
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

                    <Suspense fallback={null}>
                        <GlbModel />
                        <Environment preset="city" />
                        <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
                    </Suspense>

                    <OrbitControls makeDefault autoRotate autoRotateSpeed={0.5} />
                </Canvas>
            )}
        </div>
    );
}
