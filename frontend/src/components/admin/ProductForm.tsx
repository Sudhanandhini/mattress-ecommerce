'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, Plus, Trash2, Star, Upload, X, Gift, Package } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImageRow {
  id?: string;
  url: string;
  altText: string;
  isPrimary: boolean;
  preview: string;
  file: File | null;
  uploading: boolean;
}

export interface SpecRow {
  id?: string;
  label: string;
  value: string;
}

export interface FreebieRow {
  id?: string;
  name: string;
  image: string;
  preview: string;
  file: File | null;
  uploading: boolean;
}

export interface VariantRow {
  id?: string;
  sizeGroup: string;
  size: string;
  thickness: string;
  firmness: string;
  price: string;
  salePrice: string;
}

export interface ProductFormData {
  name: string;
  sku: string;
  shortDescription: string;
  description: string;
  basePrice: string;
  discountPrice: string;
  stock: string;
  lowStockAlert: string;
  brand: string;
  material: string;
  warranty: string;
  status: string;
  isFeatured: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SIZE_GROUPS = ['Single', 'Double', 'Queen', 'King', 'Super King'];
const FIRMNESS_OPTIONS = ['Soft', 'Medium Soft', 'Medium', 'Medium Hard', 'Hard'];

export const EMPTY_FORM: ProductFormData = {
  name: '', sku: '', shortDescription: '', description: '',
  basePrice: '', discountPrice: '', stock: '0', lowStockAlert: '10',
  brand: '', material: '', warranty: '', status: 'ACTIVE', isFeatured: false,
};

export const emptyImage = (primary = false): ImageRow => ({
  url: '', altText: '', isPrimary: primary, preview: '', file: null, uploading: false,
});

export const emptyFreebie = (): FreebieRow => ({
  name: '', image: '', preview: '', file: null, uploading: false,
});

export const emptyVariant = (): VariantRow => ({
  sizeGroup: 'Queen', size: '', thickness: '', firmness: 'Medium', price: '', salePrice: '',
});

// ─── Shared styles ────────────────────────────────────────────────────────────

export const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white';
export const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url as string;
}

// ─── ProductForm component ────────────────────────────────────────────────────

interface ProductFormProps {
  mode: 'add' | 'edit';
  productName?: string;
  formData: ProductFormData;
  images: ImageRow[];
  specs: SpecRow[];
  freebies: FreebieRow[];
  variants: VariantRow[];
  submitting: boolean;
  error: string;
  success: string;
  onFormChange: (data: ProductFormData) => void;
  onImagesChange: (images: ImageRow[]) => void;
  onSpecsChange: (specs: SpecRow[]) => void;
  onFreebiesChange: (freebies: FreebieRow[]) => void;
  onVariantsChange: (variants: VariantRow[]) => void;
  onSubmit: (e: React.FormEvent) => void;
  onErrorClose: () => void;
}

