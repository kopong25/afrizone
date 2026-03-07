import { useState, useRef } from "react";
import { FiUpload, FiX, FiImage, FiLoader } from "react-icons/fi";
import toast from "react-hot-toast";

export default function ImageUpload({
  label = "Upload Image",
  currentUrl = null,
  onUpload,
  aspect = "square", // square | banner | logo
  maxSizeMB = 5,
}) {
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const aspectClass = {
    square: "aspect-square",
    banner: "aspect-[3/1]",
    logo: "aspect-square rounded-full",
  }[aspect];

  const handleFile = async (file) => {
    if (!file) return;

    // Validate type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPEG, PNG or WebP image");
      return;
    }

    // Validate size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be under ${maxSizeMB}MB`);
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const url = await onUpload(file);
      if (url) setPreview(url);
      toast.success("Image uploaded!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
      setPreview(currentUrl); // revert
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      {label && <label className="text-sm font-semibold text-gray-700 block mb-2">{label}</label>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative ${aspectClass} w-full bg-gray-100 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all ${
          dragOver ? "border-green-900 bg-green-50" : "border-gray-300 hover:border-green-900 hover:bg-gray-50"
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-semibold flex items-center gap-2">
                <FiUpload size={16} /> Change Image
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
            <FiImage size={32} className="mb-2" />
            <p className="text-sm font-medium text-center">Click or drag to upload</p>
            <p className="text-xs text-center mt-1">JPEG, PNG, WebP · Max {maxSizeMB}MB</p>
          </div>
        )}

        {/* Upload spinner overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-3 border-green-900 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-medium text-green-900">Uploading...</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <p className="text-xs text-gray-400 mt-1">Images are auto-compressed and optimized</p>
    </div>
  );
}
