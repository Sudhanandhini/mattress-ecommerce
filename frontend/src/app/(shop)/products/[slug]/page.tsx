'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight, ChevronLeft, Star, ShieldCheck,
  Gift, Phone, X, Heart, Share2, ChevronDown, ShoppingCart, Zap,
} from 'lucide-react';
import { productApi } from '@/lib/api/client';
import { useCartStore, useWishlistStore, useBuyNowStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { AuthModal } from '@/components/auth/AuthModal';
import toast from 'react-hot-toast';

/* ── Types ──────────────────────────────────────────────────────────── */
interface Variant {
  id: string;
  sizeGroup: string | null;
  size: string;
  thickness: string | null;
  firmness: string | null;
  price: string | number;
  salePrice: string | number | null;
  inStock: boolean;
  description: string | null;
}
interface Spec    { label: string; value: string; sortOrder: number }
interface Badge   { title: string; icon: string | null }
interface Freebie { name: string; image: string | null }
interface PImage  { url: string; isPrimary: boolean; altText: string | null }

interface Product {
  id: string; name: string; slug: string;
  description: string | null; shortDescription: string | null;
  brand: string | null; warranty: string | null; material: string | null;
  sizeGroups: string | null; dimensions: string | null; firmness: string | null;
  avgRating: number; reviewCount: number; inStock: boolean;
  categories: { category: { id: string; name: string; slug: string } }[];
  images: PImage[];
  variants: Variant[];
  specifications: Spec[];
  badges: Badge[];
  freebies: Freebie[];
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function cleanDesc(html: string): string {
  return html
    .replace(/<table[\s\S]*?<\/table>/gi, '')
    .replace(/<h1[\s\S]*?<\/h1>/gi, '')
    .replace(/\\n/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim();
}

function cleanShortDesc(html: string): string {
  return html
    .replace(/\\n/g, ' ')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/<div[^>]*class="[^"]*(?:row|col)[^"]*"[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          style={{ width: size, height: size }}
          className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
        />
      ))}
    </div>
  );
}

