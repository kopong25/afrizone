import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import ImageUpload from "../../components/ui/ImageUpload";
import { storesAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiSave, FiArrowLeft, FiShoppingBag } from "react-icons/fi";

const COUNTRIES = ["USA", "Canada", "UK", "Germany", "France", "Netherlands", "Belgium", "Sweden", "Other"];
const BUSINESS_TYPES = ["Food & Groceries", "Fashion & Clothing", "Beauty & Hair", "Arts & Crafts", "Electronics", "Books & Media", "Health & Wellness", "Home & Living", "Other"];

export default function StoreSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", country: "USA", city: "",
    address: "", business_type: "", phone: "", website: "",
  });

  useEffect(() => {
    if (!user) { router.push("/login"); return; }
    if (user.role !== "seller" && user.role !== "admin") { router.push("/"); return; }
    storesAPI.myStore()
      .then((r) => {
        setStore(r.data);
        setForm({
          name: r.data.name || "",
          description: r.data.description || "",
          country: r.data.country || "USA",
          city: r.data.city || "",
          address: r.data.address || "",
          business_type: r.data.business_type || "",
          phone: r.data.phone || "",
          website: r.data.website || "",
        });
      })
      .catch(() => toast.error("Failed to load store"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await storesAPI.updateMyStore(form);
      setStore(res.data);
      toast.success("Store updated!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await storesAPI.uploadLogo(formData);
    setStore((s) => ({ ...s, logo_url: res.data.logo_url }));
    return res.data.logo_url;
  };

  const handleBannerUpload = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await storesAPI.uploadBanner(formData);
    setStore((s) => ({ ...s, banner_url: res.data.banner_url }));
    return res.data.banner_url;
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-40 bg-gray-200 rounded-2xl" />
        <div className="h-64 bg-gray-200 rounded-2xl" />
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-black text-gray-900">🏪 Store Settings</h1>
        </div>

        {store?.status === "pending" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-sm text-yellow-800">
            ⏳ Your store is pending approval. You can set it up now and start listing products while waiting.
          </div>
        )}

        {/* Store Images */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <FiShoppingBag size={18} /> Store Images
          </h2>

          <div className="mb-5">
            <ImageUpload
              label="Store Banner (shown at top of your store page)"
              currentUrl={store?.banner_url}
              onUpload={handleBannerUpload}
              aspect="banner"
            />
          </div>

          <div className="max-w-[160px]">
            <ImageUpload
              label="Store Logo"
              currentUrl={store?.logo_url}
              onUpload={handleLogoUpload}
              aspect="logo"
            />
          </div>
        </div>

        {/* Store Info */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-5">Store Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Store Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm" />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Tell customers about your store, products, and story..."
                className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Business Type</label>
                <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm">
                  <option value="">Select type...</option>
                  {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Country</label>
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm">
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Houston, TX"
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Website (optional)</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://yourstore.com"
                className="w-full border rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-900 text-sm" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base disabled:opacity-60">
          <FiSave size={18} />
          {saving ? "Saving..." : "Save Store Settings"}
        </button>
      </div>
      <Footer />
    </>
  );
}