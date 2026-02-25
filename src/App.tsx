import { Sidebar } from './components/Sidebar';
import { ModelViewer } from './components/ModelViewer';
import { Upload, Download, Settings } from 'lucide-react';
import { useStore } from './store';

function App() {
  const fileSelected = useStore((state) => state.fileSelected);

  return (
    <div className="flex h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">

      {/* Sidebar Controls */}
      <div className="w-80 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-xl flex flex-col z-10 shrink-0">
        <div className="p-4 border-b border-zinc-900 flex items-center gap-3">
          <div className="p-2 bg-primary-500/10 rounded-lg text-primary-500">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide">GLB Color Grade</h1>
            <p className="text-xs text-zinc-500">Real-time texture editing</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fileSelected ? (
            <Sidebar />
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-500">
              <Upload size={32} className="mb-4 text-zinc-700" />
              <p className="text-sm">Drag & drop a <span className="text-zinc-300 font-medium">.glb</span> file</p>
              <p className="text-xs mt-2">or click anywhere in the scene to browse</p>
            </div>
          )}
        </div>

        {fileSelected && (
          <div className="p-4 border-t border-zinc-900">
            <button
              onClick={() => {
                const store = useStore.getState();
                if (store.glbFileBuffer) {
                  import('./utils/exportGlb').then(({ exportModifiedGlb }) => {
                    exportModifiedGlb(store.glbFileBuffer as ArrayBuffer, store.activeFilters);
                  });
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-500 hover:bg-primary-500/90 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <Download size={16} />
              Export GLB
            </button>
          </div>
        )}
      </div>

      {/* Main 3D Canvas Area */}
      <div className="flex-1 relative bg-zinc-900 shadow-inner">
        <ModelViewer />

        {/* Overlay subtle drag hint if no file */}
        {!fileSelected && (
          <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-zinc-800/50 m-4 rounded-2xl flex items-center justify-center">
            <span className="text-zinc-600 font-medium tracking-widest uppercase text-xs">Drop Zone</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
