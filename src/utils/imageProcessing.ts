/**
 * HSL and RGB Conversion utilities and Pixel Manipulation
 * for Photoshop-style Selective Color
 */

// Colors: R(0), Y(60), G(120), C(180), B(240), M(300)
export type ColorChannel = 'master' | 'reds' | 'yellows' | 'greens' | 'cyans' | 'blues' | 'magentas'
    | 'shadows' | 'midtones' | 'highlights';

export interface ChannelFilters {
    hue: number;        // -180 to 180
    saturation: number; // -100 to 100
    lightness: number;  // -100 to 100
    // CMYK tinters (Photoshop style: adding Cyan reduces Red, etc)
    cyan: number;       // -100 to 100
    magenta: number;    // -100 to 100
    yellow: number;     // -100 to 100
    black: number;      // -100 to 100
}

export type SelectiveColorState = Record<ColorChannel, ChannelFilters> & {
    contrast: number; // Global contrast only (applied at the end)
};

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h in [0, 360], s and l in [0, 1].
 */
export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h * 360, s, l];
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h is contained in [0, 360] and s and l are contained
 * in [0, 1], and returns r, g, and b in the set [0, 255].
 */
export function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r, g, b;

    h = ((h % 360) + 360) % 360; // ensure positive
    h /= 360;

    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;

        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Calculates how much a given hue belongs to a target hue.
 * Uses a triangular falloff where 1 is perfect match, and 0 is out of bounds.
 * Falloff is usually 60 degrees (distance to next primary/secondary color).
 */
function getHueWeight(pixelHue: number, targetHue: number, falloff: number = 60): number {
    // Find shortest distance on color wheel (0-360)
    let diff = Math.abs(pixelHue - targetHue);
    diff = Math.min(diff, 360 - diff);

    if (diff >= falloff) return 0;

    // Return linear falloff mapped to 0-1
    // e.g., if diff is 0, returns 1. If diff is 60, returns 0.
    // Using an optimized curve (ease-in-out) can prevent banding
    let rawWeight = 1 - (diff / falloff);

    // Smoothstep for softer transitions
    return rawWeight * rawWeight * (3 - 2 * rawWeight);
}

/**
 * Calculates weight for tonal ranges based on lightness (0-1).
 */
function getToneWeight(pixelL: number, toneType: 'shadows' | 'midtones' | 'highlights'): number {
    let weight = 0;
    if (toneType === 'shadows') {
        weight = Math.max(0, 1 - (pixelL / 0.5));
    } else if (toneType === 'highlights') {
        weight = Math.max(0, (pixelL - 0.5) / 0.5);
    } else if (toneType === 'midtones') {
        weight = Math.max(0, 1 - (Math.abs(pixelL - 0.5) / 0.5));
    }
    // Smoothstep mapping
    return weight * weight * (3 - 2 * weight);
}

// Map color names to their ideal Hue angles
const CHANNEL_HUES: Record<Exclude<ColorChannel, 'master' | 'shadows' | 'midtones' | 'highlights'>, number> = {
    reds: 0,
    yellows: 60,
    greens: 120,
    cyans: 180,
    blues: 240,
    magentas: 300
};

/**
 * Applies Selective Color filters and global filters to an ImageData object.
 * Mutates the provided ImageData directly for performance.
 */
