import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, ZoomIn, ZoomOut, Check, Move } from 'lucide-react';

const ImageCropperModal = ({ image, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropChange = (crop) => {
    setCrop(crop);
  };

  const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onZoomChange = (zoom) => {
    setZoom(zoom);
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return null;
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error('Canvas is empty');
          return;
        }
        const file = new File([blob], 'cropped_logo.png', { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  };

  const handleDone = async () => {
    try {
      const croppedFile = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedFile);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Move className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Adjust Company Logo</h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Drag to reposition and zoom to scale</p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative h-[400px] w-full bg-slate-50">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1 / 1}
            onCropChange={onCropChange}
            onCropComplete={onCropCompleteCallback}
            onZoomChange={onZoomChange}
            cropShape="rect"
            showGrid={true}
            classes={{
                containerClassName: "rounded-b-[40px] overflow-hidden",
                cropAreaClassName: "border-4 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] rounded-2xl"
            }}
          />
        </div>

        {/* Controls */}
        <div className="p-8 space-y-8 bg-white">
          <div className="flex items-center gap-6">
            <ZoomOut className="h-5 w-5 text-slate-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <ZoomIn className="h-5 w-5 text-slate-400" />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={onCancel}
              className="flex-1 h-16 rounded-2xl font-black text-xs tracking-widest text-slate-500 hover:bg-slate-50 transition-all uppercase"
            >
              Cancel
            </button>
            <button 
              onClick={handleDone}
              className="flex-[2] h-16 bg-[#1E3A8A] text-white rounded-3xl font-black text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-900 transition-all shadow-xl shadow-indigo-200 uppercase"
            >
              <Check className="h-5 w-5" />
              Apply & Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
