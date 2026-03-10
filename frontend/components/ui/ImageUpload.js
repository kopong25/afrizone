import { useState, useRef } from "react";
import { FiUpload, FiX, FiImage, FiAlertCircle } from "react-icons/fi";
import toast from "react-hot-toast";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export default function ImageUpload({
  label = "Upload Image",
  currentUrl = null,
  onUpload,
  aspect = "square",
  maxSizeMB = 5,
}) {
  const [preview, setPreview] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const aspectClass = {
    square: "aspect-square",
    banner: "aspect-[3/1]",
    logo: "aspect-square rounded-full",
  }[aspect];

  const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
  const ACCEPTED_LABEL = "PNG, JPG or WebP";

  const handleFile = async (file) => {
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error(`Please upload a ${ACCEPTED_LABEL} image`);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be under ${maxSizeMB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    setProgress(0);

    try {
      let url;

      // Direct Cloudinary upload (fast, no backend)
      if (CLOUD_NAME && UPLOAD_PRESET) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", "afrizone/products");

        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };

        url = await new Promise((resolve, reject) => {
          xhr.onload = () => {
            if (xhr.status === 200) {
              const res = JSON.parse(xhr.responseText);
              resolve(res.secure_url);
            } else {
              reject(new Error("Upload failed"));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
          xhr.send(formData);
        });
      } else {
        // Fallback: upload via backend
        url = await onUpload(file);
      }

      if (url) {
        setPreview(url);
        onUpload && onUpload(null, url); // pass url directly
        toast.success("✅ Image uploaded!");
      }
    } catch (err) {
      toast.error("Upload failed — check your connection and try again");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div>
      {label && <label className="text-sm font-semibold text-gray-700 block mb-2">{label}</label>}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative ${aspectClass} w-full bg-gray-50 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all ${
          dragOver ? "border-green-900 bg-green-50" : "border-gray-300 hover:border-green-700 hover:bg-gray-100"
        }`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-bold flex items-center gap-2 bg-black/30 px-3 py-2 rounded-lg">
                <FiUpload size={14} /> Change Image
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
            <FiImage size={36} className="mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-500">Click or drag image here</p>
            <p className="text-xs text-gray-400 mt-1">{ACCEPTED_LABEL} · Max {maxSizeMB}MB</p>
            <p className="text-xs text-gray-400">Recommended: 800×800px or larger</p>
          </div>
        )}

        {/* Progress overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full border-4 border-green-100 border-t-green-900 animate-spin" />
            <div className="w-3/4">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-900 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-center text-gray-500 mt-1 font-medium">{progress > 0 ? `${progress}%` : "Uploading..."}</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />

      <div className="flex items-center gap-1.5 mt-1.5">
        <FiImage size={11} className="text-gray-400" />
        <p className="text-xs text-gray-400">
          <strong>PNG, JPG or WebP</strong> · Max {maxSizeMB}MB · Recommended 800×800px minimum
        </p>
      </div>
    </div>
  );
}