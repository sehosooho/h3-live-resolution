export function snapToMultiple(value, multiple) {
    const safeMultiple = Math.max(1, Math.round(Number(multiple) || 1));
    return Math.max(safeMultiple, Math.round(Number(value) / safeMultiple) * safeMultiple);
}

export function fitResolution(sourceWidth, sourceHeight, megapixels, multiple = 32) {
    const width = Number(sourceWidth);
    const height = Number(sourceHeight);
    const targetMp = Number(megapixels);
    if (!(width > 0) || !(height > 0)) {
        throw new Error("The input image size is unavailable.");
    }
    if (!(targetMp > 0)) {
        throw new Error("Megapixels must be greater than zero.");
    }

    const targetPixels = targetMp * 1_000_000;
    const aspectRatio = width / height;
    const rawWidth = Math.sqrt(targetPixels * aspectRatio);
    const rawHeight = Math.sqrt(targetPixels / aspectRatio);
    const outputWidth = snapToMultiple(rawWidth, multiple);
    const outputHeight = snapToMultiple(rawHeight, multiple);

    return {
        width: outputWidth,
        height: outputHeight,
        actualMegapixels: outputWidth * outputHeight / 1_000_000,
    };
}
