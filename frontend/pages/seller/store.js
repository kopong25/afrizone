import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import ImageUpload from "../../components/ui/ImageUpload";
import { storesAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiSave, FiArrowLeft, FiShoppingBag, FiTruck, FiPackage, FiMapPin } from "react-icons/fi";

const COUNTRIES = ["USA", "Canada", "UK", "Germany", "France", "Netherlands", "Belgium", "Sweden", "Other"];
const BUSINESS_TYPES = ["Restaurant", "Food & Groceries", "Fashion & Clothing", "Beauty & Hair", "Arts & Crafts", "Electronics", "Books & Media", "Health & Wellness", "Home & Living", "Other"];

const VENDOR_TYPES = [
  { value: "grocery",    label: "🛒 Grocery / Shelf-stable Food", desc: "Fufu, garri, spices, canned goods — ships nationwide via USPS" },
  { value: "restaurant", label: "🍽️ Restaurant / Hot Food",        desc: "Jollof rice, suya, pepper soup — local delivery only" },
  { value: "fashion",    label: "👗 Fashion & Clothing",            desc: "Ankara, Kente, traditional wear — ships nationwide" },
  { value: "beauty",     label: "💄 Beauty & Hair",                 desc: "African hair products, cosmetics — ships nationwide" },
  { value: "other",      label: "📦 Other",                         desc: "Anything else" },
];

const DELIVERY_TYPES = [
  { value: "shipping",       icon: "📬", label: "Shipping Only",          desc: "Ship orders via USPS nationwide" },
  { value: "local_delivery", icon: "🛵", label: "Local Delivery (Uber)",  desc: "Deliver locally via Uber Direct" },
  { value: "pickup",         icon: "🏪", label: "Pickup Only",            desc: "Customers come to your location" },
  { value: "both",           icon: "🔀", label: "Shipping + Pickup",      desc: "Offer both shipping and in-store pickup" },
];

