'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Star, Image as ImageIcon, Gift } from 'lucide-react';

interface ImageRow { url: string; altText: string; isPrimary: boolean }
interface SpecRow  { label: string; value: string }
interface FreebieRow { name: string }

interface FormData {
  name: string; sku: string; shortDescription: string; description: string;
  basePrice: string; discountPrice: string; stock: string; lowStockAlert: string;
  brand: string; material: string; warranty: string; status: string; isFeatured: boolean;
}

const EMPTY_FORM: FormData = {
  name: '', sku: '', shortDescription: '', description: '',
  basePrice: '', discountPrice: '', stock: '0', lowStockAlert: '10',
  brand: '', material: '', warranty: '', status: 'ACTIVE', isFeatured: false,
};

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

function toSlug(name: string): string {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function AddProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [formData, setFormData]     = useState<FormData>(EMPTY_FORM);
  const [images, setImages]         = useState<ImageRow[]>([{ url: '', altText: '', isPrimary: true }]);
  const [specs, setSpecs]           = useState<SpecRow[]>([{ label: '', value: '' }]);
  const [freebies, setFreebies]     = useState<FreebieRow[]>([{ name: '' }]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }));
  };

  // ─── Images ───────────────────────────────────────────────
  const addImage = () => setImages(prev => [...prev, { url: '', altText: '', isPrimary: false }]);
  const removeImage = (i: number) => setImages(prev => prev.filter((_, idx) => idx !== i));
  const updateImage = (i: number, field: keyof ImageRow, val: string | boolean) =>
    setImages(prev => prev.map((img, idx) => idx === i ? { ...img, [field]: val } : img));
  const setPrimary = (i: number) =>
    setImages(prev => prev.map((img, idx) => ({ ...img, isPrimary: idx === i })));

  // ─── Specs ────────────────────────────────────────────────
  const addSpec = () => setSpecs(prev => [...prev, { label: '', value: '' }]);
  const removeSpec = (i: number) => setSpecs(prev => prev.filter((_, idx) => idx !== i));
  const updateSpec = (i: number, field: keyof SpecRow, val: string) =>
    setSpecs(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  // ─── Freebies ─────────────────────────────────────────────
  const addFreebie = () => setFreebies(prev => [...prev, { name: '' }]);
  const removeFreebie = (i: number) => setFreebies(prev => prev.filter((_, idx) => idx !== i));
  const updateFreebie = (i: number, val: string) =>
    setFreebies(prev => prev.map((f, idx) => idx === i ? { name: val } : f));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const slug = toSlug(formData.name) + '-' + Date.now();

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, slug,
          sku: formData.sku || null,
          shortDescription: formData.shortDescription || null,
          description: formData.description || null,
          basePrice: formData.basePrice ? parseFloat(formData.basePrice) : null,
          discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
          stock: formData.stock ? parseInt(formData.stock) : 0,
          lowStockAlert: formData.lowStockAlert ? parseInt(formData.lowStockAlert) : 10,
          brand: formData.brand || null,
          material: formData.material || null,
          warranty: formData.warranty || null,
          status: formData.status,
          isFeatured: formData.isFeatured,
          inStock: true,
          images:   images.filter(img => img.url.trim()),
          specifications: specs.filter(s => s.label.trim() && s.value.trim()),
          freebies: freebies.filter(f => f.name.trim()),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create product');
      setSuccess('Product created successfully!');
      setTimeout(() => router.push('/admin/products'), 1200);
    } catch (e: any) {
      setError(e.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create a new product listing</p>
        </div>
      </div>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Basic Info ─────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Product Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                required className={inputCls} placeholder="Product name" />
            </div>
            <div>
              <label className={labelCls}>SKU</label>
              <input type="text" name="sku" value={formData.sku} onChange={handleChange}
                className={inputCls} placeholder="e.g. MAT-001" />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange}
                className={inputCls} placeholder="e.g. Refresh Springs" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Short Description</label>
              <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange}
                rows={2} className={inputCls} placeholder="Brief product summary" />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Full Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange}
                rows={6} className={inputCls} placeholder="Detailed product description" />
            </div>
          </div>
        </div>

        {/* ── Product Images ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-500" /> Product Images
            </h2>
            <button type="button" onClick={addImage}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Image
            </button>
          </div>

          <div className="space-y-3">
            {images.map((img, i) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-100">
                {/* Preview */}
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="md:col-span-2">
                    <input type="url" value={img.url}
                      onChange={e => updateImage(i, 'url', e.target.value)}
                      placeholder="Image URL (https://...)"
                      className={inputCls} />
                  </div>
                  <input type="text" value={img.altText}
                    onChange={e => updateImage(i, 'altText', e.target.value)}
                    placeholder="Alt text (optional)"
                    className={inputCls} />
                  <label className="flex items-center gap-2 cursor-pointer self-center pl-1">
                    <input type="radio" name="primaryImage" checked={img.isPrimary}
                      onChange={() => setPrimary(i)}
                      className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" /> Primary image
                    </span>
                  </label>
                </div>

                <button type="button" onClick={() => removeImage(i)}
                  disabled={images.length === 1}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Specifications ─────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800">Specifications</h2>
            <button type="button" onClick={addSpec}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700 text-white">
                  <th className="text-left px-4 py-2.5 font-semibold w-1/2">Description</th>
                  <th className="text-left px-4 py-2.5 font-semibold w-1/2">Specification</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {specs.map((spec, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2">
                      <input type="text" value={spec.label}
                        onChange={e => updateSpec(i, 'label', e.target.value)}
                        placeholder="e.g. Grade Type"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={spec.value}
                        onChange={e => updateSpec(i, 'value', e.target.value)}
                        placeholder="e.g. POCKET SPRING"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeSpec(i)}
                        disabled={specs.length === 1}
                        className="p-1 text-red-400 hover:text-red-600 rounded transition disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Add specification rows like: Grade Type, Type of Spring, Wire Diameter, Thickness, Warranty, etc.</p>
        </div>

        {/* ── Freebies ───────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Gift className="w-4 h-4 text-green-500" /> Free Items with Product
            </h2>
            <button type="button" onClick={addFreebie}
              className="flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-2">
            {freebies.map((f, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-green-500 text-sm font-bold flex-shrink-0">🎁</span>
                <input type="text" value={f.name}
                  onChange={e => updateFreebie(i, e.target.value)}
                  placeholder="e.g. Free Pillow, Waterproof Protector"
                  className={`${inputCls} flex-1`} />
                <button type="button" onClick={() => removeFreebie(i)}
                  disabled={freebies.length === 1}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing + Inventory ────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Pricing</h2>
            <div>
              <label className={labelCls}>Base Price (₹)</label>
              <input type="number" name="basePrice" value={formData.basePrice} onChange={handleChange}
                step="0.01" min="0" className={inputCls} placeholder="0.00" />
            </div>
            <div>
              <label className={labelCls}>Sale Price (₹) <span className="text-gray-400 font-normal">optional</span></label>
              <input type="number" name="discountPrice" value={formData.discountPrice} onChange={handleChange}
                step="0.01" min="0" className={inputCls} placeholder="0.00" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Inventory</h2>
            <div>
              <label className={labelCls}>Stock Quantity</label>
              <input type="number" name="stock" value={formData.stock} onChange={handleChange}
                min="0" className={inputCls} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Low Stock Alert Threshold</label>
              <input type="number" name="lowStockAlert" value={formData.lowStockAlert} onChange={handleChange}
                min="0" className={inputCls} placeholder="10" />
            </div>
          </div>
        </div>

        {/* ── Details + Status ───────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Product Details</h2>
            <div>
              <label className={labelCls}>Material</label>
              <input type="text" name="material" value={formData.material} onChange={handleChange}
                className={inputCls} placeholder="e.g. Memory Foam" />
            </div>
            <div>
              <label className={labelCls}>Warranty</label>
              <input type="text" name="warranty" value={formData.warranty} onChange={handleChange}
                className={inputCls} placeholder="e.g. 5 Years" />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Status & Visibility</h2>
            <div>
              <label className={labelCls}>Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className={inputCls}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group pt-1">
              <input type="checkbox" name="isFeatured" checked={formData.isFeatured} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Featured Product</p>
                <p className="text-xs text-gray-400">Show on homepage featured section</p>
              </div>
            </label>
          </div>
        </div>

        {/* ── Actions ────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-2">
          <Link href="/admin/products"
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
              : <><Save className="w-4 h-4" /> Create Product</>}
          </button>
        </div>
      </form>
    </div>
  );
}