export function processImagePixels(imageData: ImageData, filters: SelectiveColorState) {
    const data = imageData.data;
    const len = data.length;

    // Pre-calculate contrast factor
    const c = filters.contrast;
    const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));

    // Loop every pixel (stride = 4: R, G, B, A)
    for (let i = 0; i < len; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];
        const a = data[i + 3];

        // Skip fully transparent pixels to save time
        if (a === 0) continue;

        // 1. Convert to HSL
        let [h, s, l] = rgbToHsl(r, g, b);

        // 2. Compute selective color weights
        // If a pixel is orange (h=30), it will be 50% red and 50% yellow (roughly).

        // Accumulators for the final offsets
        let hOffset = 0;
        let sOffset = 0;
        let lOffset = 0;

        // Evaluate each of the 6 specific color channels
        const channels = Object.keys(CHANNEL_HUES) as Array<Exclude<ColorChannel, 'master' | 'shadows' | 'midtones' | 'highlights'>>;
        for (const channel of channels) {
            const targetHue = CHANNEL_HUES[channel];
            const weight = getHueWeight(h, targetHue, 60);

            if (weight > 0) {
                // Also scale effect by how saturated it is (grays shouldn't shift if we target Reds)
                // Adding a small minimum allows near-grays to be tinted slightly, but primarily we multiply by saturation.
                const satWeight = Math.min(1, s + 0.1);
                const finalWeight = weight * satWeight;

                hOffset += filters[channel].hue * finalWeight;
                sOffset += filters[channel].saturation * finalWeight;
                lOffset += filters[channel].lightness * finalWeight;
            }
        }

        // Evaluate Tonal channels (Shadows, Midtones, Highlights) based on lightness
        const tonalChannels: ('shadows' | 'midtones' | 'highlights')[] = ['shadows', 'midtones', 'highlights'];
        for (const channel of tonalChannels) {
            const weight = getToneWeight(l, channel);

            if (weight > 0) {
                // Tonal edits apply to all pixels equally relative to their lightness, regardless of saturation
                hOffset += filters[channel].hue * weight;
                sOffset += filters[channel].saturation * weight;
                lOffset += filters[channel].lightness * weight;
            }
        }

        // 3. Apply Master offsets (always applies 1.0 weight)
        hOffset += filters.master.hue;
        sOffset += filters.master.saturation;
        lOffset += filters.master.lightness;

        // Apply accumulated offsets
        h = (h + hOffset) % 360;
        if (h < 0) h += 360; // Keep in 0-360 range

        s = Math.max(0, Math.min(1, s + (sOffset / 100)));
        l = Math.max(0, Math.min(1, l + (lOffset / 100)));

        // 4. Convert back to RGB
        let [newR, newG, newB] = hslToRgb(h, s, l);

        // 5. Apply CMYK offsets per channel (Photoshop style Selective Color)
        // In Photoshop, adding "Cyan" to a channel actually subtracts Red from pixels weighted to that channel.
        let cShift = 0, mShift = 0, yShift = 0, kShift = 0;

        const allChannels = ['master', 'reds', 'yellows', 'greens', 'cyans', 'blues', 'magentas', 'shadows', 'midtones', 'highlights'] as ColorChannel[];
        for (const channelName of allChannels) {
            let weight = 0;
            if (channelName === 'master') {
                weight = 1;
            } else if (CHANNEL_HUES[channelName as keyof typeof CHANNEL_HUES] !== undefined) {
                weight = getHueWeight(h, CHANNEL_HUES[channelName as keyof typeof CHANNEL_HUES], 60) * Math.min(1, s + 0.1);
            } else {
                weight = getToneWeight(l, channelName as 'shadows' | 'midtones' | 'highlights');
            }

            if (weight > 0) {
                cShift += (filters[channelName].cyan / 100) * weight;
                mShift += (filters[channelName].magenta / 100) * weight;
                yShift += (filters[channelName].yellow / 100) * weight;
                kShift += (filters[channelName].black / 100) * weight;
            }
        }

        // Apply CMYK shifts subtractively
        // Cyan affects Red, Magenta affects Green, Yellow affects Blue
        // Black affects all
        newR = Math.max(0, Math.min(255, newR * (1 - cShift) * (1 - kShift)));
        newG = Math.max(0, Math.min(255, newG * (1 - mShift) * (1 - kShift)));
        newB = Math.max(0, Math.min(255, newB * (1 - yShift) * (1 - kShift)));

        r = newR;
        g = newG;
        b = newB;

        // 6. Apply Global Contrast
        if (filters.contrast !== 0) {
            r = Math.max(0, Math.min(255, contrastFactor * (r - 128) + 128));
            g = Math.max(0, Math.min(255, contrastFactor * (g - 128) + 128));
            b = Math.max(0, Math.min(255, contrastFactor * (b - 128) + 128));
        }

        // 6. Write back
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        // Alpha remains unchanged
    }
}
