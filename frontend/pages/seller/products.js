import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import api, { productsAPI, variantsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import { FiPlus, FiEdit2, FiTrash2, FiUpload, FiX, FiPackage, FiArrowLeft, FiTag } from "react-icons/fi";

const INITIAL_FORM = {
  name: "", description: "", price: "", compare_price: "",
  stock: "", sku: "", country_of_origin: "", tags: "", existing_images: [],
  currency: "USD", ships_from: "",
};

// Amazon-standard variant presets per product category
const SIZE_PRESETS = {
  "Clothing":    ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL"],
  "Shoes":       ["5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"],
  "Kids":        ["0-3M", "3-6M", "6-12M", "1Y", "2Y", "3Y", "4Y", "5Y", "6Y", "7Y", "8Y"],
  "Hair Length": ["8in", "10in", "12in", "14in", "16in", "18in", "20in", "22in", "24in", "26in", "28in", "30in"],
  "Wig Cap":     ["Petite", "Average", "Large"],
  "One Size":    ["One Size"],
};

const COLOR_PRESETS = [
  // Natural hair colors
  "Natural Black", "Off Black", "Dark Brown", "Medium Brown", "Light Brown",
  "Blonde", "Platinum Blonde", "Strawberry Blonde", "Honey Blonde",
  "Auburn", "Burgundy", "Dark Red",
  // Fashion colors
  "Ombre Black to Brown", "Ombre Black to Blonde", "Ombre Brown to Blonde",
  "Salt & Pepper", "Grey", "Silver",
  // African fashion colors
  "Kente Gold", "Ankara Blue", "Earth Brown", "Safari Green",
  // Standard
  "Black", "White", "Red", "Blue", "Green", "Navy", "Beige", "Gold", "Pink",
];

// Amazon-style hair & wig specific variant attributes
const HAIR_VARIANT_TYPES = {
  "Hair Length":   { icon: "📏", presets: SIZE_PRESETS["Hair Length"], note: "Measured when straight" },
  "Hair Texture":  { icon: "〰️", presets: ["Straight", "Body Wave", "Loose Wave", "Deep Wave", "Kinky Curly", "Afro Kinky", "Loose Curly", "Water Wave", "Jerry Curl", "Coily"], note: "Natural texture pattern" },
  "Hair Color":    { icon: "🎨", presets: COLOR_PRESETS, note: "Select all available colors" },
  "Density":       { icon: "💪", presets: ["130%", "150%", "180%", "200%", "250%"], note: "Hair fullness (150% is natural looking)" },
  "Wig Type":      { icon: "👑", presets: ["Lace Front", "Full Lace", "360 Lace", "Headband Wig", "U-Part", "V-Part", "Closure Wig", "Glueless"], note: "Wig construction type" },
  "Cap Size":      { icon: "📐", presets: SIZE_PRESETS["Wig Cap"], note: "Head circumference fit" },
  "Hair Origin":   { icon: "🌍", presets: ["Brazilian", "Peruvian", "Malaysian", "Indian", "Cambodian", "Vietnamese", "Burmese", "African"], note: "Origin affects texture quality" },
  "Hair Grade":    { icon: "⭐", presets: ["8A", "9A", "10A", "12A"], note: "Higher grade = better quality" },
};

// Standard fashion variants
const FASHION_VARIANT_TYPES = {
  "Size":   { icon: "📐", presets: SIZE_PRESETS["Clothing"] },
  "Color":  { icon: "🎨", presets: COLOR_PRESETS.slice(0, 20) },
  "Shoes":  { icon: "👟", presets: SIZE_PRESETS["Shoes"] },
};

const COUNTRIES = ["Nigeria", "Ghana", "Ethiopia", "Kenya", "Senegal", "Cameroon",
  "South Africa", "Congo", "Ivory Coast", "Tanzania", "Uganda", "Rwanda",
  "Mali", "Burkina Faso", "Togo", "Benin", "Gambia", "Sierra Leone", "Guinea"];

// ── Variant Manager Component ─────────────────────────────────────────────────
function VariantManager({ productId, productName }) {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newVariant, setNewVariant] = useState({ name: "Size", value: "", price_modifier: 0, stock: 0, sku: "" });
  const [variantType, setVariantType] = useState("Size"); // Size | Color | Custom
  const [sizeCategory, setSizeCategory] = useState("Clothing");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState([]);

  useEffect(() => {
    loadVariants();
  }, [productId]);

  const loadVariants = async () => {
    try {
      const r = await variantsAPI.getForProduct(productId);
      setVariants(Array.isArray(r.data) ? r.data : []);
    } catch { toast.error("Failed to load variants"); }
    finally { setLoading(false); }
  };

  // Group variants by name for display
  const grouped = variants.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {});

  const addSingle = async () => {
    if (!newVariant.value.trim()) { toast.error("Please enter a value"); return; }
    setAdding(true);
    try {
      await variantsAPI.create(productId, {
        name: variantType === "Custom" ? newVariant.name : variantType,
        value: newVariant.value.trim(),
        price_modifier: parseFloat(newVariant.price_modifier) || 0,
        stock: parseInt(newVariant.stock) || 0,
        sku: newVariant.sku || "",
      });
      toast.success("Variant added!");
      setNewVariant({ name: variantType, value: "", price_modifier: 0, stock: 0, sku: "" });
      loadVariants();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add variant");
    } finally { setAdding(false); }
  };

  const addBulk = async () => {
    if (bulkSelected.length === 0) { toast.error("Select at least one option"); return; }
    setAdding(true);
    try {
      for (const value of bulkSelected) {
        await variantsAPI.create(productId, {
          name: variantType,
          value,
          price_modifier: 0,
          stock: parseInt(newVariant.stock) || 0,
          sku: "",
        });
      }
      toast.success(`Added ${bulkSelected.length} variants!`);
      setBulkSelected([]);
      loadVariants();
    } catch (e) {
      toast.error("Failed to add some variants");
    } finally { setAdding(false); }
  };

  const deleteVariant = async (id) => {
    if (!confirm("Remove this variant?")) return;
    try {
      await variantsAPI.delete(id);
      setVariants(v => v.filter(x => x.id !== id));
      toast.success("Variant removed");
    } catch { toast.error("Failed to remove"); }
  };

  const presets = variantType === "Size" ? SIZE_PRESETS[sizeCategory] : COLOR_PRESETS;

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <FiTag size={16} /> Variants
          <span className="text-xs font-normal text-gray-400 ml-1">(sizes, colors, etc.)</span>
        </h3>
        {variants.length > 0 && (
          <span className="text-xs text-gray-400">{variants.length} variant{variants.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {/* Existing variants grouped */}
      {Object.entries(grouped).length > 0 && (
        <div className="space-y-4 mb-6">
          {Object.entries(grouped).map(([groupName, groupVariants]) => (
            <div key={groupName} className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{groupName}</p>
              <div className="flex flex-wrap gap-2">
                {groupVariants.map(v => (
                  <div key={v.id} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5 text-sm group">
                    {groupName === "Color" && (
                      <span className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                        style={{ backgroundColor: v.value.toLowerCase().replace(/\s/g, "") }} />
                    )}
                    <span className="font-medium text-gray-800">{v.value}</span>
                    {v.price_modifier !== 0 && (
                      <span className={`text-xs ${v.price_modifier > 0 ? "text-green-600" : "text-red-500"}`}>
                        {v.price_modifier > 0 ? "+" : ""}${v.price_modifier.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">Stock: {v.stock}</span>
                    <button onClick={() => deleteVariant(v.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                      <FiX size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add variant UI */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-sm font-bold text-blue-900 mb-1">Add Variants</p>
        <p className="text-xs text-gray-500 mb-3">Amazon-style: add sizes, colors, hair length, texture, density and more</p>

        {/* Category tabs */}
        <div className="mb-3">
          <div className="flex gap-2 mb-2 flex-wrap">
            {[
              { id: "hair", label: "💆 Hair & Wigs" },
              { id: "fashion", label: "👗 Fashion" },
              { id: "custom", label: "✏️ Custom" },
            ].map(tab => (
              <button key={tab.id} type="button"
                onClick={() => { setVariantType(tab.id === "custom" ? "Custom" : Object.keys(tab.id === "hair" ? HAIR_VARIANT_TYPES : FASHION_VARIANT_TYPES)[0]); setBulkMode(tab.id !== "custom"); setBulkSelected([]); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                  (tab.id === "hair" && Object.keys(HAIR_VARIANT_TYPES).includes(variantType)) ||
                  (tab.id === "fashion" && Object.keys(FASHION_VARIANT_TYPES).includes(variantType)) ||
                  (tab.id === "custom" && variantType === "Custom")
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-gray-600 hover:bg-gray-100"
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Hair variant attributes */}
          {Object.keys(HAIR_VARIANT_TYPES).includes(variantType) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(HAIR_VARIANT_TYPES).map(([name, cfg]) => (
                <button key={name} type="button"
                  onClick={() => { setVariantType(name); setBulkSelected([]); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    variantType === name ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-gray-200 text-gray-600"
                  }`}>
                  {cfg.icon} {name}
                </button>
              ))}
            </div>
          )}

          {/* Fashion variant attributes */}
          {Object.keys(FASHION_VARIANT_TYPES).includes(variantType) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(FASHION_VARIANT_TYPES).map(([name, cfg]) => (
                <button key={name} type="button"
                  onClick={() => { setVariantType(name); setBulkSelected([]); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    variantType === name ? "bg-blue-100 border-blue-400 text-blue-800" : "bg-white border-gray-200 text-gray-600"
                  }`}>
                  {cfg.icon} {name}
                </button>
              ))}
            </div>
          )}

          {/* Note for selected type */}
          {(HAIR_VARIANT_TYPES[variantType]?.note || FASHION_VARIANT_TYPES[variantType]?.note) && (
            <p className="text-xs text-blue-600 mt-1.5 italic">
              ℹ️ {HAIR_VARIANT_TYPES[variantType]?.note || FASHION_VARIANT_TYPES[variantType]?.note}
            </p>
          )}
        </div>

        {/* Bulk preset picker */}
        {variantType !== "Custom" && (
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-600 block mb-2">
              Select options <span className="font-normal text-gray-400">(click to add)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(HAIR_VARIANT_TYPES[variantType]?.presets || FASHION_VARIANT_TYPES[variantType]?.presets || presets).map(p => (
                <button key={p} type="button"
                  onClick={() => setBulkSelected(prev =>
                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                  )}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    bulkSelected.includes(p)
                      ? "bg-blue-700 text-white border-blue-700"
                      : variants.find(v => v.name === variantType && v.value === p)
                        ? "bg-gray-100 text-gray-400 border-gray-200 line-through cursor-not-allowed"
                        : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                  disabled={!!variants.find(v => v.name === variantType && v.value === p)}>
                  {variantType === "Color" && (
                    <span className="inline-block w-3 h-3 rounded-full border border-gray-300 mr-1 align-middle"
                      style={{ backgroundColor: p.toLowerCase().replace(/\s/g, "") }} />
                  )}
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stock per variant */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Stock per variant
            </label>
            <input type="number" min="0" value={newVariant.stock}
              onChange={e => setNewVariant(v => ({ ...v, stock: e.target.value }))}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">
              Price modifier (optional)
            </label>
            <input type="number" step="0.01" value={newVariant.price_modifier}
              onChange={e => setNewVariant(v => ({ ...v, price_modifier: e.target.value }))}
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+2.00 or -1.50" />
          </div>
        </div>

        {/* Custom variant name+value */}
        {variantType === "Custom" && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Variant Name</label>
              <input value={newVariant.name} onChange={e => setNewVariant(v => ({ ...v, name: e.target.value }))}
                placeholder="e.g. Material, Weight"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Value</label>
              <input value={newVariant.value} onChange={e => setNewVariant(v => ({ ...v, value: e.target.value }))}
                placeholder="e.g. Cotton, 500g"
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {/* Add button */}
        {variantType === "Custom" ? (
          <button type="button" onClick={addSingle} disabled={adding}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors">
            {adding ? "Adding..." : "+ Add Variant"}
          </button>
        ) : (
          <button type="button" onClick={addBulk} disabled={adding || bulkSelected.length === 0}
            className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors">
            {adding ? "Adding..." : `+ Add ${bulkSelected.length > 0 ? bulkSelected.length : ""} Selected`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SellerProducts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [savedProductId, setSavedProductId] = useState(null); // for showing variant manager

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
    if (!authLoading && user && user.role === "buyer") router.push("/");
  }, [user, authLoading]);

  useEffect(() => {
    if (user && user.role !== "buyer") fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const res = await productsAPI.myProducts();
      setProducts(res.data);
    } catch { toast.error("Failed to load products"); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...form,
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        stock: parseInt(form.stock),
        tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      };

      let product;
      if (editingId) {
        const res = await productsAPI.update(editingId, data);
        product = res.data;
        toast.success("Product updated!");
      } else {
        const res = await productsAPI.create(data);
        product = res.data;
        toast.success("Product created! Now add variants below.");
      }

      if (images.length > 0) {
        try {
          const fileImages = images.filter(i => i instanceof File);
          const urlImages = images.filter(i => typeof i === "string");
          if (urlImages.length > 0) await api.post(`/products/seller/${product.id}/image-urls`, { urls: urlImages });
          if (fileImages.length > 0) {
            const formData = new FormData();
            fileImages.forEach(f => formData.append("files", f));
            await productsAPI.uploadImages(product.id, formData);
          }
        } catch { toast.error("Product saved but image upload failed"); }
      }

      setSavedProductId(product.id);
      setImages([]);
      setImagePreviews([]);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (product) => {
    setForm({
      name: product.name, description: product.description || "",
      price: product.price, compare_price: product.compare_price || "",
      stock: product.stock, sku: product.sku || "",
      country_of_origin: product.country_of_origin || "",
      tags: (product.tags || []).join(", "),
      currency: product.currency, ships_from: product.ships_from || "",
      existing_images: product.images || [],
    });
    setEditingId(product.id);
    setSavedProductId(product.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Archive this product? It will be hidden from the marketplace.")) return;
    try {
      await productsAPI.delete(id);
      toast.success("Product archived");
      setProducts(products.filter(p => p.id !== id));
      if (savedProductId === id) setSavedProductId(null);
    } catch { toast.error("Failed to archive product"); }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link href="/seller/dashboard" className="text-gray-400 hover:text-gray-600">
              <FiArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-gray-900">My Products</h1>
              <p className="text-gray-500 text-sm">{products.length} products listed</p>
            </div>
          </div>
          <button onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setSavedProductId(null);
            setForm(INITIAL_FORM);
            setImages([]);
            setImagePreviews([]);
          }}
            className="bg-green-900 hover:bg-green-800 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 transition-colors">
            {showForm ? <FiX /> : <FiPlus />}
            {showForm ? "Cancel" : "Add Product"}
          </button>
        </div>

        {/* Product Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-8 border border-green-100">
            <h2 className="font-bold text-lg text-gray-800 mb-5">
              {editingId ? "Edit Product" : "New Product"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="e.g. Ankara Print Dress" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Describe your product..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD) *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price (crossed out)</label>
                  <input type="number" step="0.01" min="0" value={form.compare_price}
                    onChange={e => setForm({ ...form, compare_price: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Original price (optional)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Stock *
                    <span className="font-normal text-gray-400 ml-1">(across all variants)</span>
                  </label>
                  <input required type="number" min="0" value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (optional)</label>
                  <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Your product code" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
                  <select value={form.country_of_origin} onChange={e => setForm({ ...form, country_of_origin: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
                    <option value="">Select country...</option>
                    {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="ankara, dress, african fashion" />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images (max 5)</label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-3">
                  {form.existing_images && form.existing_images.map((url, i) => (
                    <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
                      <img src={url} className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, existing_images: f.existing_images.filter((_, j) => j !== i) }))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
                      <img src={src} className="w-full h-full object-cover" />
                      <button type="button"
                        onClick={() => { setImages(imgs => imgs.filter((_, j) => j !== i)); setImagePreviews(p => p.filter((_, j) => j !== i)); }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        ×
                      </button>
                    </div>
                  ))}
                  {(images.length + (form.existing_images?.length || 0)) < 5 && (
                    <label className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-900 hover:bg-green-50 transition-colors">
                      {uploadingImg ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-6 h-6 border-2 border-green-900 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-green-900">{uploadProgress}%</p>
                        </div>
                      ) : (
                        <><FiUpload size={20} className="text-gray-400 mb-1" /><p className="text-xs text-gray-400">Add photo</p></>
                      )}
                      <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files).slice(0, 5 - (form.existing_images?.length || 0) - images.length);
                          const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
                          const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
                          for (const file of files) {
                            const localUrl = await new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(file); });
                            setImagePreviews(p => [...p, localUrl]);
                            if (CLOUD && PRESET) {
                              setUploadingImg(true);
                              try {
                                const fd = new FormData();
                                fd.append("file", file); fd.append("upload_preset", PRESET); fd.append("folder", "afrizone/products");
                                const xhr = new XMLHttpRequest();
                                xhr.upload.onprogress = ev => { if (ev.lengthComputable) setUploadProgress(Math.round(ev.loaded/ev.total*100)); };
                                const url = await new Promise((resolve, reject) => {
                                  xhr.onload = () => xhr.status === 200 ? resolve(JSON.parse(xhr.responseText).secure_url) : reject();
                                  xhr.onerror = reject;
                                  xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
                                  xhr.send(fd);
                                });
                                setImages(imgs => [...imgs, url]);
                                setImagePreviews(p => [...p.slice(0, -1), url]);
                                toast.success("Image uploaded!");
                              } catch { toast.error("Image upload failed"); setImagePreviews(p => p.slice(0, -1)); }
                              finally { setUploadingImg(false); setUploadProgress(0); }
                            } else { setImages(imgs => [...imgs, file]); }
                          }
                        }} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-400">PNG, JPG or WebP · First image is the main photo · Min 800×800px recommended</p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="bg-green-900 hover:bg-green-800 text-white font-bold py-2 px-8 rounded-xl disabled:opacity-50 transition-colors">
                  {submitting ? "Saving..." : editingId ? "Update Product" : "Save & Add Variants"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setSavedProductId(null); }}
                  className="border-2 border-green-900 text-green-900 font-bold py-2 px-6 rounded-xl hover:bg-green-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>

            {/* Variant manager — shown after product is saved */}
            {savedProductId && (
              <VariantManager
                productId={savedProductId}
                productName={form.name}
              />
            )}
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {products.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FiPackage size={48} className="mx-auto mb-3" />
              <p className="text-lg font-medium">No products yet</p>
              <p className="text-sm mt-1">Add your first product to start selling</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Variants</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sales</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {p.images?.[0] ? <img src={p.images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center">📦</div>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{p.name}</p>
                          {p.country_of_origin && <p className="text-xs text-gray-500">🌍 {p.country_of_origin}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-900">${Number(p.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold ${p.stock === 0 ? "text-red-600" : p.stock <= 5 ? "text-yellow-600" : "text-gray-800"}`}>
                        {p.stock}
                      </span>
                      {p.stock === 0 && <span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">OUT</span>}
                      {p.stock > 0 && p.stock <= 5 && <span className="ml-1 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold">LOW</span>}
                    </td>
                    <td className="px-4 py-3">
                      <VariantCount productId={p.id} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.sale_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-green-900 hover:bg-green-50 rounded" title="Edit & manage variants">
                          <FiEdit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}

// Small badge showing variant count per product row
function VariantCount({ productId }) {
  const [count, setCount] = useState(null);
  useEffect(() => {
    variantsAPI.getForProduct(productId)
      .then(r => setCount(Array.isArray(r.data) ? r.data.length : 0))
      .catch(() => setCount(0));
  }, [productId]);
  if (count === null) return <span className="text-gray-300 text-xs">—</span>;
  if (count === 0) return <span className="text-gray-400 text-xs">None</span>;
  return <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">{count} variants</span>;
}
