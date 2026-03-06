'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star, Eye, ArrowRight, Heart, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore, useWishlistStore } from '@/store/useStore';
import toast from 'react-hot-toast';

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\n/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  basePrice: number;
  discountPercent: number;
  discountPrice: number;
  images?: { url: string; isPrimary: boolean }[];
  variants?: { id: string; price: string; salePrice?: string; label?: string; isActive?: boolean }[];
  avgRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  category?: string;
  image?: string;
  rating?: number;
}

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuthStore();
  const addToCart = useCartStore((s) => s.addItem);
  const { toggle: toggleWishlist, has: inWishlist } = useWishlistStore();

  const categoryLabel = product.category || 'Mattress';
  const imgUrl =
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url ||
    product.image;

  const isWishlisted = inWishlist(product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn()) {
      toast.error('Please login to add to wishlist');
      router.push('/login');
      return;
    }
    toggleWishlist({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: imgUrl || '',
      price: product.basePrice,
      salePrice: product.discountPrice !== product.basePrice ? product.discountPrice : null,
    });
    toast.success(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist');
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isLoggedIn()) {
      toast.error('Please login to add to cart');
      router.push('/login');
      return;
    }
    const activeVariants = (product.variants || []).filter((v) => v.isActive !== false);
    const variant = activeVariants[0];
    addToCart({
      productId: product.id,
      variantId: variant?.id || product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: imgUrl || '',
      variantLabel: variant?.label || 'Standard',
      price: product.discountPrice,
      quantity: 1,
    });
    toast.success('Added to cart');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="group"
    >
      <div className="bg-white rounded-2xl shadow-md overflow-hidden card-hover border border-gray-100">
        {/* Image */}
        <Link href={`/products/${product.slug}`}>
          <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
            {imgUrl ? (
              <Image
                src={imgUrl}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-500">
                &#128716;
              </div>
            )}

            {/* Category Tag */}
            <span className="absolute top-3 left-3 bg-accent-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {categoryLabel}
            </span>

            {/* Discount Badge */}
            {product.discountPercent > 0 && (
              <span className="absolute top-3 right-3 bg-navy-700 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                -{product.discountPercent}%
              </span>
            )}

            {/* Wishlist & Cart icons — show on hover */}
            <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handleWishlist}
                className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-colors ${
                  isWishlisted
                    ? 'bg-accent-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-accent-500 hover:text-white'
                }`}
                title="Add to Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={handleAddToCart}
                className="w-9 h-9 rounded-full bg-white text-gray-600 hover:bg-navy-700 hover:text-white flex items-center justify-center shadow-md transition-colors"
                title="Add to Cart"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-navy-700/0 group-hover:bg-navy-700/5 transition-colors duration-300" />
          </div>
        </Link>

        {/* Content */}
        <div className="p-5">
          <p className="text-xs font-semibold text-accent-500 uppercase tracking-wider mb-1">
            {categoryLabel}
          </p>

          <Link href={`/products/${product.slug}`}>
            <h3 className="font-bold text-navy-700 mb-1.5 group-hover:text-accent-500 transition-colors line-clamp-1 text-lg">
              {product.name}
            </h3>
          </Link>

          {product.shortDescription && (
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">
              {stripHtml(product.shortDescription)}
            </p>
          )}

          {/* Rating */}
          {(product.avgRating || product.rating) && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      i < Math.floor(product.avgRating || product.rating || 0)
                        ? 'fill-gold-400 text-gold-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              {product.reviewCount && (
                <span className="text-xs text-gray-500">({product.reviewCount})</span>
              )}
            </div>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-xl font-bold text-navy-700">
              &#8377;{product.discountPrice.toLocaleString()}
            </span>
            {product.discountPercent > 0 && (
              <span className="text-sm text-gray-400 line-through">
                &#8377;{product.basePrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link href={`/products/${product.slug}`} className="text-accent-500 text-sm font-semibold hover:underline flex items-center gap-1">
              View Details <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <div className="flex-1" />
            <Link href={`/products/${product.slug}`}>
              <Button size="sm" variant="primary">
                <Eye className="w-4 h-4 mr-1" /> View
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
