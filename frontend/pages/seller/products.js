import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import { productsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import { FiPlus, FiEdit, FiEdit2, FiTrash2, FiUpload, FiPackage, FiX, FiCheck } from "react-icons/fi";

const INITIAL_FORM = {
  name: "", description: "", price: "", compare_price: "",
  stock: "", sku: "", country_of_origin: "", tags: "", existing_images: [],
  currency: "USD", ships_from: "",
};

const COUNTRIES = ["Nigeria", "Ghana", "Ethiopia", "Kenya", "Senegal", "Cameroon", "South Africa", "Congo", "Ivory Coast", "Tanzania"];

export default function SellerProducts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef();

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
    } catch (err) {
      toast.error("Failed to load products");
    }
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
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };

      let product;
      if (editingId) {
        const res = await productsAPI.update(editingId, data);
        product = res.data;
        toast.success("Product updated!");
      } else {
        const res = await productsAPI.create(data);
        product = res.data;
        toast.success("Product created!");
      }

      // Upload images if selected
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((f) => formData.append("files", f));
        await productsAPI.uploadImages(product.id, formData);
      }

      setShowForm(false);
      setForm(INITIAL_FORM);
      setImages([]);
      setImagePreviews([]);
      setEditingId(null);
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
    });
    setEditingId(product.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Archive this product? It will be hidden from the marketplace.")) return;
    try {
      await productsAPI.delete(id);
      toast.success("Product archived");
      setProducts(products.filter((p) => p.id !== id));
    } catch {
      toast.error("Failed to archive product");
    }
  };

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Products</h1>
            <p className="text-gray-500 text-sm">{products.length} products listed</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(INITIAL_FORM); }}
            className="btn-primary flex items-center gap-2 py-2 px-4"
          >
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
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="e.g. Ofada Rice (5kg)" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Describe your product..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (USD) *</label>
                  <input required type="number" step="0.01" min="0.01" value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Compare Price (original, optional)</label>
                  <input type="number" step="0.01" min="0" value={form.compare_price}
                    onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Shows as crossed out" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                  <input required type="number" min="0" value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU (optional)</label>
                  <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="Your product code" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country of Origin</label>
                  <select value={form.country_of_origin} onChange={(e) => setForm({ ...form, country_of_origin: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900">
                    <option value="">Select country...</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                  <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                    placeholder="jollof, rice, nigerian food" />
                </div>
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Images (max 5)</label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {/* Existing images */}
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
                  {/* New image previews */}
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
                  {/* Upload button */}
                  {(images.length + (form.existing_images?.length || 0)) < 5 && (
                    <div onClick={() => fileRef.current.click()}
                      className="aspect-square border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-green-900 hover:bg-green-50 transition-colors">
                      <FiUpload size={20} className="text-gray-400 mb-1" />
                      <p className="text-xs text-gray-400 text-center px-2">Add photo</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" multiple accept="image/*" className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files).slice(0, 5 - (form.existing_images?.length || 0));
                    setImages(files);
                    const readers = files.map(f => new Promise(res => { const r = new FileReader(); r.onload = e => res(e.target.result); r.readAsDataURL(f); }));
                    Promise.all(readers).then(setImagePreviews);
                  }} />
                <p className="text-xs text-gray-400">JPEG, PNG or WebP · Max 5MB each · First image is the main photo</p>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={submitting} className="btn-primary py-2 px-8 disabled:opacity-50">
                  {submitting ? "Saving..." : editingId ? "Update Product" : "Create Product"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="btn-secondary py-2 px-6">
                  Cancel
                </button>
              </div>
            </form>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Sales</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((p) => (
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
                    <td className="px-4 py-3 text-sm font-semibold text-green-900">${p.price.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${p.stock === 0 ? "text-red-600 font-semibold" : p.stock < 5 ? "text-yellow-600" : "text-gray-700"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge text-xs ${p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {p.is_active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.sale_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-green-900 hover:bg-green-50 rounded">
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
    </>
  );
}