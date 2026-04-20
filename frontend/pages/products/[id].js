import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import ReviewSection from "../../components/ui/ReviewSection";
import { StarDisplay } from "../../components/ui/StarRating";
import ProductRecommendations from "../../components/ui/ProductRecommendations";
import RecentlyViewed, { trackProductView } from "../../components/ui/RecentlyViewed";
import { productsAPI, ordersAPI, reviewsAPI, wishlistAPI, variantsAPI } from "../../lib/api";
import { useAuth, fbq } from "../_app";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiShoppingCart, FiMapPin, FiPackage, FiShare2, FiHeart, FiCheck, FiEdit3 } from "react-icons/fi";

const JERSEY_TAGS = ["jersey","jerseys","kit","football kit","soccer jersey","customizable","custom jersey","sportswear"];

// ── Realistic Back-of-Jersey SVG Preview ─────────────────────
function JerseyPreview({ name, number }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative"
      style={{ background: "linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 100%)" }}>

      <p className="absolute top-3 left-0 right-0 text-center text-gray-600 text-xs uppercase tracking-widest font-bold z-10">
        Back of Jersey
      </p>

      <svg viewBox="0 0 340 380" xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full" style={{ maxWidth: "320px", maxHeight: "320px" }}>
        <defs>
          <linearGradient id="bodyMain" x1="0%" y1="0%" x2="5%" y2="100%">
            <stop offset="0%" stopColor="#f5f5f0" />
            <stop offset="50%" stopColor="#efefea" />
            <stop offset="100%" stopColor="#e8e8e3" />
          </linearGradient>
          <linearGradient id="leftPanel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="rightPanel" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="leftSleeve" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f0eb" />
            <stop offset="100%" stopColor="#e4e4df" />
          </linearGradient>
          <linearGradient id="rightSleeve" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0f0eb" />
            <stop offset="100%" stopColor="#e4e4df" />
          </linearGradient>
          <filter id="jerseyDrop">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#00000030" />
          </filter>
          <filter id="textShadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#00000040" />
          </filter>
        </defs>

        {/* Main white body */}
        <path
          d="M 88 42 L 52 68 L 22 148 L 68 162 L 68 340 L 272 340 L 272 162 L 318 148 L 288 68 L 252 42 Q 232 58 170 58 Q 108 58 88 42 Z"
          fill="url(#bodyMain)"
          filter="url(#jerseyDrop)"
        />

        {/* Left red side panel */}
        <path
          d="M 68 162 L 68 340 L 108 340 L 108 175 Z"
          fill="url(#leftPanel)"
        />

        {/* Right red side panel */}
        <path
          d="M 272 162 L 272 340 L 232 340 L 232 175 Z"
          fill="url(#rightPanel)"
        />

        {/* Left sleeve */}
        <path
          d="M 88 42 L 52 68 L 22 148 L 68 162 L 68 110 Q 76 78 88 42 Z"
          fill="url(#leftSleeve)"
          stroke="#d4d4ce"
          strokeWidth="0.5"
        />

        {/* Right sleeve */}
        <path
          d="M 252 42 L 288 68 L 318 148 L 272 162 L 272 110 Q 264 78 252 42 Z"
          fill="url(#rightSleeve)"
          stroke="#d4d4ce"
          strokeWidth="0.5"
        />

        {/* Left sleeve — green stripe */}
        <path d="M 28 128 L 24 142 L 68 156 L 68 143 Z" fill="#166534" />
        {/* Left sleeve — red stripe */}
        <path d="M 24 142 L 22 148 L 68 162 L 68 156 Z" fill="#dc2626" />

        {/* Right sleeve — green stripe */}
        <path d="M 312 128 L 316 142 L 272 156 L 272 143 Z" fill="#166534" />
        {/* Right sleeve — red stripe */}
        <path d="M 316 142 L 318 148 L 272 162 L 272 156 Z" fill="#dc2626" />

        {/* Back neckline — small scoop */}
        <path
          d="M 118 44 Q 170 72 222 44"
          fill="none"
          stroke="#c8c8c3"
          strokeWidth="2"
        />

        {/* Seam lines */}
        <line x1="88" y1="42" x2="68" y2="162" stroke="#d8d8d3" strokeWidth="0.8" />
        <line x1="252" y1="42" x2="272" y2="162" stroke="#d8d8d3" strokeWidth="0.8" />
        <line x1="68" y1="162" x2="68" y2="340" stroke="#d8d8d3" strokeWidth="0.8" />
        <line x1="272" y1="162" x2="272" y2="340" stroke="#d8d8d3" strokeWidth="0.8" />
        <line x1="68" y1="330" x2="272" y2="330" stroke="#d0d0cb" strokeWidth="1.2" />

        {/* ── NAME — pushed up close to neckline ── */}
        {name && (
          <text
            x="170"
            y="105"
            textAnchor="middle"
            fill="#1a1a1a"
            fontFamily="Arial Black, Impact, sans-serif"
            fontWeight="900"
            fontSize={name.length > 11 ? "17" : name.length > 8 ? "21" : "25"}
            letterSpacing="5"
            filter="url(#textShadow)"
          >
            {name}
          </text>
        )}

        {/* ── NUMBER — just below the name ── */}
        {number && (
          <text
            x="170"
            y={name ? "210" : "190"}
            textAnchor="middle"
            fill="#1a1a1a"
            fontFamily="Arial Black, Impact, sans-serif"
            fontWeight="900"
            fontSize={name ? "96" : "108"}
            filter="url(#textShadow)"
          >
            {number}
          </text>
        )}

        {/* Placeholder when nothing entered */}
        {!name && !number && (
          <>
            <rect x="120" y="82" width="100" height="20" rx="5" fill="#d4d4ce" opacity="0.8" />
            <rect x="130" y="115" width="80" height="68" rx="6" fill="#d4d4ce" opacity="0.6" />
            <text x="170" y="97" textAnchor="middle" fill="#aaaaaa" fontSize="12"
              fontFamily="Arial, sans-serif" fontWeight="bold" letterSpacing="3">
              YOUR NAME
            </text>
            <text x="170" y="162" textAnchor="middle" fill="#aaaaaa" fontSize="14"
              fontFamily="Arial, sans-serif" fontWeight="bold">
              # 00
            </text>
          </>
        )}
      </svg>

      <p className="absolute bottom-2 left-0 right-0 text-center text-gray-500 text-xs">
        Preview only — actual print may vary
      </p>
    </div>
  );
}

