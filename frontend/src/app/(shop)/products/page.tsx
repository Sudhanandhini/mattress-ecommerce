'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, X, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductCard } from '@/components/product/ProductCard';
import { Button } from '@/components/ui/Button';
import { productApi, categoryApi } from '@/lib/api/client';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

interface Variant {
  id: string;
  sizeGroup?: string;
  size?: string;
  thickness?: string;
  firmness?: string;
  color?: string;
  price: string;
  salePrice?: string;
  isActive?: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  basePrice: number;
  discountPrice: number;
  discountPercent: number;
  rating?: number;
  category: string;
  shortDescription?: string;
  avgRating?: number;
  reviewCount?: number;
  variants?: Variant[];
  images?: { url: string; isPrimary: boolean }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const PRICE_RANGES = [
  { label: 'Under ₹20,000', min: 0, max: 20000 },
  { label: '₹20,000 - ₹40,000', min: 20000, max: 40000 },
  { label: '₹40,000 - ₹60,000', min: 40000, max: 60000 },
  { label: '₹60,000+', min: 60000, max: Infinity },
];

const SIZE_GROUPS = ['Single', 'Double', 'Queen', 'King', 'Super King'];

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <h3 className="text-base font-bold text-navy-700 flex items-center gap-2">
          <span className="text-accent-500">&#9679;</span> {title}
        </h3>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-6 pb-5">{children}</div>}
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedThickness, setSelectedThickness] = useState<string[]>([]);
  const [selectedDimensions, setSelectedDimensions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('popularity');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    categoryApi.getAll().then((res) => setCategories(res.data || res)).catch(console.error);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await productApi.getAll();
        const productList = response.data?.products || response.data || response;
        const mapped = productList.map((p: any) => {
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
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Extract unique filter values from variants
  const availableColors = useMemo(() => {
    const all = products.flatMap((p) => (p.variants || []).map((v) => v.color).filter(Boolean)) as string[];
    return [...new Set(all)].sort();
  }, [products]);

  const availableThickness = useMemo(() => {
    const all = products.flatMap((p) => (p.variants || []).map((v) => v.thickness).filter(Boolean)) as string[];
    return [...new Set(all)].sort();
  }, [products]);

  const availableDimensions = useMemo(() => {
    const all = products.flatMap((p) => (p.variants || []).map((v) => v.size).filter(Boolean)) as string[];
    return [...new Set(all)].sort();
  }, [products]);

  // Filtering
  useEffect(() => {
    let result = [...products];

    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (selectedPriceRange) {
      result = result.filter(
        (p) => p.discountPrice >= selectedPriceRange.min && p.discountPrice <= selectedPriceRange.max
      );
    }
    if (searchTerm) {
      result = result.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        (p.variants || []).some((v) => v.sizeGroup && selectedSizes.includes(v.sizeGroup))
      );
    }
    if (selectedColors.length > 0) {
      result = result.filter((p) =>
        (p.variants || []).some((v) => v.color && selectedColors.includes(v.color))
      );
    }
    if (selectedThickness.length > 0) {
      result = result.filter((p) =>
        (p.variants || []).some((v) => v.thickness && selectedThickness.includes(v.thickness))
      );
    }
    if (selectedDimensions.length > 0) {
      result = result.filter((p) =>
        (p.variants || []).some((v) => v.size && selectedDimensions.includes(v.size))
      );
    }

    if (sortBy === 'price-low') result.sort((a, b) => a.discountPrice - b.discountPrice);
    else if (sortBy === 'price-high') result.sort((a, b) => b.discountPrice - a.discountPrice);
    else if (sortBy === 'rating') result.sort((a, b) => (b.avgRating || 0) - (a.avgRating || 0));

    setFilteredProducts(result);
  }, [selectedCategory, selectedPriceRange, sortBy, searchTerm, selectedSizes, selectedColors, selectedThickness, selectedDimensions, products]);

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedPriceRange(null);
    setSearchTerm('');
    setSortBy('popularity');
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedThickness([]);
    setSelectedDimensions([]);
  };

  const toggleMulti = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const activeFilterCount =
    (selectedCategory !== 'All' ? 1 : 0) +
    (selectedPriceRange ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    selectedThickness.length +
    selectedDimensions.length;

  const FilterSidebar = () => (
    <div className="space-y-4">
      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <button
          onClick={clearFilters}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-accent-50 text-accent-600 rounded-xl text-sm font-semibold border border-accent-200"
        >
          <span>Clear All Filters</span>
          <span className="bg-accent-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFilterCount}
          </span>
        </button>
      )}

      {/* Categories */}
      <FilterSection title="Categories">
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory('All')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedCategory === 'All' ? 'bg-accent-500 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>All</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === 'All' ? 'bg-white/20' : 'bg-gray-100'}`}>
              {products.length}
            </span>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedCategory === cat.name ? 'bg-accent-500 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${selectedCategory === cat.name ? 'bg-white/20' : 'bg-gray-100'}`}>
                {products.filter((p) => p.category === cat.name).length}
              </span>
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Size */}
      <FilterSection title="Size">
        <div className="grid grid-cols-2 gap-2">
          {SIZE_GROUPS.map((size) => (
            <button
              key={size}
              onClick={() => toggleMulti(size, selectedSizes, setSelectedSizes)}
              className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all text-center ${
                selectedSizes.includes(size)
                  ? 'bg-accent-500 text-white border-accent-500'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-accent-400'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Dimensions (Width x Length) */}
      {availableDimensions.length > 0 && (
        <FilterSection title="Dimensions (W×L)" defaultOpen={false}>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {availableDimensions.map((dim) => (
              <label key={dim} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedDimensions.includes(dim)}
                  onChange={() => toggleMulti(dim, selectedDimensions, setSelectedDimensions)}
                  className="w-4 h-4 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-navy-700">{dim}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Thickness / Height */}
      {availableThickness.length > 0 && (
        <FilterSection title="Thickness / Height" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-2">
            {availableThickness.map((t) => (
              <button
                key={t}
                onClick={() => toggleMulti(t, selectedThickness, setSelectedThickness)}
                className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-center ${
                  selectedThickness.includes(t)
                    ? 'bg-navy-700 text-white border-navy-700'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-navy-400'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Color */}
      {availableColors.length > 0 && (
        <FilterSection title="Color" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((color) => (
              <button
                key={color}
                onClick={() => toggleMulti(color, selectedColors, setSelectedColors)}
                className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedColors.includes(color)
                    ? 'bg-accent-500 text-white border-accent-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-accent-400'
                }`}
              >
                {color}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="space-y-1">
          <button
            onClick={() => setSelectedPriceRange(null)}
            className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedPriceRange === null ? 'bg-accent-50 text-accent-600' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Prices
          </button>
          {PRICE_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedPriceRange({ min: range.min, max: range.max })}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                selectedPriceRange?.min === range.min && selectedPriceRange?.max === range.max
                  ? 'bg-accent-50 text-accent-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero */}
      <section className="relative bg-navy-700 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1) 0%, transparent 50%)',
          }} />
        </div>
        <div className="container mx-auto px-4 relative z-10 py-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white">Products</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              <span className="font-cursive italic text-accent-400">Shop</span>
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-navy-700">{filteredProducts.length}</span> of{' '}
              <span className="font-semibold text-navy-700">{products.length}</span> results
            </p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent w-48 md:w-64 bg-white"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 bg-white"
              >
                <option value="popularity">Popularity</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
              <button
                onClick={() => setShowMobileFilters(true)}
                className="lg:hidden relative p-2.5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50"
              >
                <SlidersHorizontal className="w-4 h-4 text-gray-600" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-accent-500 text-white text-xs rounded-full flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedSizes.map((s) => (
                <span key={s} className="flex items-center gap-1 bg-accent-100 text-accent-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  Size: {s}
                  <button onClick={() => toggleMulti(s, selectedSizes, setSelectedSizes)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {selectedColors.map((c) => (
                <span key={c} className="flex items-center gap-1 bg-accent-100 text-accent-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  Color: {c}
                  <button onClick={() => toggleMulti(c, selectedColors, setSelectedColors)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {selectedThickness.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-accent-100 text-accent-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  Thickness: {t}
                  <button onClick={() => toggleMulti(t, selectedThickness, setSelectedThickness)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {selectedDimensions.map((d) => (
                <span key={d} className="flex items-center gap-1 bg-accent-100 text-accent-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  Size: {d}
                  <button onClick={() => toggleMulti(d, selectedDimensions, setSelectedDimensions)}><X className="w-3 h-3" /></button>
                </span>
              ))}
              {selectedPriceRange && (
                <span className="flex items-center gap-1 bg-accent-100 text-accent-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  {PRICE_RANGES.find((r) => r.min === selectedPriceRange.min)?.label}
                  <button onClick={() => setSelectedPriceRange(null)}><X className="w-3 h-3" /></button>
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="sticky top-24">
                <FilterSidebar />
              </div>
            </div>

            {/* Mobile Filter Overlay */}
            {showMobileFilters && (
              <div className="fixed inset-0 z-50 lg:hidden">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  className="absolute left-0 top-0 bottom-0 w-80 bg-gray-50 p-6 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold text-navy-700">Filters</h2>
                    <button onClick={() => setShowMobileFilters(false)}>
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <FilterSidebar />
                </motion.div>
              </div>
            )}

            {/* Products Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block w-10 h-10 border-3 border-accent-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-500">Loading products...</p>
                </div>
              ) : error ? (
                <AnimatedSection className="text-center py-20">
                  <p className="text-red-500 mb-4">{error}</p>
                  <Button onClick={() => window.location.reload()}>Retry</Button>
                </AnimatedSection>
              ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredProducts.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              ) : (
                <AnimatedSection className="text-center py-20">
                  <div className="text-6xl mb-4">&#128533;</div>
                  <p className="text-gray-600 mb-4 text-lg">No products found matching your criteria</p>
                  <Button onClick={clearFilters}>Clear Filters</Button>
                </AnimatedSection>
              )}

              {filteredProducts.length > 0 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button className="w-10 h-10 rounded-full bg-accent-500 text-white font-semibold text-sm">1</button>
                  <button className="w-10 h-10 rounded-full bg-white text-gray-600 font-semibold text-sm border border-gray-200 hover:border-accent-500 hover:text-accent-500 transition-colors">2</button>
                  <button className="w-10 h-10 rounded-full bg-white text-gray-600 font-semibold text-sm border border-gray-200 hover:border-accent-500 hover:text-accent-500 transition-colors">3</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
