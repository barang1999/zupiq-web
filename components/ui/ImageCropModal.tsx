import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { AnimatePresence, motion } from 'motion/react';
import { Check, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

async function getCroppedBlob(imageSrc: string, pixelCrop: Area, rotation: number): Promise<Blob> {
  const img = new Image();
  img.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  const maxSize = Math.max(img.width, img.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

  const rotCanvas = document.createElement('canvas');
  rotCanvas.width = safeArea;
  rotCanvas.height = safeArea;
  const rotCtx = rotCanvas.getContext('2d')!;
  rotCtx.translate(safeArea / 2, safeArea / 2);
  rotCtx.rotate((rotation * Math.PI) / 180);
  rotCtx.translate(-safeArea / 2, -safeArea / 2);
  rotCtx.drawImage(img, safeArea / 2 - img.width / 2, safeArea / 2 - img.height / 2);

  const rotData = rotCtx.getImageData(0, 0, safeArea, safeArea);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = pixelCrop.width;
  cropCanvas.height = pixelCrop.height;
  const cropCtx = cropCanvas.getContext('2d')!;
  cropCtx.putImageData(
    rotData,
    Math.round(0 - safeArea / 2 + img.width * 0.5 - pixelCrop.x),
    Math.round(0 - safeArea / 2 + img.height * 0.5 - pixelCrop.y),
  );

  return new Promise<Blob>((resolve, reject) => {
    cropCanvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.92,
    );
  });
}

interface ImageCropModalProps {
  imageSrc: string;
  fileName: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function ImageCropModal({ imageSrc, fileName, onConfirm, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
      const ext = rotation !== 0 ? 'jpg' : (fileName.match(/\.(jpe?g|png|webp|gif|bmp)$/i)?.[0] ?? '.jpg');
      const baseName = fileName.replace(/\.[^.]+$/, '');
      const croppedFile = new File([blob], `${baseName}_cropped${ext}`, { type: blob.type });
      onConfirm(croppedFile);
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
            disabled={applying}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{applying ? 'Applying…' : 'Use Photo'}</span>
          </button>
        </div>

        {/* Cropper area */}
        <div className="relative flex-1">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: { background: 'transparent' },
              cropAreaStyle: {
                border: '2px solid rgba(161,250,255,0.8)',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              },
            }}
          />
        </div>

        {/* Controls */}
        <div className="shrink-0 px-4 pb-6 pt-3 flex items-center gap-4">
          <ZoomOut className="w-4 h-4 text-on-surface-variant shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
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
      </motion.div>
    </AnimatePresence>
  );
}