export default function StoreSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", country: "USA", city: "",
    address: "", business_type: "", phone: "", website: "",
    vendor_type: "other", delivery_type: "shipping",
    delivery_radius_miles: "", delivery_note: "",
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
          vendor_type: r.data.vendor_type || "other",
          delivery_type: r.data.delivery_type || "shipping",
          is_open_now: r.data.is_open_now !== undefined ? r.data.is_open_now : true,
          prep_time_minutes: r.data.prep_time_minutes || 30,
          opening_hours: r.data.opening_hours || "",
          weekly_hours: r.data.weekly_hours ? JSON.parse(r.data.weekly_hours) : {
            Monday:    {open:"11:00",close:"21:00",closed:false},
            Tuesday:   {open:"11:00",close:"21:00",closed:false},
            Wednesday: {open:"11:00",close:"21:00",closed:false},
            Thursday:  {open:"11:00",close:"21:00",closed:false},
            Friday:    {open:"11:00",close:"22:00",closed:false},
            Saturday:  {open:"12:00",close:"22:00",closed:false},
            Sunday:    {open:"12:00",close:"20:00",closed:false},
          },
          delivery_radius_miles: r.data.delivery_radius_miles || "",
          delivery_note: r.data.delivery_note || "",
        });
      })
      .catch(() => toast.error("Failed to load store"))
      .finally(() => setLoading(false));
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        delivery_radius_miles: form.delivery_radius_miles ? parseInt(form.delivery_radius_miles) : null,
      };
      const res = await storesAPI.updateMyStore(payload);
      setStore(res.data);
      toast.success("Store updated!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file, directUrl) => {
    if (directUrl) {
      // Image was uploaded directly to Cloudinary — save URL to backend
      try {
        await storesAPI.updateMyStore({ logo_url: directUrl });
        setStore((s) => ({ ...s, logo_url: directUrl }));
      } catch (e) {
        toast.error("Could not save logo to store");
      }
      return directUrl;
    }
    // Fallback: upload via backend
    const formData = new FormData();
    formData.append("file", file);
    const res = await storesAPI.uploadLogo(formData);
    setStore((s) => ({ ...s, logo_url: res.data.logo_url }));
    return res.data.logo_url;
  };

  const handleBannerUpload = async (file, directUrl) => {
    if (directUrl) {
      // Image was uploaded directly to Cloudinary — save URL to backend
      try {
        await storesAPI.updateMyStore({ banner_url: directUrl });
        setStore((s) => ({ ...s, banner_url: directUrl }));
      } catch (e) {
        toast.error("Could not save banner to store");
      }
      return directUrl;
    }
    // Fallback: upload via backend
    const formData = new FormData();
    formData.append("file", file);
    const res = await storesAPI.uploadBanner(formData);
    setStore((s) => ({ ...s, banner_url: res.data.banner_url }));
    return res.data.banner_url;
  };

  const isLocalDelivery = ["local_delivery", "both"].includes(form.delivery_type);
  const isRestaurant = form.vendor_type === "restaurant";

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

        {/* Restaurant notice */}
        {isRestaurant && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-800 flex gap-3">
            <span className="text-2xl">🍽️</span>
            <div>
              <p className="font-bold">Restaurant vendor — local delivery mode</p>
              <p className="mt-0.5 text-green-700">Your store will only show to customers in your delivery area. We are integrating Uber Direct for automated driver dispatch — you will be notified when it goes live in your city.</p>
            </div>
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

        {/* Vendor Type */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <FiPackage size={18} /> What do you sell?
          </h2>
          <p className="text-sm text-gray-500 mb-4">This determines how your orders are fulfilled and which delivery options are available to you.</p>
          <div className="grid gap-3">
            {VENDOR_TYPES.map((v) => (
              <label key={v.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.vendor_type === v.value
                    ? "border-green-700 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <input type="radio" name="vendor_type" value={v.value}
                  checked={form.vendor_type === v.value}
                  onChange={(e) => {
                    const vt = e.target.value;
                    setForm(f => ({
                      ...f,
                      vendor_type: vt,
                      // Auto-set delivery type for restaurant
                      delivery_type: vt === "restaurant" ? "local_delivery" : f.delivery_type === "local_delivery" ? "shipping" : f.delivery_type,
                    }));
                  }}
                  className="mt-1 accent-green-700" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{v.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{v.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Delivery Type */}
        <div className="bg-white rounded-2xl border shadow-sm p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <FiTruck size={18} /> How do you deliver?
          </h2>
          <p className="text-sm text-gray-500 mb-4">Choose how you fulfil orders for customers.</p>

          {isRestaurant ? (
            <div className="space-y-3">
              <div className="bg-green-50 border-2 border-green-700 rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl">🛵</span>
                <div>
                  <p className="font-bold text-green-900">Uber Express Local Delivery</p>
                  <p className="text-sm text-green-700 mt-0.5">Hot food is delivered via Uber Direct. Pickup is optional.</p>
                </div>
              </div>
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.delivery_type === "both" ? "border-green-700 bg-green-50" : "border-gray-200 hover:border-gray-300"
              }`}>
                <input type="checkbox"
                  checked={form.delivery_type === "both"}
                  onChange={e => setForm(f => ({ ...f, delivery_type: e.target.checked ? "both" : "local_delivery" }))}
                  className="mt-1 accent-green-700" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">🏪 Also offer Customer Pickup</p>
                  <p className="text-xs text-gray-500 mt-0.5">Customers can choose to pick up from your location instead of delivery</p>
                </div>
              </label>
            </div>

            {/* ── RESTAURANT OPERATING HOURS ── */}
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-black text-gray-900">⏰ Operating Hours</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Customers cannot order outside these hours</p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-sm text-gray-600">Store Status:</span>
                  <div className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.is_open_now ? "bg-green-500" : "bg-gray-300"}`}
                    onClick={() => setForm(f => ({...f, is_open_now: !f.is_open_now}))}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_open_now ? "translate-x-7" : "translate-x-1"}`}/>
                  </div>
                  <span className={`text-sm font-black ${form.is_open_now ? "text-green-600" : "text-red-500"}`}>
                    {form.is_open_now ? "OPEN" : "CLOSED"}
                  </span>
                </label>
              </div>

              <div className="space-y-2">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => {
                  const hours = (form.weekly_hours && form.weekly_hours[day]) || {open:"11:00",close:"21:00",closed:false};
                  return (
                    <div key={day} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${hours.closed ? "bg-gray-50 opacity-60" : "bg-green-50"}`}>
                      <div className="col-span-3">
                        <p className="text-sm font-semibold text-gray-700">{day.slice(0,3)}</p>
                      </div>
                      <div className="col-span-3">
                        <input type="time" value={hours.open} disabled={hours.closed}
                          onChange={e => setForm(f => ({...f, weekly_hours: {...(f.weekly_hours||{}), [day]: {...hours, open: e.target.value}}}))}
                          className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-100" />
                      </div>
                      <div className="col-span-1 text-center text-gray-400 text-xs">to</div>
                      <div className="col-span-3">
                        <input type="time" value={hours.close} disabled={hours.closed}
                          onChange={e => setForm(f => ({...f, weekly_hours: {...(f.weekly_hours||{}), [day]: {...hours, close: e.target.value}}}))}
                          className="w-full border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-100" />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <input type="checkbox" checked={hours.closed}
                          onChange={e => setForm(f => ({...f, weekly_hours: {...(f.weekly_hours||{}), [day]: {...hours, closed: e.target.checked}}}))}
                          className="accent-red-500" />
                        <span className="text-xs text-gray-500">Closed</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Avg Prep Time</label>
                  <select value={form.prep_time_minutes || 30}
                    onChange={e => setForm(f => ({...f, prep_time_minutes: Number(e.target.value)}))}
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700">
                    {[15,20,25,30,40,45,60,90].map(t => (
                      <option key={t} value={t}>{t} minutes</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Special Hours Note</label>
                  <input value={form.opening_hours || ""}
                    onChange={e => setForm(f => ({...f, opening_hours: e.target.value}))}
                    placeholder="e.g. Closed public holidays"
                    className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700" />
                </div>
              </div>
            </div>

          ) : (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {DELIVERY_TYPES.filter(d => d.value !== "local_delivery").map((d) => (
              <label key={d.value}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  form.delivery_type === d.value
                    ? "border-green-700 bg-green-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                <input type="radio" name="delivery_type" value={d.value}
                  checked={form.delivery_type === d.value}
                  onChange={(e) => setForm({ ...form, delivery_type: e.target.value })}
                  className="mt-1 accent-green-700" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{d.icon} {d.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{d.desc}</p>
                </div>
              </label>
            ))}
          </div>
          )} {/* end non-restaurant delivery selector */}

          {/* Local delivery extra fields */}
          {isLocalDelivery && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <FiMapPin size={14} /> Local Delivery Details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Delivery Radius (miles)</label>
                  <input
                    type="number" min="1" max="50"
                    value={form.delivery_radius_miles}
                    onChange={(e) => setForm({ ...form, delivery_radius_miles: e.target.value })}
                    placeholder="e.g. 10"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Store Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="123 Main St, Houston TX"
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Delivery Note for Customers</label>
                <input
                  value={form.delivery_note}
                  onChange={(e) => setForm({ ...form, delivery_note: e.target.value })}
                  placeholder="e.g. Min order $20 · Free delivery within 5 miles · 45–60 min"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>
              <p className="text-xs text-blue-600">
                🚀 Uber Direct automated driver dispatch is coming soon. For now, arrange your own delivery driver and update the order to <strong>Shipped</strong> when they pick up.
              </p>
            </div>
          )}
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
