import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { useAuth } from "../_app";
import toast from "react-hot-toast";

const EMPTY_AD = {
  title: "",
  subtitle: "",
  cta_text: "Shop Now",
  cta_url: "/",
  image_url: "",
  emoji: "⚡",
  bg_color: "#006B3F",
  accent_color: "#FCD116",
  is_featured: false,
  sort_order: 0,
};

const COLOR_PRESETS = [
  { label: "Green",  bg: "#006B3F", accent: "#FCD116" },
  { label: "Red",    bg: "#C8102E", accent: "#FFD700" },
  { label: "Purple", bg: "#7B2D8B", accent: "#F7B5CD" },
  { label: "Dark",   bg: "#0d1117", accent: "#FCD116" },
  { label: "Orange", bg: "#1a0a00", accent: "#FF6B35" },
  { label: "Blue",   bg: "#003893", accent: "#74ACDF" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "https://afrizone-loqr.onrender.com";

function getToken() {
  if (typeof window !== "undefined") return localStorage.getItem("token") || "";
  return "";
}

export default function AdminAdsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_AD);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const fileRef = useRef();

  const featuredCount = ads.filter((a) => a.is_featured).length;

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !["admin","superadmin"].includes(user.role))) {
      router.push("/");
    }
  }, [user, authLoading]);

  useEffect(() => { fetchAds(); }, []);

  const fetchAds = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/ads/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setAds(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_AD);
    setImagePreview("");
    setShowForm(true);
  };

  const openEdit = (ad) => {
    setEditing(ad.id);
    setForm({ ...ad });
    setImagePreview(ad.image_url || "");
    setShowForm(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API}/ads/upload-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      setForm((f) => ({ ...f, image_url: data.image_url, emoji: "" }));
      setImagePreview(data.image_url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e.message);
      setImagePreview(form.image_url || "");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setForm((f) => ({ ...f, image_url: "" }));
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    try {
      const url = editing ? `${API}/ads/${editing}` : `${API}/ads/`;
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save");
      toast.success(editing ? "Ad updated" : "Ad created");
      setShowForm(false);
      fetchAds();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeature = async (ad) => {
    try {
      const res = await fetch(`${API}/ads/${ad.id}/feature`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      toast.success(ad.is_featured ? "Removed from carousel" : "Added to carousel");
      fetchAds();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const deleteAd = async (id) => {
    if (!confirm("Delete this ad?")) return;
    try {
      await fetch(`${API}/ads/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      toast.success("Ad deleted");
      fetchAds();
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (authLoading) return null;

  return (
    <>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8 min-h-screen">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Homepage Carousel Ads</h1>
            <p className="text-gray-500 text-sm mt-1">
              {featuredCount}/4 slots used · Auto-advances every 5 seconds
            </p>
          </div>
          <button onClick={openNew}
            className="bg-green-900 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-green-800 transition-colors text-sm">
            + New Ad
          </button>
        </div>

        {/* Featured slots */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[0,1,2,3].map((i) => {
            const ad = ads.filter((a) => a.is_featured)[i];
            return (
              <div key={i} className={`rounded-xl border-2 p-3 text-center transition-all ${
                ad ? "border-green-500 bg-green-50" : "border-dashed border-gray-300 bg-gray-50"
              }`}>
                {ad ? (
                  <>
                    {ad.image_url
                      ? <img src={ad.image_url} alt="" className="w-10 h-10 rounded-lg object-cover mx-auto mb-1"/>
                      : <div className="text-2xl mb-1">{ad.emoji}</div>
                    }
                    <p className="font-bold text-green-900 text-xs truncate">{ad.title}</p>
                    <p className="text-green-600 text-xs">Slot {i + 1}</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl text-gray-300 mb-1">+</div>
                    <p className="text-gray-400 text-xs">Empty slot {i + 1}</p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Ads list */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse"/>)}
          </div>
        ) : ads.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">📢</div>
            <p className="font-bold text-lg">No ads yet</p>
            <p className="text-sm mt-1">Create your first ad to show in the homepage carousel</p>
            <button onClick={openNew}
              className="mt-4 bg-green-900 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-green-800 text-sm">
              + Create First Ad
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <div key={ad.id} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${ad.bg_color}, ${ad.bg_color}88)` }}>
                  {ad.image_url
                    ? <img src={ad.image_url} alt="" className="w-full h-full object-cover"/>
                    : ad.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm">{ad.title}</p>
                    {ad.is_featured && (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
                        ● In Carousel
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs truncate">{ad.subtitle}</p>
                  <p className="text-gray-400 text-xs">→ {ad.cta_url}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => toggleFeature(ad)}
                    disabled={!ad.is_featured && featuredCount >= 4}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      ad.is_featured
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : featuredCount >= 4
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}>
                    {ad.is_featured ? "Remove" : "Feature"}
                  </button>
                  <button onClick={() => openEdit(ad)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
                    Edit
                  </button>
                  <button onClick={() => deleteAd(ad.id)}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create / Edit modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="font-black text-gray-900">{editing ? "Edit Ad" : "New Ad"}</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>

              <div className="p-6 space-y-4">

                {/* Live preview */}
                <div className="rounded-xl overflow-hidden h-20 relative flex items-center px-4 gap-3"
                  style={{ background: `linear-gradient(135deg, ${form.bg_color}, ${form.bg_color}88)` }}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.1)" }}>
                    {imagePreview
                      ? <img src={imagePreview} alt="" className="w-full h-full object-cover"/>
                      : <span className="text-2xl">{form.emoji || "⚡"}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white text-sm truncate"
                      style={{ fontFamily: "Bebas Neue, sans-serif", letterSpacing: "1px" }}>
                      {form.title || "Ad Title"}
                    </p>
                    <p className="text-xs truncate" style={{ color: `${form.accent_color}cc` }}>
                      {form.subtitle || "Subtitle text"}
                    </p>
                  </div>
                  <span className="text-xs font-black px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ background: form.accent_color, color: "#000" }}>
                    {form.cta_text} →
                  </span>
                </div>

                {/* Image upload */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">
                    Ad Image (replaces emoji)
                  </label>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="Preview"
                        className="w-24 h-24 rounded-xl object-cover border-2 border-green-500"/>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                        </div>
                      )}
                      <button onClick={removeImage}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-600">
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                      uploading ? "border-yellow-400 bg-yellow-50" : "border-gray-300 hover:border-green-500 hover:bg-green-50"
                    }`}>
                      {uploading ? (
                        <>
                          <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin mb-1"/>
                          <span className="text-xs text-green-600 font-bold">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl mb-1">📷</span>
                          <span className="text-xs text-gray-500 font-medium">Click to upload image</span>
                          <span className="text-xs text-gray-400">JPG, PNG, WebP · Max 10MB</span>
                        </>
                      )}
                      <input ref={fileRef} type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden" onChange={handleImageUpload} disabled={uploading}/>
                    </label>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Or paste a URL directly below.</p>
                  <input value={form.image_url}
                    onChange={(e) => { setForm({...form, image_url: e.target.value}); setImagePreview(e.target.value); }}
                    placeholder="https://... (optional)"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none mt-1"/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Title *</label>
                    <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                      placeholder="e.g. Fresh African Groceries"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Subtitle</label>
                    <input value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})}
                      placeholder="e.g. Delivered to your door"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Button Text</label>
                    <input value={form.cta_text} onChange={(e) => setForm({...form, cta_text: e.target.value})}
                      placeholder="Shop Now"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Emoji (if no image)</label>
                    <input value={form.emoji} onChange={(e) => setForm({...form, emoji: e.target.value})}
                      placeholder="⚡"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Link URL</label>
                    <input value={form.cta_url} onChange={(e) => setForm({...form, cta_url: e.target.value})}
                      placeholder="/?category=fashion"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                  </div>
                </div>

                {/* Color presets */}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Color Theme</label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {COLOR_PRESETS.map((p) => (
                      <button key={p.label}
                        onClick={() => setForm({...form, bg_color: p.bg, accent_color: p.accent})}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:scale-105"
                        style={{ borderColor: p.bg, background: `${p.bg}22`, color: p.bg }}>
                        <span className="w-3 h-3 rounded-full inline-block" style={{ background: p.bg }}/>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Background</label>
                      <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
                        <input type="color" value={form.bg_color}
                          onChange={(e) => setForm({...form, bg_color: e.target.value})}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"/>
                        <span className="text-xs text-gray-500 font-mono">{form.bg_color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Button / Accent</label>
                      <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
                        <input type="color" value={form.accent_color}
                          onChange={(e) => setForm({...form, accent_color: e.target.value})}
                          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"/>
                        <span className="text-xs text-gray-500 font-mono">{form.accent_color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input type="number" min="0" max="99" value={form.sort_order}
                    onChange={(e) => setForm({...form, sort_order: parseInt(e.target.value) || 0})}
                    className="w-20 border rounded-lg px-3 py-2 text-sm focus:outline-none"/>
                  <label className="text-sm text-gray-600">Sort order (0 = first)</label>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.is_featured}
                    onChange={(e) => setForm({...form, is_featured: e.target.checked})}
                    className="w-4 h-4 accent-green-900"/>
                  <span className="text-sm font-medium text-gray-700">Show in homepage carousel</span>
                  {!form.is_featured && featuredCount >= 4 && (
                    <span className="text-xs text-red-500">(carousel full)</span>
                  )}
                </label>
              </div>

              <div className="p-6 border-t flex gap-3 justify-end">
                <button onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border font-bold text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={save} disabled={saving || uploading}
                  className="px-5 py-2.5 rounded-xl bg-green-900 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-50">
                  {saving ? "Saving..." : editing ? "Save Changes" : "Create Ad"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
