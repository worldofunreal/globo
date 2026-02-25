import { useState } from 'react';
import { useStore } from '../store';
import { SlidersHorizontal, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import type { ColorChannel } from '../utils/imageProcessing';

export function Sidebar() {
    const { activeFilters, updateFilter, resetFilters } = useStore();
    const [activeChannel, setActiveChannel] = useState<ColorChannel>('master');

    const channels: { id: ColorChannel; label: string }[] = [
        { id: 'master', label: 'Master' },
        { id: 'reds', label: 'Reds' },
        { id: 'yellows', label: 'Yellows' },
        { id: 'greens', label: 'Greens' },
        { id: 'cyans', label: 'Cyans' },
        { id: 'blues', label: 'Blues' },
        { id: 'magentas', label: 'Magentas' },
        { id: 'shadows', label: 'Shadows' },
        { id: 'midtones', label: 'Midtones' },
        { id: 'highlights', label: 'Highlights' }
    ];

    const currentFilters = activeFilters[activeChannel];

    return (
        <div className="flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-zinc-900/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <SlidersHorizontal size={16} />
                        <h2 className="text-sm font-medium">Selective Color</h2>
                    </div>
                    <button
                        onClick={resetFilters}
                        className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                        title="Reset Filters"
                    >
                        <RefreshCcw size={14} />
                    </button>
                </div>

                {/* Channel Selector */}
                <div className="mb-6">
                    <label className="text-xs font-medium text-zinc-400 block mb-2">Color Channel</label>
                    <select
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 p-2 outline-none focus:border-primary-500 transition-colors"
                        value={activeChannel}
                        onChange={(e) => setActiveChannel(e.target.value as ColorChannel)}
                    >
                        {channels.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                    </select>
                </div>

                <div className="space-y-5">
                    {/* Hue Rotation Offset (-180 to 180) */}
                    <FilterSlider
                        label="Hue Offset"
                        value={currentFilters.hue}
                        min={-180} max={180}
                        unit="°"
                        onChange={(v) => updateFilter(activeChannel, 'hue', v)}
                    />

                    {/* Saturation Offset (-100 to 100) */}
                    <FilterSlider
                        label="Saturation"
                        value={currentFilters.saturation}
                        min={-100} max={100}
                        unit="%"
                        onChange={(v) => updateFilter(activeChannel, 'saturation', v)}
                    />

                    {/* Lightness Offset (-100 to 100) */}
                    <FilterSlider
                        label="Lightness"
                        value={currentFilters.lightness}
                        min={-100} max={100}
                        unit="%"
                        onChange={(v) => updateFilter(activeChannel, 'lightness', v)}
                    />

                    <div className="pt-4 mt-2 border-t border-zinc-800/50 space-y-5">
                        <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">CMYK Tinters</label>

                        <FilterSlider
                            label="Cyan"
                            value={currentFilters.cyan}
                            min={-100} max={100}
                            unit="%"
                            onChange={(v) => updateFilter(activeChannel, 'cyan', v)}
                        />
                        <FilterSlider
                            label="Magenta"
                            value={currentFilters.magenta}
                            min={-100} max={100}
                            unit="%"
                            onChange={(v) => updateFilter(activeChannel, 'magenta', v)}
                        />
                        <FilterSlider
                            label="Yellow"
                            value={currentFilters.yellow}
                            min={-100} max={100}
                            unit="%"
                            onChange={(v) => updateFilter(activeChannel, 'yellow', v)}
                        />
                        <FilterSlider
                            label="Black"
                            value={currentFilters.black}
                            min={-100} max={100}
                            unit="%"
                            onChange={(v) => updateFilter(activeChannel, 'black', v)}
                        />
                    </div>

                    {/* Global Contrast (Only visible correctly logically at the bottom if Master, but keeping it visible always is fine) */}
                    <div className="pt-4 mt-2 border-t border-zinc-800/50">
                        <FilterSlider
                            label="Global Contrast"
                            value={activeFilters.contrast}
                            min={-100} max={100}
                            unit="%"
                            onChange={(v) => updateFilter('master', 'contrast', v)}
                        />
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="flex items-center gap-2 text-zinc-400 mb-3">
                    <ImageIcon size={14} />
                    <h3 className="text-xs font-medium uppercase tracking-wider">Active Textures</h3>
                </div>
                <div className="text-xs text-zinc-500 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800/50">
                    Selective processing active. Changes are updated in real-time. Full resolution baked on export.
                </div>
            </div>
        </div>
    );
}

function FilterSlider({
    label,
    value,
    min,
    max,
    unit,
    onChange
}: {
    label: string,
    value: number,
    min: number,
    max: number,
    unit: string,
    onChange: (val: number) => void
}) {
    return (
        <div className="group">
            <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{label}</label>
                <span className="text-xs text-primary-400 font-mono bg-primary-500/10 px-1.5 py-0.5 rounded">
                    {value > 0 ? '+' : ''}{value}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:accent-primary-400"
            />
        </div>
    );
}