export function ProductForm({
  mode, productName, formData, images, specs, freebies, variants,
  submitting, error, success,
  onFormChange, onImagesChange, onSpecsChange, onFreebiesChange, onVariantsChange,
  onSubmit, onErrorClose,
}: ProductFormProps) {

  const imageFileRefs   = useRef<(HTMLInputElement | null)[]>([]);
  const freebieFileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── form field change ──────────────────────────────────────
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    onFormChange({ ...formData, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value });
  };

  // ── images ─────────────────────────────────────────────────
  const addImage = () => onImagesChange([...images, emptyImage()]);
  const removeImage = (i: number) => {
    const next = images.filter((_, idx) => idx !== i);
    if (next.length > 0 && !next.some(img => img.isPrimary)) next[0] = { ...next[0], isPrimary: true };
    onImagesChange(next);
  };
  const setPrimary = (i: number) => onImagesChange(images.map((img, idx) => ({ ...img, isPrimary: idx === i })));
  const setAltText = (i: number, val: string) => onImagesChange(images.map((img, idx) => idx === i ? { ...img, altText: val } : img));

  const handleImageFile = async (i: number, file: File) => {
    const preview = URL.createObjectURL(file);
    onImagesChange(images.map((img, idx) => idx === i ? { ...img, file, preview, uploading: true, url: '' } : img));
    try {
      const url = await uploadFile(file);
      onImagesChange(prev => prev.map((img, idx) => idx === i ? { ...img, url, uploading: false } : img));
    } catch (err: any) {
      onImagesChange(prev => prev.map((img, idx) => idx === i ? { ...img, uploading: false, file: null, preview: '', url: '' } : img));
    }
  };

  // ── specs ──────────────────────────────────────────────────
  const addSpec    = () => onSpecsChange([...specs, { label: '', value: '' }]);
  const removeSpec = (i: number) => { if (specs.length > 1) onSpecsChange(specs.filter((_, idx) => idx !== i)); };
  const updateSpec = (i: number, field: 'label' | 'value', val: string) =>
    onSpecsChange(specs.map((s, idx) => idx === i ? { ...s, [field]: val } : s));

  // ── freebies ───────────────────────────────────────────────
  const addFreebie    = () => onFreebiesChange([...freebies, emptyFreebie()]);
  const removeFreebie = (i: number) => { if (freebies.length > 1) onFreebiesChange(freebies.filter((_, idx) => idx !== i)); };
  const updateFreebieName = (i: number, val: string) =>
    onFreebiesChange(freebies.map((f, idx) => idx === i ? { ...f, name: val } : f));

  const handleFreebieFile = async (i: number, file: File) => {
    const preview = URL.createObjectURL(file);
    onFreebiesChange(freebies.map((f, idx) => idx === i ? { ...f, file, preview, uploading: true, image: '' } : f));
    try {
      const url = await uploadFile(file);
      onFreebiesChange(prev => prev.map((f, idx) => idx === i ? { ...f, image: url, uploading: false } : f));
    } catch {
      onFreebiesChange(prev => prev.map((f, idx) => idx === i ? { ...f, uploading: false, file: null, preview: '', image: '' } : f));
    }
  };

  // ── variants ───────────────────────────────────────────────
  const addVariant    = () => onVariantsChange([...variants, emptyVariant()]);
  const removeVariant = (i: number) => { if (variants.length > 1) onVariantsChange(variants.filter((_, idx) => idx !== i)); };
  const updateVariant = (i: number, field: keyof VariantRow, val: string) =>
    onVariantsChange(variants.map((v, idx) => idx === i ? { ...v, [field]: val } : v));

  const anyUploading = images.some(img => img.uploading) || freebies.some(f => f.uploading);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="p-2 rounded-lg hover:bg-gray-100 transition">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {mode === 'add' ? 'Add New Product' : 'Edit Product'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {mode === 'add' ? 'Create a new product listing' : productName}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          {error}
          <button type="button" onClick={onErrorClose}><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">

        {/* ── Basic Info ──────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-3">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className={labelCls}>Product Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                required className={inputCls} placeholder="Product name" />
            </div>
            <div>
              <label className={labelCls}>SKU {mode === 'edit' && <span className="text-gray-400 font-normal">(read-only)</span>}</label>
              {mode === 'edit' ? (
                <input type="text" value={formData.sku} disabled className={`${inputCls} bg-gray-50 text-gray-400 cursor-not-allowed`} />
              ) : (
                <input type="text" name="sku" value={formData.sku} onChange={handleChange} className={inputCls} placeholder="e.g. MAT-001" />
              )}
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} className={inputCls} placeholder="e.g. Refresh Springs" />
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

        {/* ── Product Images ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Upload className="w-4 h-4 text-blue-500" /> Product Images
            </h2>
            <button type="button" onClick={addImage}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Image
            </button>
          </div>

          <div className="space-y-3">
            {images.map((img, i) => (
              <div key={i} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-20 h-20 rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {img.uploading ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : img.preview || img.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.preview || img.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => imageFileRefs.current[i]?.click()} disabled={img.uploading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                      <Upload className="w-3.5 h-3.5" />
                      {img.uploading ? 'Uploading...' : 'Choose File'}
                    </button>
                    <input type="file" accept="image/*" className="hidden"
                      ref={el => { imageFileRefs.current[i] = el; }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(i, f); e.target.value = ''; }} />
                    {img.url && !img.uploading && <span className="flex items-center text-xs text-green-600 font-medium">✓ Uploaded</span>}
                  </div>
                  <input type="text" value={img.altText} onChange={e => setAltText(i, e.target.value)}
                    placeholder="Alt text (optional)"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="primaryImage" checked={img.isPrimary} onChange={() => setPrimary(i)} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" /> Primary image
                    </span>
                  </label>
                </div>
                <button type="button" onClick={() => removeImage(i)} disabled={images.length === 1}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Size Variants ───────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" /> Size Variants
            </h2>
            <button type="button" onClick={addVariant}
              className="flex items-center gap-1.5 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Size
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700 text-white text-xs">
                  <th className="text-left px-3 py-3 font-semibold">Size</th>
                  <th className="text-left px-3 py-3 font-semibold">Dimensions</th>
                  <th className="text-left px-3 py-3 font-semibold">Thickness</th>
                  <th className="text-left px-3 py-3 font-semibold">Firmness</th>
                  <th className="text-left px-3 py-3 font-semibold">Price (₹)</th>
                  <th className="text-left px-3 py-3 font-semibold">Sale Price (₹)</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {variants.map((v, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-2 py-2">
                      <select value={v.sizeGroup} onChange={e => updateVariant(i, 'sizeGroup', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {SIZE_GROUPS.map(sg => <option key={sg} value={sg}>{sg}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={v.size} onChange={e => updateVariant(i, 'size', e.target.value)}
                        placeholder="72x60" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="text" value={v.thickness} onChange={e => updateVariant(i, 'thickness', e.target.value)}
                        placeholder="6 inch" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <select value={v.firmness} onChange={e => updateVariant(i, 'firmness', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        {FIRMNESS_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)}
                        placeholder="0" min="0" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" value={v.salePrice} onChange={e => updateVariant(i, 'salePrice', e.target.value)}
                        placeholder="0" min="0" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-1 py-2 text-center">
                      <button type="button" onClick={() => removeVariant(i)} disabled={variants.length === 1}
                        className="p-1 text-red-400 hover:text-red-600 rounded transition disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400">Add size variants: Single (72×36), Double (72×48), Queen (72×60), King (72×72), Super King (72×78)</p>
        </div>

        {/* ── Specifications ──────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800">Specifications</h2>
            <button type="button" onClick={addSpec}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-700 text-white">
                  <th className="text-left px-4 py-3 font-semibold w-[45%]">Description</th>
                  <th className="text-left px-4 py-3 font-semibold w-[45%]">Specification</th>
                  <th className="w-[10%]" />
                </tr>
              </thead>
              <tbody>
                {specs.map((spec, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-3 py-2">
                      <input type="text" value={spec.label} onChange={e => updateSpec(i, 'label', e.target.value)}
                        placeholder="e.g. Grade Type"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={spec.value} onChange={e => updateSpec(i, 'value', e.target.value)}
                        placeholder="e.g. POCKET SPRING"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button type="button" onClick={() => removeSpec(i)} disabled={specs.length === 1}
                        className="p-1 text-red-400 hover:text-red-600 rounded transition disabled:opacity-30">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Freebies ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <Gift className="w-4 h-4 text-green-500" /> Free Items with Product
            </h2>
            <button type="button" onClick={addFreebie}
              className="flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg transition">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {freebies.map((f, i) => (
              <div key={i} className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-200">
                {/* Icon preview */}
                <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {f.uploading ? (
                    <Loader2 className="w-4 h-4 text-green-500 animate-spin" />
                  ) : f.preview || f.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.preview || f.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">🎁</span>
                  )}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input type="text" value={f.name} onChange={e => updateFreebieName(i, e.target.value)}
                    placeholder="e.g. Free Pillow, Waterproof Protector"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-green-500 bg-white w-full" />
                  <div className="flex gap-2 items-center">
                    <button type="button" onClick={() => freebieFileRefs.current[i]?.click()} disabled={f.uploading}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      {f.uploading ? 'Uploading...' : 'Upload Icon'}
                    </button>
                    <input type="file" accept="image/*" className="hidden"
                      ref={el => { freebieFileRefs.current[i] = el; }}
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleFreebieFile(i, file); e.target.value = ''; }} />
                    {f.image && !f.uploading && <span className="text-xs text-green-600 font-medium whitespace-nowrap">✓ Done</span>}
                  </div>
                </div>

                <button type="button" onClick={() => removeFreebie(i)} disabled={freebies.length === 1}
                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing + Inventory ─────────────────────────────── */}
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

        {/* ── Details + Status ────────────────────────────────── */}
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

        {/* ── Actions ─────────────────────────────────────────── */}
        <div className="flex gap-3 justify-end pt-2">
          <Link href="/admin/products"
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || anyUploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'add' ? 'Creating...' : 'Saving...'}</>
              : <><Save className="w-4 h-4" /> {mode === 'add' ? 'Create Product' : 'Save Changes'}</>}
          </button>
        </div>
      </form>
    </div>
  );
}
