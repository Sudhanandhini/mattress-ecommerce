'use client';

import { useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import { StaggerContainer, StaggerItem } from '../ui/AnimatedSection';
import { productApi } from '@/lib/api/client';

export function FeaturedProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await productApi.getAll();
        const productList = response.data?.products || response.data || response;
        const mapped = productList.slice(0, 4).map((p: any) => {
          const variants = (p.variants || []).filter((v: any) => v.isActive !== false);
          const sorted = [...variants].sort((a: any, b: any) => parseFloat(a.price) - parseFloat(b.price));
          const lowestVariant = sorted[0];
          const basePrice = parseFloat(lowestVariant?.price) || parseFloat(p.basePrice) || 0;
          const discountPrice = parseFloat(lowestVariant?.salePrice) || parseFloat(p.discountPrice) || basePrice;
          const discountPercent = basePrice > discountPrice
            ? Math.round(((basePrice - discountPrice) / basePrice) * 100)
            : (p.discountPercent || 0);
          const category = p.categories?.[0]?.category?.name || p.category || 'Mattress';
          return { ...p, category, basePrice, discountPrice, discountPercent };
        });
        setProducts(mapped);
      } catch (err) {
        console.error('Error fetching featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
            <div className="aspect-[4/3] bg-gray-200" />
            <div className="p-5 space-y-3">
              <div className="h-3 bg-gray-200 rounded w-1/3" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
}
