import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/layout/Navbar";
import Footer from "../../components/layout/Footer";
import { productsAPI, ordersAPI, reviewsAPI } from "../../lib/api";
import { useAuth } from "../_app";
import toast from "react-hot-toast";
import Link from "next/link";
import { FiStar, FiShoppingCart, FiPackage, FiMapPin, FiFlag } from "react-icons/fi";

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", body: "" });

  useEffect(() => {
    if (slug) {
      Promise.all([
        productsAPI.get(slug),
      ]).then(([prodRes]) => {
        setProduct(prodRes.data);
        reviewsAPI.getForProduct(prodRes.data.id).then((r) => setReviews(r.data));
      }).catch(() => router.push("/")).finally(() => setLoading(false));
    }
  }, [slug]);

  const addToCart = async () => {
    if (!user) { router.push("/login"); return; }
    setAddingToCart(true);
    try {
      await ordersAPI.addToCart({ product_id: product.id, quantity });
      toast.success(`${quantity}x "${product.name}" added to cart!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) { router.push("/login"); return; }
    try {
      const res = await reviewsAPI.create({ product_id: product.id, ...reviewForm });
      setReviews([res.data, ...reviews]);
      toast.success("Review submitted!");
      setReviewForm({ rating: 5, title: "", body: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to submit review");
    }
  };

  if (loading) return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-gray-200 aspect-square rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-10 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      </div>
    </>
  );

  if (!product) return null;

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <>
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-900">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-3">
              {product.images?.[selectedImage] ? (
                <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">🛒</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 ${i === selectedImage ? "border-green-900" : "border-transparent"}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              {product.country_of_origin && (
                <span className="badge bg-green-100 text-green-900 flex-shrink-0">
                  🌍 {product.country_of_origin}
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1,2,3,4,5].map((i) => (
                  <FiStar key={i} size={16} className={i <= Math.round(product.avg_rating) ? "star-filled fill-current" : "star-empty"} />
                ))}
              </div>
              <span className="text-sm text-gray-500">{product.avg_rating.toFixed(1)} ({product.review_count} reviews)</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-3xl font-black text-green-900">${product.price.toFixed(2)}</span>
              {product.compare_price && (
                <span className="text-lg text-gray-400 line-through">${product.compare_price.toFixed(2)}</span>
              )}
              {discount > 0 && (
                <span className="badge bg-red-100 text-red-700">Save {discount}%</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-5">
              {product.currency} · {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
            </p>

            {/* Store info */}
            {product.store && (
              <Link href={`/stores/${product.store.slug}`} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3 mb-5 hover:bg-gray-100 transition-colors">
                {product.store.logo_url ? (
                  <img src={product.store.logo_url} alt={product.store.name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-900 flex items-center justify-center text-white font-bold text-sm">
                    {product.store.name[0]}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-800">{product.store.name}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1"><FiMapPin size={10} /> {product.store.city || product.store.country}</p>
                </div>
              </Link>
            )}

            {/* Add to cart */}
            <div className="flex gap-3 mb-6">
              <div className="flex items-center border rounded-lg overflow-hidden">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2.5 hover:bg-gray-100 font-bold">−</button>
                <span className="px-4 py-2.5 font-semibold min-w-[40px] text-center">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="px-3 py-2.5 hover:bg-gray-100 font-bold">+</button>
              </div>
              <button
                onClick={addToCart}
                disabled={addingToCart || product.stock === 0}
                className="flex-1 btn-primary flex items-center justify-center gap-2 py-3 disabled:opacity-50"
              >
                <FiShoppingCart />
                {addingToCart ? "Adding..." : "Add to Cart"}
              </button>
            </div>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.tags.map((tag) => (
                  <span key={tag} className="badge bg-gray-100 text-gray-600">#{tag}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 border-t pt-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
          <div className="grid md:grid-cols-2 gap-10">
            {/* Write review */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Write a Review</h3>
              <form onSubmit={submitReview} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Rating</label>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((i) => (
                      <button key={i} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: i })}>
                        <FiStar size={24} className={i <= reviewForm.rating ? "star-filled fill-current" : "star-empty"} />
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text" placeholder="Review title"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                />
                <textarea
                  placeholder="Share your experience..."
                  value={reviewForm.body}
                  onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-900"
                />
                <button type="submit" className="btn-primary py-2 px-6">Submit Review</button>
              </form>
            </div>

            {/* Review list */}
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-gray-500">No reviews yet. Be the first!</p>
              ) : reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {r.user.full_name[0]}
                      </div>
                      <span className="text-sm font-medium">{r.user.full_name}</span>
                      {r.is_verified_purchase && (
                        <span className="badge bg-green-100 text-green-800 text-xs">✓ Verified</span>
                      )}
                    </div>
                    <div className="flex">
                      {[1,2,3,4,5].map((i) => (
                        <FiStar key={i} size={12} className={i <= r.rating ? "star-filled fill-current" : "star-empty"} />
                      ))}
                    </div>
                  </div>
                  {r.title && <p className="font-semibold text-sm mb-1">{r.title}</p>}
                  {r.body && <p className="text-sm text-gray-600">{r.body}</p>}
                  <p className="text-xs text-gray-400 mt-2">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
