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
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (error) => reject(error));
      img.setAttribute('crossOrigin', 'anonymous');
      img.src = url;
    });

  const getCroppedImg = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

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
        if (!blob) return;
        const file = new File([blob], 'cropped_logo.png', { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  };

  const handleSave = async () => {
    try {
      const croppedFile = await getCroppedImg(image, croppedAreaPixels);
      onCropComplete(croppedFile);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0E1B2E]/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-white max-w-2xl w-full border border-gray-200 overflow-hidden flex flex-col shadow-2xl rounded-none">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
           <h3 className="text-xl font-bold text-[#0E1B2E] uppercase tracking-tight">Identity Precision</h3>
           <button onClick={onCancel} className="text-gray-400 hover:text-[#0E1B2E] transition-colors">
              <X className="h-5 w-5" />
           </button>
        </div>
        
        <div className="relative h-[400px] w-full bg-gray-100/50">
           <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1 / 1}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={onZoomChange}
              classes={{
                containerClassName: "rounded-none",
                cropAreaClassName: "border-2 border-white rounded-none shadow-[0_0_0_9999px_rgba(14,27,46,0.6)]"
              }}
           />
        </div>

        <div className="p-8 border-t border-gray-100 bg-white space-y-6">
           <div className="flex items-center gap-6">
              <ZoomOut className="h-4 w-4 text-gray-400" />
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1 bg-gray-100 rounded-full appearance-none cursor-pointer accent-[#0E1B2E]"
              />
              <ZoomIn className="h-4 w-4 text-gray-400" />
           </div>

           <div className="flex gap-4">
              <button 
                onClick={onCancel}
                className="flex-1 h-11 border border-gray-200 text-[#0E1B2E] font-bold text-[10px] tracking-widest uppercase hover:bg-gray-50 transition-colors"
              >
                Discard
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 h-11 bg-[#0E1B2E] text-white font-bold text-[10px] tracking-widest uppercase hover:opacity-90 transition-opacity"
              >
                Confirm Crop
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
