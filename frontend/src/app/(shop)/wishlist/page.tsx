'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, ShoppingCart, ChevronRight } from 'lucide-react';
import { useWishlistStore, useCartStore } from '@/store/useStore';
import toast from 'react-hot-toast';

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

export default function WishlistPage() {
  const { items, toggle } = useWishlistStore();
  const addItem = useCartStore(s => s.addItem);

  const handleAddToCart = (item: typeof items[0]) => {
    addItem({
      productId: item.productId,
      variantId: item.productId + '-default',
      productName: item.productName,
      productSlug: item.productSlug,
      imageUrl: item.imageUrl,
      variantLabel: '',
      price: item.salePrice ?? item.price,
      quantity: 1,
    });
    toast.success('Added to cart!');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
          <Heart className="w-10 h-10 text-red-200" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Your wishlist is empty</h2>
          <p className="text-gray-400 text-sm">Save products you love by tapping the heart icon.</p>
        </div>
        <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b py-2.5">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-1.5 text-xs text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-gray-800 font-medium">Wishlist</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Wishlist <span className="text-base font-normal text-gray-400">({items.length} items)</span>
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {items.map((item) => {
              const discPct = item.salePrice && item.price > item.salePrice
                ? Math.round(((item.price - item.salePrice) / item.price) * 100)
                : 0;
              return (
                <motion.div
                  key={item.productId}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Image */}
                  <Link href={`/products/${item.productSlug}`} className="relative block aspect-square bg-gray-50 overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">🛏️</div>
                    )}
                    {discPct > 0 && (
                      <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {discPct}% off
                      </span>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="p-3 flex flex-col flex-1">
                    <Link href={`/products/${item.productSlug}`} className="text-sm font-semibold text-gray-800 hover:text-indigo-600 transition line-clamp-2 flex-1">
                      {item.productName}
                    </Link>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-bold text-gray-900">₹{fmt(Math.round(item.salePrice ?? item.price))}</span>
                      {discPct > 0 && (
                        <span className="text-xs text-gray-400 line-through">₹{fmt(Math.round(item.price))}</span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAddToCart(item)}
                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition flex items-center justify-center gap-1.5"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                      </button>
                      <button
                        onClick={() => { toggle(item); toast.success('Removed from wishlist'); }}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