/* ── Variant Modal ───────────────────────────────────────────────────── */
function VariantModal({
  product, group, dim, thickness,
  onGroup, onDim, onThickness, onConfirm, onClose,
}: {
  product: Product;
  group: string; dim: string; thickness: string;
  onGroup: (g: string) => void;
  onDim: (d: string) => void;
  onThickness: (t: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const groups = Array.from(new Set(product.variants.map(v => v.sizeGroup || 'Standard')));
  const dims   = Array.from(new Set(
    product.variants.filter(v => (v.sizeGroup || 'Standard') === group).map(v => v.size)
  ));
  const thicknesses = Array.from(new Set(
    product.variants
      .filter(v => (v.sizeGroup || 'Standard') === group && v.size === dim && v.thickness)
      .map(v => v.thickness!)
  ));
  const matched = product.variants.find(
    v => (v.sizeGroup || 'Standard') === group && v.size === dim && (v.thickness || '') === thickness
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-2xl z-10 flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-gray-900">Choose a Variant</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Product name */}
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-50 border-b">
          {product.images[0]?.url && (
            <img src={product.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
          )}
          <p className="text-sm font-medium text-gray-800 line-clamp-2">{product.name}</p>
        </div>

        <div className="p-5 space-y-6 flex-1">

          {/* Size Group */}
          {groups.length > 1 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Size Group</p>
              <div className="flex gap-2 flex-wrap">
                {groups.map(g => (
                  <button
                    key={g}
                    onClick={() => onGroup(g)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                      group === g
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dimension */}
          {dims.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Dimension</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {dims.map(d => (
                  <button
                    key={d}
                    onClick={() => onDim(d)}
                    className={`py-2.5 rounded-lg text-sm font-medium border-2 transition-all text-center ${
                      dim === d
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {d} Inch
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Thickness */}
          {thicknesses.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thickness</p>
              <div className="flex gap-2 flex-wrap">
                {thicknesses.map(t => (
                  <button
                    key={t}
                    onClick={() => onThickness(t)}
                    className={`w-16 py-2.5 rounded-lg text-sm font-bold border-2 transition-all ${
                      thickness === t
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-400'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {matched?.description && (
                <div className="mt-3 flex items-start gap-2 text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                  <span className="text-base leading-none shrink-0">👍</span>
                  <span>({thickness} inch Thickness) {matched.description}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="px-5 py-4 border-t bg-white sticky bottom-0">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition active:scale-[0.98]"
          >
            Confirm Variant
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────── */
export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router   = useRouter();

  const addToCart    = useCartStore(s => s.addItem);
  const toggleWish   = useWishlistStore(s => s.toggle);
  const isWishlisted = useWishlistStore(s => s.has);
  const setBuyNow    = useBuyNowStore(s => s.set);
  const isLoggedIn   = useAuthStore(s => s.isLoggedIn());

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingWishlist, setPendingWishlist] = useState(false);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab]         = useState<'desc' | 'specs' | 'reviews'>('desc');
  const [showModal, setShowModal] = useState(false);

  // Confirmed variant (shown on page)
  const [cGroup, setCGroup] = useState('');
  const [cDim, setCDim]     = useState('');
  const [cThick, setCThick] = useState('');

  // Temp selections inside modal
  const [mGroup, setMGroup] = useState('');
  const [mDim, setMDim]     = useState('');
  const [mThick, setMThick] = useState('');

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res  = await productApi.getBySlug(slug);
        const data: Product = res.data || res;
        setProduct(data);
        if (data.variants?.length) {
          const v = data.variants[0];
          const g = v.sizeGroup || 'Standard';
          setCGroup(g); setCDim(v.size); setCThick(v.thickness || '');
        }
      } catch {
        setError('Product not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !product) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <p className="text-red-500">{error || 'Product not found.'}</p>
      <Link href="/products" className="text-indigo-600 underline text-sm">Back to Products</Link>
    </div>
  );

  /* ── Derived ────────────────────────────────────────────────────────── */
  const catName = product.categories?.[0]?.category?.name || 'Mattress';
  const catSlug = product.categories?.[0]?.category?.slug || '';

  const variant = product.variants.find(
    v => (v.sizeGroup || 'Standard') === cGroup && v.size === cDim && (v.thickness || '') === cThick
  ) ?? product.variants[0];

  const price   = parseFloat(String(variant?.price ?? 0));
  const sale    = variant?.salePrice ? parseFloat(String(variant.salePrice)) : price;
  const discPct = price > sale ? Math.round(((price - sale) / price) * 100) : 0;

  const images  = product.images?.length
    ? product.images
    : [{ url: '', isPrimary: true, altText: product.name }];

  // Build variant label for the choose-size button
  const variantLabel = [
    cGroup !== 'Standard' ? cGroup : '',
    cDim,
    cThick ? `${cThick}"` : '',
  ].filter(Boolean).join(' | ');

  const openModal = () => {
    setMGroup(cGroup); setMDim(cDim); setMThick(cThick);
    setShowModal(true);
  };

  const confirmModal = () => {
    setCGroup(mGroup); setCDim(mDim); setCThick(mThick);
    setShowModal(false);
  };

  // When group changes in modal → reset dim + thickness to first match
  const handleModalGroup = (g: string) => {
    setMGroup(g);
    const firstV = product!.variants.find(v => (v.sizeGroup || 'Standard') === g);
    const firstDim = firstV?.size || '';
    setMDim(firstDim);
    const firstThick = product!.variants.find(v => (v.sizeGroup || 'Standard') === g && v.size === firstDim)?.thickness || '';
    setMThick(firstThick);
  };

  // When dim changes in modal → reset thickness to first match
  const handleModalDim = (d: string) => {
    setMDim(d);
    const firstThick = product!.variants.find(v => (v.sizeGroup || 'Standard') === mGroup && v.size === d)?.thickness || '';
    setMThick(firstThick);
  };

  const wished = isWishlisted(product.id);

  const handleAddToCart = () => {
    if (!variant) return;
    addToCart({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: images[0]?.url || '',
      variantLabel: variantLabel,
      price: sale,
      quantity: 1,
    });
    toast.success('Added to cart!');
  };

  const handleOrderNow = () => {
    if (!variant) return;
    setBuyNow({
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: images[0]?.url || '',
      variantLabel: variantLabel,
      price: sale,
      quantity: 1,
    });
    router.push('/checkout?source=buynow');
  };

  const doToggleWishlist = () => {
    toggleWish({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: images[0]?.url || '',
      price,
      salePrice: variant?.salePrice ? parseFloat(String(variant.salePrice)) : null,
    });
    toast.success(wished ? 'Removed from wishlist' : 'Added to wishlist!');
  };

  const handleWishlist = () => {
    if (!isLoggedIn) {
      setPendingWishlist(true);
      setShowAuthModal(true);
      return;
    }
    doToggleWishlist();
  };

  const handleAuthSuccess = () => {
    if (pendingWishlist) {
      doToggleWishlist();
      setPendingWishlist(false);
    }
  };

  const tabs = [
    { key: 'desc',    label: 'Description' },
    { key: 'specs',   label: `Specifications (${product.specifications?.length ?? 0})` },
    { key: 'reviews', label: `Reviews (${product.reviewCount})` },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Breadcrumb */}
      <div className="bg-white border-b py-2.5">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
            <Link href="/"         className="hover:text-indigo-600 transition">Home</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link href="/products" className="hover:text-indigo-600 transition">Products</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <Link href={`/products?category=${catSlug}`} className="hover:text-indigo-600 transition">{catName}</Link>
            <ChevronRight className="w-3 h-3 shrink-0" />
            <span className="text-gray-800 font-medium truncate max-w-[180px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">

        {/* ── Main Card ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* LEFT — Image Gallery */}
            <div className="p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
              <div className="flex gap-3">

                {/* Vertical thumbnails — desktop only */}
                {images.length > 1 && (
                  <div className="hidden md:flex flex-col gap-2 w-[68px] shrink-0 overflow-y-auto max-h-[440px]">
                    {images.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                          activeImg === i
                            ? 'border-indigo-500 shadow-sm'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {img.url
                          ? <img src={img.url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xl">🛏️</div>
                        }
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image */}
                <div className="flex-1 relative rounded-xl overflow-hidden bg-gray-50 aspect-square">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeImg}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="w-full h-full"
                    >
                      {images[activeImg]?.url ? (
                        <img
                          src={images[activeImg].url}
                          alt={images[activeImg].altText || product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl">🛏️</div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Discount badge */}
                  {discPct > 0 && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                      {discPct}% off
                    </span>
                  )}

                  {/* Prev / Next — mobile only */}
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                        className="md:hidden absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-700" />
                      </button>
                      <button
                        onClick={() => setActiveImg(i => (i + 1) % images.length)}
                        className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Wishlist + Share */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2">
                    <button onClick={handleWishlist} className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition">
                      <Heart className={`w-4 h-4 transition ${wished ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}`} />
                    </button>
                    <button className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition">
                      <Share2 className="w-4 h-4 text-gray-400 hover:text-indigo-500 transition" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal thumbnails — mobile only */}
              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto mt-3 md:hidden pb-1">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                        activeImg === i ? 'border-indigo-500' : 'border-gray-200'
                      }`}
                    >
                      {img.url
                        ? <img src={img.url} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-gray-100 flex items-center justify-center">🛏️</div>
                      }
                    </button>
                  ))}
                </div>
              )}

              {/* Freebies */}
              {product.freebies?.length > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" /> FREE with this product
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.freebies.map((f, i) => (
                      <span key={i} className="text-xs bg-white text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                        🎁 {f.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT — Product Info */}
            <div className="p-5 lg:p-7 flex flex-col gap-4">

              {/* Name */}
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Variant summary tag */}
              {variantLabel && (
                <p className="text-sm text-gray-500">{variantLabel}</p>
              )}

              {/* Rating */}
              <div className="flex items-center gap-2">
                <StarRow rating={product.avgRating} size={15} />
                <span className="text-sm text-gray-500">
                  {Number(product.avgRating).toFixed(1)}
                  {product.reviewCount > 0 && ` (${product.reviewCount} reviews)`}
                </span>
              </div>

              {/* Sale banner */}
              {discPct > 0 && (
                <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5">
                  <span className="text-lg">🏷️</span>
                  <div className="text-sm">
                    <span className="font-bold text-orange-700">SALE OFFER  </span>
                    <span className="text-orange-600">Save {discPct}% on this product!</span>
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-extrabold text-gray-900">
                    ₹{fmt(Math.round(sale))}
                  </span>
                  {discPct > 0 && (
                    <>
                      <span className="text-lg text-gray-400 line-through">MRP ₹{fmt(Math.round(price))}</span>
                      <span className="text-green-600 font-bold text-sm">{discPct}% off</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">(Incl. of all Taxes)</p>
              </div>

              {/* Size Variant Selector */}
              {product.variants.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-xs text-gray-400 font-medium">
                    {product.variants.length} Standard &amp; Custom options
                  </p>

                  {/* Inline dropdown */}
                  <div className="relative">
                    <select
                      value={`${cGroup}|${cDim}|${cThick}`}
                      onChange={e => {
                        const [g, d, t] = e.target.value.split('|');
                        setCGroup(g); setCDim(d); setCThick(t);
                      }}
                      className="w-full appearance-none px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-800 bg-white focus:outline-none focus:border-indigo-400 pr-10 cursor-pointer"
                    >
                      {product.variants.map((v, i) => {
                        const g = v.sizeGroup || 'Standard';
                        const vSale  = v.salePrice ? parseFloat(String(v.salePrice)) : null;
                        const vPrice = parseFloat(String(v.price));
                        const displayPrice = vSale ?? vPrice;
                        const parts = [
                          g !== 'Standard' ? g : '',
                          v.size,
                          v.thickness ? `${v.thickness} Inch` : '',
                        ].filter(Boolean).join(' | ');
                        return (
                          <option key={v.id || i} value={`${g}|${v.size}|${v.thickness || ''}`}>
                            {parts} — ₹{fmt(Math.round(displayPrice))}
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {/* Selected variant details: size group + thickness */}
                  <div className="flex gap-2 flex-wrap">
                    {cGroup && cGroup !== 'Standard' && (
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold px-3 py-1.5 rounded-full">
                        {cGroup}
                      </span>
                    )}
                    {cDim && (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                        📐 {cDim} Inches
                      </span>
                    )}
                    {cThick && (
                      <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold px-3 py-1.5 rounded-full">
                        📏 Thickness: {cThick} Inch
                      </span>
                    )}
                  </div>

                  {/* Custom size note */}
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-1">
                    <p className="text-sm font-semibold text-gray-700">Need A Custom Size Mattress?</p>
                    <p className="text-xs text-red-600 font-bold leading-snug">
                      Note: All The Measurement Are In Inches (Length × Width)
                      {cThick && <><br />THICKNESS = {cThick} INCH</>}
                    </p>
                    <p className="text-xs text-gray-500 leading-snug">
                      Note: Flat 70% off (Diwali Dhamaka Sale) Will Be Applied In Cart Page
                    </p>
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 transition active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
                >
                  <ShoppingCart className="w-4 h-4" /> Add to Cart
                </button>
                <button
                  onClick={handleWishlist}
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition shrink-0 ${
                    wished
                      ? 'border-red-300 bg-red-50 text-red-500'
                      : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-400 hover:text-red-400'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${wished ? 'fill-red-500' : ''}`} />
                </button>
              </div>
              <button
                onClick={handleOrderNow}
                className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold text-base hover:bg-orange-600 transition active:scale-[0.99] flex items-center justify-center gap-2 shadow-sm"
              >
                <Zap className="w-4 h-4" /> Order Now
              </button>
              <Link href="/contact">
                <button className="w-full py-3 border-2 border-indigo-600 text-indigo-600 rounded-xl font-bold text-base hover:bg-indigo-50 transition active:scale-[0.99] flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" /> Get Quote
                </button>
              </Link>

              {/* Warranty strip */}
              {product.warranty && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span><strong>{product.warranty}</strong> Warranty Included</span>
                </div>
              )}

              {/* Short description */}
              {product.shortDescription && (() => {
                const clean = cleanShortDesc(product.shortDescription);
                const textOnly = clean.replace(/<[^>]+>/g, '').trim();
                if (!textOnly) return null;
                return (
                  <div
                    className="text-sm text-gray-500 leading-relaxed border-t border-gray-100 pt-3 [&_strong]:font-semibold [&_strong]:text-gray-700"
                    dangerouslySetInnerHTML={{ __html: clean }}
                  />
                );
              })()}

              {/* Trust badges */}
              {product.badges?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 border-t border-gray-100 pt-3">
                  {product.badges.map((badge, i) => (
                    <div key={i} className="flex flex-col items-center text-center gap-1.5 bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                      <ShieldCheck className="w-5 h-5 text-indigo-500" />
                      <span className="text-xs font-medium text-gray-700 leading-tight">{badge.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors border-b-2 ${
                  tab === t.key
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/40'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-8">
            <AnimatePresence mode="wait">

              {tab === 'desc' && (
                <motion.div key="desc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {product.description ? (
                    <div
                      className="prose prose-sm max-w-none text-gray-600 [&_strong]:font-semibold [&_strong]:text-gray-800 [&_h4]:font-bold [&_h4]:text-gray-800 [&_h5]:font-semibold [&_h5]:text-gray-700 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                      dangerouslySetInnerHTML={{ __html: cleanDesc(product.description) }}
                    />
                  ) : (
                    <p className="text-gray-400 text-sm">No description available.</p>
                  )}
                </motion.div>
              )}

              {tab === 'specs' && (
                <motion.div key="specs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {product.specifications?.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-gray-100">
                      <div className="grid grid-cols-2 bg-gray-800 text-white text-xs font-bold">
                        <div className="px-4 py-3">DESCRIPTION</div>
                        <div className="px-4 py-3 border-l border-gray-700">SPECIFICATION</div>
                      </div>
                      {product.specifications.map((spec, i) => (
                        <div key={i} className={`grid grid-cols-2 border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="px-4 py-3 font-medium text-gray-700 text-xs border-r border-gray-100 uppercase tracking-wide">{spec.label}</div>
                          <div className="px-4 py-3 text-gray-600 text-xs uppercase tracking-wide">{spec.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">No specifications available.</p>
                  )}
                </motion.div>
              )}

              {tab === 'reviews' && (
                <motion.div key="reviews" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center gap-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="text-center shrink-0">
                      <div className="text-4xl font-extrabold text-gray-900">{Number(product.avgRating).toFixed(1)}</div>
                      <StarRow rating={product.avgRating} size={16} />
                      <p className="text-xs text-gray-400 mt-1">{product.reviewCount} reviews</p>
                    </div>
                    <div className="w-px h-14 bg-gray-200 shrink-0" />
                    <p className="text-sm text-gray-500 leading-relaxed">
                      {product.reviewCount === 0
                        ? 'No reviews yet. Be the first to share your experience.'
                        : `Based on ${product.reviewCount} customer review${product.reviewCount > 1 ? 's' : ''}.`}
                    </p>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Back link */}
        <Link href="/products" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          <ChevronLeft className="w-4 h-4" /> Back to Products
        </Link>

      </div>

      {/* ── Variant Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <VariantModal
            product={product}
            group={mGroup} dim={mDim} thickness={mThick}
            onGroup={handleModalGroup}
            onDim={handleModalDim}
            onThickness={setMThick}
            onConfirm={confirmModal}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal
            onClose={() => { setShowAuthModal(false); setPendingWishlist(false); }}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
