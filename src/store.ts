import { create } from 'zustand';
import type { ColorChannel, SelectiveColorState, ChannelFilters } from './utils/imageProcessing';

interface EditorState {
    fileSelected: boolean;
    glbFileUrl: string | null;
    glbFileBuffer: ArrayBuffer | null;

    // V2 Photoshop style selective colors
    activeFilters: SelectiveColorState;

    setGlbFile: (url: string, buffer: ArrayBuffer) => void;
    updateFilter: (channel: ColorChannel, key: keyof ChannelFilters | 'contrast', value: number) => void;
    resetFilters: () => void;
}

const defaultChannel: ChannelFilters = {
    hue: 0,
    saturation: 0,
    lightness: 0,
    cyan: 0,
    magenta: 0,
    yellow: 0,
    black: 0
};

const defaultFilters: () => SelectiveColorState = () => ({
    master: { ...defaultChannel },
    reds: { ...defaultChannel },
    yellows: { ...defaultChannel },
    greens: { ...defaultChannel },
    cyans: { ...defaultChannel },
    blues: { ...defaultChannel },
    magentas: { ...defaultChannel },
    shadows: { ...defaultChannel },
    midtones: { ...defaultChannel },
    highlights: { ...defaultChannel },
    contrast: 0
});

export const useStore = create<EditorState>((set) => ({
    fileSelected: false,
    glbFileUrl: null,
    glbFileBuffer: null,
    activeFilters: defaultFilters(),

    setGlbFile: (url, buffer) => set({
        fileSelected: true,
        glbFileUrl: url,
        glbFileBuffer: buffer,
        activeFilters: defaultFilters()
    }),

    // Handle all nested channel updates dynamically
    updateFilter: (channel, key, value) => set((state) => {
        // Contrast is special and stored at root level
        if (key === 'contrast') {
            return {
                activeFilters: { ...state.activeFilters, contrast: value }
            };
        }

        // Standard H/S/L is nested under the specific channel
        return {
            activeFilters: {
                ...state.activeFilters,
                [channel]: {
                    ...state.activeFilters[channel],
                    [key]: value
                }
            }
        };
    }),

    resetFilters: () => set({ activeFilters: defaultFilters() })
}));