export default function ProductDetail() {
  const router = useRouter();
  const { id: slug } = router.query;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});

  const [customizeJersey, setCustomizeJersey] = useState(false);
  const [jerseyName, setJerseyName] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [customizationFee, setCustomizationFee] = useState(0);

  // ── Swipe state ───────────────────────────────────────────────
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const timeout = setTimeout(() => setLoading(false), 8000);
    productsAPI.get(slug).then((prodRes) => {
      const p = prodRes.data;
      setProduct(p);
      trackProductView(p);
      fbq("track", "ViewContent", {
        content_ids: [String(p.id)],
        content_name: p.name,
        content_type: "product",
        value: p.price,
        currency: "USD",
      });
      reviewsAPI.getForProduct(p.id).then((r) => setReviews(Array.isArray(r.data) ? r.data : [])).catch(() => {});
      variantsAPI.getForProduct(p.id).then((r) => {
        const vArr = Array.isArray(r.data) ? r.data : [];
        setVariants(vArr);
        if (p.customization_fee != null && Number(p.customization_fee) > 0) {
          setCustomizationFee(Number(p.customization_fee));
        } else {
          const custFeeVariant = vArr.find(v => v.name?.toLowerCase() === "customization");
          if (custFeeVariant) setCustomizationFee(custFeeVariant.price_modifier || 0);
        }
      }).catch(() => {});
      if (user) {
        wishlistAPI.getIds().then((r) => setWishlisted((r.data || []).includes(p.id))).catch(() => {});
      }
    }).catch(() => { setError(true); }).finally(() => { clearTimeout(timeout); setLoading(false); });
  }, [slug, user]);

  const isJerseyProduct = product?.tags?.some(t => {
    const tagStr = typeof t === "string" ? t : t?.name ?? "";
    return JERSEY_TAGS.includes(tagStr.toLowerCase().trim());
  }) ?? false;

  const showJerseyPreview = customizeJersey && isJerseyProduct;

  // ── Swipe handlers ────────────────────────────────────────────
  const handleTouchStart = (e) => setTouchStartX(e.touches[0].clientX);
  const handleTouchMove  = (e) => setTouchEndX(e.touches[0].clientX);
  const handleTouchEnd   = () => {
    if (touchStartX === null || touchEndX === null) return;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) setSelectedImage((i) => Math.min(i + 1, images.length - 1));
      else          setSelectedImage((i) => Math.max(i - 1, 0));
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

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
    const requiredGroups = Object.keys(variantGroups).filter(g => g.toLowerCase() !== "customization");
    if (requiredGroups.length > 0) {
      const missing = requiredGroups.filter(g => !selectedVariants[g]);
      if (missing.length > 0) { toast.error(`Please select: ${missing.join(", ")}`); return; }
    }
    if (customizeJersey && isJerseyProduct) {
      if (!jerseyName.trim() && !jerseyNumber.trim()) {
        toast.error("Please enter a name or number for customization, or uncheck it");
        return;
      }
    }
    setAddingToCart(true);
    try {
      const firstVariant = Object.values(selectedVariants).find(v => v?.name?.toLowerCase() !== "customization");
      const variantParts = Object.entries(selectedVariants)
        .filter(([name]) => name.toLowerCase() !== "customization")
        .map(([name, v]) => `${name}: ${v.value}`);
      const customNote = customizeJersey && isJerseyProduct && (jerseyName || jerseyNumber)
        ? `Custom: ${jerseyName ? `Name="${jerseyName.toUpperCase()}"` : ""}${jerseyName && jerseyNumber ? " " : ""}${jerseyNumber ? `#${jerseyNumber}` : ""}`
        : null;
      const allParts = [...variantParts, ...(customNote ? [customNote] : [])];
      const variantLabel = allParts.join(", ") || null;
      await ordersAPI.addToCart({
        product_id: product.id,
        quantity,
        variant_id: firstVariant?.id || null,
        variant_label: variantLabel,
      });
      setAddedToCart(true);
      fbq("track", "AddToCart", {
        content_ids: [String(product.id)],
        content_name: product.name,
        value: finalPrice,
        currency: "USD",
      });
      toast.success(`Added to cart!${customNote ? ` (${customNote})` : variantLabel ? ` (${variantLabel})` : ""}`);
      setTimeout(() => setAddedToCart(false), 3000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    } finally { setAddingToCart(false); }
  };

  const variantGroups = variants.reduce((acc, v) => {
    if (v.name?.toLowerCase() === "customization") return acc;
    if (!acc[v.name]) acc[v.name] = [];
    acc[v.name].push(v);
    return acc;
  }, {});

  const variantModifier = Object.values(selectedVariants).reduce((sum, v) => sum + (v?.price_modifier || 0), 0);
  const customizationCharge = customizeJersey && isJerseyProduct ? customizationFee : 0;
  const finalPrice = product ? Number(product.price) + variantModifier + customizationCharge : 0;

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
  if (!product) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Product not found</h2>
        <p className="text-gray-500 mb-6">This product may have been removed or the link is incorrect.</p>
        <Link href="/" className="bg-green-900 hover:bg-green-800 text-white font-bold px-8 py-3 rounded-xl transition-colors inline-block">Back to Shop</Link>
      </div>
    </>
  );

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0;
  const images = product.images?.length > 0 ? product.images : [null];

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <nav className="text-sm text-gray-400 mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/" className="hover:text-green-900">Home</Link>
          <span>/</span>
          {product.country_of_origin && <><span className="hover:text-green-900">{product.country_of_origin}</span><span>/</span></>}
          <span className="text-gray-700 font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 mb-6">
          <div>
            {/* ── Main image with swipe + arrows ── */}
            <div
              className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3 relative"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {showJerseyPreview ? (
                <JerseyPreview name={jerseyName} number={jerseyNumber} />
              ) : (
                <>
                  {images[selectedImage] ? (
                    <Zoom>
                       <img src={images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
                    </Zoom>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">🛒</div>
                  )}
                  {discount > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-black px-3 py-1 rounded-full">-       {discount}%</div>
                  )}
                  {isJerseyProduct && (
                    <div className="absolute top-4 right-4 bg-green-900 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <FiEdit3 size={11} /> Customizable
                    </div>
                  )}
                  {/* Arrow buttons */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setSelectedImage((i) => Math.max(i - 1, 0))}
                        disabled={selectedImage === 0}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center shadow transition-all disabled:opacity-20 text-xl font-bold"
                      >‹</button>
                      <button
                        onClick={() => setSelectedImage((i) => Math.min(i + 1, images.length - 1))}
                        disabled={selectedImage === images.length - 1}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-9 h-9 flex items-center justify-center shadow transition-all disabled:opacity-20 text-xl font-bold"
                      >›</button>
                      {/* Dot indicators */}
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImage(i)}
                            className={`h-1.5 rounded-full transition-all ${i === selectedImage ? "bg-white w-4" : "bg-white/50 w-1.5"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {showJerseyPreview && (
                <div className="absolute top-3 right-3 bg-green-900 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <FiEdit3 size={11} /> Live Preview
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && !showJerseyPreview && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${i === selectedImage ? "border-green-900 shadow-md" : "border-transparent hover:border-gray-300"}`}>
                    {img ? <img src={img} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-100 flex items-center justify-center">🛒</div>}
                  </button>
                ))}
              </div>
            )}
            {showJerseyPreview && (
              <p className="text-xs text-center text-gray-400 mt-2">← Uncheck customization to see product photos</p>
            )}
          </div>

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

            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-4xl font-black text-green-900">${finalPrice.toFixed(2)}</span>
              {product.compare_price && <span className="text-xl text-gray-300 line-through">${Number(product.compare_price).toFixed(2)}</span>}
              {discount > 0 && <span className="bg-red-100 text-red-700 text-sm font-bold px-2.5 py-0.5 rounded-full">Save {discount}%</span>}
            </div>
            {variantModifier !== 0 && <p className="text-xs text-gray-400 mb-1">Base: ${Number(product.price).toFixed(2)} {variantModifier > 0 ? `+$${variantModifier.toFixed(2)}` : `-$${Math.abs(variantModifier).toFixed(2)}`}</p>}
            {customizationCharge > 0 && <p className="text-xs text-green-700 font-semibold mb-1">+${customizationCharge.toFixed(2)} customization fee included</p>}
            <p className="text-sm text-gray-400 mb-5">
              {product.stock > 0 ? <span className="text-green-600 font-medium">✓ In stock</span> : <span className="text-red-500 font-medium">Out of stock</span>}
            </p>

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

            {Object.entries(variantGroups).map(([groupName, groupVariants]) => (
              <div key={groupName} className="mb-4">
                <label className="text-sm font-bold text-gray-700 block mb-2">
                  {groupName}
                  {selectedVariants[groupName] && <span className="font-normal text-gray-400 ml-2">— {selectedVariants[groupName].value}</span>}
                </label>
                <div className="flex flex-wrap gap-2">
                  {groupVariants.map((v) => (
                    <button key={v.id} onClick={() => setSelectedVariants((s) => ({ ...s, [groupName]: v }))}
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

            {isJerseyProduct && (
              <div className={`rounded-2xl mb-5 overflow-hidden border-2 transition-all ${customizeJersey ? "border-green-700" : "border-gray-200"}`}>
                <button
                  onClick={() => setCustomizeJersey(!customizeJersey)}
                  className={`w-full flex items-center justify-between p-4 transition-colors ${customizeJersey ? "bg-green-50" : "bg-gray-50 hover:bg-gray-100"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${customizeJersey ? "bg-green-700 border-green-700" : "border-gray-300"}`}>
                      {customizeJersey && <FiCheck size={12} className="text-white" strokeWidth={3} />}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-gray-900 text-sm flex items-center gap-2">
                        <FiEdit3 size={14} className="text-green-700" />
                        Customize Your Jersey
                        {customizationFee > 0
                          ? <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">+${Number(customizationFee).toFixed(2)}</span>
                          : <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">FREE</span>
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Add your name and/or number to this jersey</p>
                    </div>
                  </div>
                  <span className={`text-gray-400 transition-transform ${customizeJersey ? "rotate-180" : ""}`}>▾</span>
                </button>

                {customizeJersey && (
                  <div className="p-4 bg-white border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                          Player Name <span className="text-gray-400 font-normal normal-case">(max 16 chars)</span>
                        </label>
                        <input
                          value={jerseyName}
                          onChange={e => setJerseyName(e.target.value.toUpperCase().replace(/[^A-Z\s]/g, "").slice(0, 16))}
                          placeholder="E.G. MENSAH"
                          className="w-full border-2 rounded-xl px-3 py-2.5 font-black text-center tracking-widest focus:outline-none focus:border-green-700 transition-colors placeholder-gray-300"
                          style={{ fontFamily: "monospace", fontSize: "16px", letterSpacing: "4px" }}
                        />
                        <p className="text-xs text-gray-400 mt-1 text-right">{jerseyName.length}/16</p>
                      </div>
                      <div className="col-span-2 md:col-span-1">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block mb-1.5">
                          Jersey Number <span className="text-gray-400 font-normal normal-case">(1–99)</span>
                        </label>
                        <input
                          type="number" min="1" max="99"
                          value={jerseyNumber}
                          onChange={e => {
                            const val = e.target.value.replace(/\D/g, "").slice(0, 2);
                            if (!val || (parseInt(val) >= 1 && parseInt(val) <= 99)) setJerseyNumber(val);
                          }}
                          placeholder="10"
                          className="w-full border-2 rounded-xl px-3 py-2.5 font-black text-center focus:outline-none focus:border-green-700 transition-colors placeholder-gray-300"
                          style={{ fontSize: "28px" }}
                        />
                      </div>
                    </div>

                    {(jerseyName || jerseyNumber) && (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-center">
                        <p className="text-xs text-green-800 font-semibold flex items-center justify-center gap-1.5">
                          👆 See your jersey back preview in the image above
                        </p>
                      </div>
                    )}

                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      <p className="text-xs text-yellow-800 font-semibold flex items-center gap-1.5 mb-1">
                        ℹ️ Customization Info
                      </p>
                      <p className="text-xs text-yellow-700">
                        Your customization request will be included with your order. The seller will contact you to confirm details before processing.
                        {customizationFee > 0 ? ` Customization fee: $${Number(customizationFee).toFixed(2)}` : " Customization is free for this product."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

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

            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.map((tag) => {
                  const tagStr = typeof tag === "string" ? tag : tag?.name ?? "";
                  return (
                    <Link key={tagStr} href={`/?q=${tagStr}`} className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full transition-colors">
                      #{tagStr}
                    </Link>
                  );
                })}
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
              <div className="flex items-center gap-2 ml-auto">
  
    href={`https://wa.me/?text=${encodeURIComponent(product.name + " - " + (typeof window !== "undefined" ? window.location.href : ""))}`}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 transition-colors font-medium"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.17 1.535 5.943L.057 23.571a.75.75 0 0 0 .925.899l5.82-1.525A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.5-5.232-1.375l-.374-.214-3.878 1.017 1.034-3.78-.23-.38A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
    WhatsApp
  </a>
  
    href={`sms:?body=${encodeURIComponent(product.name + " - " + (typeof window !== "undefined" ? window.location.href : ""))}`}
    className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 transition-colors font-medium"
  >
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
    Text
  </a>
  <button
    onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.success("Link copied!"); }}
    className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
  >
    <FiShare2 size={14} /> Copy
  </button>
</div>
            </div>
          </div>
        </div>

        <ProductRecommendations product={product} />
        <RecentlyViewed currentProductId={product.id} />
        <div id="reviews">
          <ReviewSection productId={product.id} initialReviews={reviews} />
        </div>
      </div>
      <Footer />
    </>
  );
}