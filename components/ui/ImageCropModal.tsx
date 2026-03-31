import { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

// ─── Canvas helpers ────────────────────────────────────────────────────────────

/** Rotate imageSrc by `degrees` and return a new object URL. */
async function rotateSrc(src: string, degrees: number): Promise<string> {
  if (degrees === 0) return src;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const rad = (degrees * Math.PI) / 180;
      const sin = Math.abs(Math.sin(rad));
      const cos = Math.abs(Math.cos(rad));
      const w = Math.round(img.width * cos + img.height * sin);
      const h = Math.round(img.width * sin + img.height * cos);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.translate(w / 2, h / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      canvas.toBlob(
        (blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error('toBlob failed'))),
        'image/jpeg', 0.92,
      );
    };
    img.onerror = () => reject(new Error('load failed'));
    img.src = src;
  });
}

/** Extract the pixel-crop region from the displayed <img> element. */
async function getCroppedBlob(imgEl: HTMLImageElement, pixelCrop: PixelCrop): Promise<Blob> {
  const scaleX = imgEl.naturalWidth / imgEl.width;
  const scaleY = imgEl.naturalHeight / imgEl.height;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(pixelCrop.width * scaleX);
  canvas.height = Math.round(pixelCrop.height * scaleY);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    imgEl,
    pixelCrop.x * scaleX, pixelCrop.y * scaleY,
    pixelCrop.width * scaleX, pixelCrop.height * scaleY,
    0, 0, canvas.width, canvas.height,
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
      'image/jpeg', 0.92,
    ),
  );
}

// ─── Aspect presets ────────────────────────────────────────────────────────────

const ASPECT_PRESETS = [
  { label: 'Free', value: undefined },
  { label: '1:1',  value: 1 },
  { label: '4:3',  value: 4 / 3 },
  { label: '3:4',  value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

interface ImageCropModalProps {
  imageSrc: string;
  fileName: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageSrc, fileName, onConfirm, onCancel }: ImageCropModalProps) {
  const [rotation, setRotation] = useState(0);
  const [displaySrc, setDisplaySrc] = useState(imageSrc);
  const [aspectIndex, setAspectIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [applying, setApplying] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  // Track rotated object URLs so we can revoke them on cleanup
  const rotatedUrlRef = useRef<string | null>(null);

  // Re-rotate source when rotation changes
  useEffect(() => {
    let cancelled = false;
    rotateSrc(imageSrc, rotation).then((url) => {
      if (cancelled) return;
      if (rotatedUrlRef.current && rotatedUrlRef.current !== imageSrc) {
        URL.revokeObjectURL(rotatedUrlRef.current);
      }
      rotatedUrlRef.current = url === imageSrc ? null : url;
      setDisplaySrc(url);
      setCrop(undefined); // reset crop on rotation
    });
    return () => { cancelled = true; };
  }, [imageSrc, rotation]);

  // Cleanup rotated URL on unmount
  useEffect(() => () => {
    if (rotatedUrlRef.current) URL.revokeObjectURL(rotatedUrlRef.current);
  }, []);

  const aspect = ASPECT_PRESETS[aspectIndex].value;

  /** When the image loads, set a sensible default crop covering ~80% of the image. */
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (aspect !== undefined) {
      setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 80 }, aspect, width, height), width, height));
    } else {
      setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
    }
  }, [aspect]);

  // When aspect changes, recompute crop to match
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    if (aspect !== undefined) {
      setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 80 }, aspect, el.width, el.height), el.width, el.height));
    } else {
      setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectIndex]);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const ext = rotation !== 0 ? '.jpg' : (fileName.match(/\.(jpe?g|png|webp|gif|bmp)$/i)?.[0] ?? '.jpg');
      const baseName = fileName.replace(/\.[^.]+$/, '');
      onConfirm(new File([blob], `${baseName}_cropped${ext}`, { type: blob.type }));
    } catch {
      setApplying(false);
    }
  };

  const rotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] flex flex-col bg-black/92 backdrop-blur-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
          <span className="text-sm font-medium text-on-surface tracking-wide">Crop Image</span>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={applying || !completedCrop}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{applying ? 'Applying…' : 'Use Photo'}</span>
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={aspect}
            className="max-h-full max-w-full"
          >
            <img
              ref={imgRef}
              src={displaySrc}
              alt="crop preview"
              style={{ transform: `scale(${scale})`, transformOrigin: 'center', maxHeight: 'calc(100vh - 200px)', maxWidth: '100%' }}
              onLoad={onImageLoad}
            />
          </ReactCrop>
        </div>

        {/* Controls */}
        <div className="shrink-0 px-4 pb-6 pt-3 space-y-3">
          {/* Aspect ratio presets */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {ASPECT_PRESETS.map((preset, i) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setAspectIndex(i)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  aspectIndex === i
                    ? 'bg-primary text-on-primary'
                    : 'bg-white/8 text-on-surface-variant hover:bg-white/14'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Zoom + rotate */}
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-on-surface-variant shrink-0" />
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.01}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="flex-1 accent-primary h-1"
              aria-label="Zoom"
            />
            <ZoomIn className="w-4 h-4 text-on-surface-variant shrink-0" />
            <button
              type="button"
              onClick={rotate}
              className="ml-2 p-2 rounded-full bg-white/8 hover:bg-white/14 transition-colors"
              aria-label="Rotate 90°"
            >
              <RotateCw className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
