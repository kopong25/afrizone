import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import ReviewSection from "../../components/ui/ReviewSection";
import { StarDisplay } from "../../components/ui/StarRating";
import ProductRecommendations from "../../components/ui/ProductRecommendations";
import RecentlyViewed, { trackProductView } from "../../components/ui/RecentlyViewed";
import { productsAPI, ordersAPI, reviewsAPI, wishlistAPI, variantsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiShoppingCart, FiMapPin, FiPackage, FiShare2, FiHeart, FiCheck } from "react-icons/fi";

export default function ProductDetail() {
  const router = useRouter();
  const { id: slug } = router.query;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});

  useEffect(() => {
    if (!slug) return;
    productsAPI.get(slug).then((prodRes) => {
      const p = prodRes.data;
      setProduct(p);
      trackProductView(p);
      // Load related data
      reviewsAPI.getForProduct(p.id).then((r) => setReviews(Array.isArray(r.data) ? r.data : [])).catch(() => {});
      variantsAPI.getForProduct(p.id).then((r) => setVariants(Array.isArray(r.data) ? r.data : [])).catch(() => {});
      if (user) {
        wishlistAPI.getIds().then((r) => setWishlisted((r.data || []).includes(p.id))).catch(() => {});
      }
    }).catch(() => router.push("/")).finally(() => setLoading(false));
  }, [slug, user]);

  const toggleWishlist = async () => {
    if (!user) { router.push("/login"); return; }
    try {
      const res = await wishlistAPI.toggle(product.id);
      setWishlisted(res.data.wishlisted);
      toast.success(res.data.wishlisted ? "❤️ Added to wishlist!" : "Removed from wishlist");
    } catch { toast.error("Failed to update wishlist"); }
  };

  const addToCart = async () => {
    if (!user) { router.push("/login"); return; }
    setAddingToCart(true);
    try {
      await ordersAPI.addToCart({ product_id: product.id, quantity });
      setAddedToCart(true);
      toast.success("Added to cart!");
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    } finally { setAddingToCart(false); }
  };

  // Group variants by name (e.g. "Size": [S, M, L], "Color": [Red, Blue])
  const variantGroups = variants.reduce((acc, v) => {
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {});

  // Calculate price with variant modifiers
  const variantModifier = Object.values(selectedVariants).reduce((sum, v) => sum + (v?.price_modifier || 0), 0);
  const finalPrice = product ? Number(product.price) + variantModifier : 0;

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="bg-gray-200 aspect-square rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-10 bg-gray-200 rounded w-1/4" />
            <div className="h-12 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </>
  );
  if (!product) return null;

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;
  const images = product.images?.length > 0 ? product.images : [null];

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-green-900">Home</Link>
          <span>/</span>
          {product.country_of_origin && <><span className="hover:text-green-900">{product.country_of_origin}</span><span>/</span></>}
          <span className="text-gray-700 font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 mb-6">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3 relative">
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🛒</div>
              )}
              {discount > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-black px-3 py-1 rounded-full">-{discount}%</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${i === selectedImage ? "border-green-900 shadow-md" : "border-transparent hover:border-gray-300"}`}>
                    {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center">🛒</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl font-black text-gray-900 leading-snug">{product.name}</h1>
              <button onClick={toggleWishlist}
                className={`p-2 rounded-xl border transition-all flex-shrink-0 ${wishlisted ? "bg-red-50 border-red-200 text-red-500" : "border-gray-200 text-gray-300 hover:border-red-200 hover:text-red-400"}`}>
                <FiHeart size={20} className={wishlisted ? "fill-current" : ""} />
              </button>
            </div>

            {product.review_count > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarDisplay rating={product.avg_rating} size={16} showNumber />
                <a href="#reviews" className="text-sm text-green-700 hover:underline">{product.review_count} review{product.review_count !== 1 ? "s" : ""}</a>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl font-black text-green-900">${finalPrice.toFixed(2)}</span>
              {product.compare_price && <span className="text-xl text-gray-300 line-through">${Number(product.compare_price).toFixed(2)}</span>}
              {discount > 0 && <span className="bg-red-100 text-red-700 text-sm font-bold px-2.5 py-0.5 rounded-full">Save {discount}%</span>}
            </div>
            {variantModifier !== 0 && <p className="text-xs text-gray-400 mb-1">Base price: ${Number(product.price).toFixed(2)} {variantModifier > 0 ? `+$${variantModifier.toFixed(2)}` : `-$${Math.abs(variantModifier).toFixed(2)}`} for selected options</p>}
            <p className="text-sm text-gray-400 mb-5">
              {product.stock > 0 ? <span className="text-green-600 font-medium">✓ In stock</span> : <span className="text-red-500 font-medium">Out of stock</span>}
            </p>

            {/* Store */}
            {product.store && (
              <Link href={`/stores/${product.store.slug}`}
                className="flex items-center gap-3 bg-gray-50 hover:bg-gray-100 rounded-xl p-3 mb-5 transition-colors border">
                {product.store.logo_url
                  ? <img src={product.store.logo_url} className="w-11 h-11 rounded-full object-cover border" />
                  : <div className="w-11 h-11 rounded-full bg-green-900 flex items-center justify-center text-white font-black">{product.store.name[0]}</div>
                }
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{product.store.name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1"><FiMapPin size={10} /> {product.store.city || product.store.country}</p>
                </div>
                <span className="ml-auto text-xs text-green-700 font-medium">Visit store →</span>
              </Link>
            )}

            {/* Product Variants */}
            {Object.entries(variantGroups).map(([groupName, groupVariants]) => (
              <div key={groupName} className="mb-4">
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  {groupName}
                  {selectedVariants[groupName] && <span className="font-normal text-gray-400 ml-2">— {selectedVariants[groupName].value}</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {groupVariants.map((v) => (
                    <button key={v.id} onClick={() => setSelectedVariants((s) => ({ ...s, [groupName]: s[groupName]?.id === v.id ? null : v }))}
                      disabled={v.stock === 0}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                        selectedVariants[groupName]?.id === v.id
                          ? "border-green-900 bg-green-900 text-white"
                          : v.stock === 0
                            ? "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                            : "border-gray-200 text-gray-700 hover:border-green-900"
                      }`}>
                      {v.value}
                      {v.price_modifier !== 0 && <span className="text-xs ml-1 opacity-70">{v.price_modifier > 0 ? `+$${v.price_modifier}` : `-$${Math.abs(v.price_modifier)}`}</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* Quantity + Add to cart */}
            <div className="flex gap-3 mb-4">
              <div className="flex items-center border rounded-xl overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 hover:bg-gray-100 font-bold text-lg">−</button>
                <span className="px-4 py-3 font-bold min-w-[48px] text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-4 py-3 hover:bg-gray-100 font-bold text-lg">+</button>
              </div>
              <button onClick={addToCart} disabled={addingToCart || product.stock === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${addedToCart ? "bg-green-100 text-green-800 border border-green-300" : "bg-green-900 hover:bg-green-800 text-white"}`}>
                {addedToCart ? <><FiCheck /> Added!</> : <><FiShoppingCart /> {addingToCart ? "Adding..." : "Add to Cart"}</>}
              </button>
            </div>

            {addedToCart && <Link href="/cart" className="block text-center text-sm text-green-700 font-semibold hover:underline mb-4">View Cart & Checkout →</Link>}

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.map((tag) => (
                  <Link key={tag} href={`/?q=${tag}`} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full transition-colors">#{tag}</Link>
                ))}
              </div>
            )}

            {product.description && (
              <div className="border-t pt-4">
                <h3 className="font-bold text-gray-800 mb-2">About this product</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              {product.country_of_origin && <span className="flex items-center gap-1.5 text-sm text-gray-500"><FiPackage size={14} /> Made in {product.country_of_origin}</span>}
              <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied!"); }}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-auto">
                <FiShare2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <ProductRecommendations product={product} />

        {/* Recently Viewed */}
        <RecentlyViewed currentProductId={product.id} />

        {/* Reviews */}
        <div id="reviews">
          <ReviewSection productId={product.id} initialReviews={reviews} />
        </div>
      </div>
      <Footer />
    </>
  );
}