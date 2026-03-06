'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  ProductForm, EMPTY_FORM, emptyImage, emptyFreebie, emptyVariant,
  type ProductFormData, type ImageRow, type SpecRow, type FreebieRow, type VariantRow,
} from '@/components/admin/ProductForm';

export default function EditProductPage() {
  const router = useRouter();
  const { id: productId } = useParams<{ id: string }>();

  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [productName, setProductName] = useState('');
  const [formData, setFormData]       = useState<ProductFormData>(EMPTY_FORM);
  const [images, setImages]           = useState<ImageRow[]>([emptyImage(true)]);
  const [specs, setSpecs]             = useState<SpecRow[]>([{ label: '', value: '' }]);
  const [freebies, setFreebies]       = useState<FreebieRow[]>([emptyFreebie()]);
  const [variants, setVariants]       = useState<VariantRow[]>([emptyVariant()]);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/products/${productId}`);
        if (!res.ok) throw new Error('Failed to fetch product');
        const p = await res.json();

        setProductName(p.name || '');
        setFormData({
          name:             p.name             || '',
          sku:              p.sku              || '',
          shortDescription: p.shortDescription || '',
          description:      p.description      || '',
          basePrice:        p.basePrice     != null ? String(parseFloat(p.basePrice))     : '',
          discountPrice:    p.discountPrice != null ? String(parseFloat(p.discountPrice)) : '',
          stock:            p.stock         != null ? String(p.stock)         : '0',
          lowStockAlert:    p.lowStockAlert != null ? String(p.lowStockAlert) : '10',
          brand:            p.brand     || '',
          material:         p.material  || '',
          warranty:         p.warranty  || '',
          status:           p.status    || 'ACTIVE',
          isFeatured:       Boolean(p.isFeatured),
        });

        if (p.images?.length > 0) {
          setImages(p.images.map((img: any) => ({
            id: img.id, url: img.url, altText: img.altText || '',
            isPrimary: img.isPrimary, preview: img.url, file: null, uploading: false,
          })));
        }

        if (p.specifications?.length > 0) {
          setSpecs(p.specifications.map((s: any) => ({ id: s.id, label: s.label, value: s.value })));
        }

        if (p.freebies?.length > 0) {
          setFreebies(p.freebies.map((f: any) => ({
            id: f.id, name: f.name, image: f.image || '', preview: f.image || '', file: null, uploading: false,
          })));
        }

        if (p.variants?.length > 0) {
          setVariants(p.variants.map((v: any) => ({
            id: v.id,
            sizeGroup: v.sizeGroup || 'Queen',
            size:      v.size      || '',
            thickness: v.thickness || '',
            firmness:  v.firmness  || 'Medium',
            price:     v.price     != null ? String(parseFloat(v.price))     : '',
            salePrice: v.salePrice != null ? String(parseFloat(v.salePrice)) : '',
          })));
        }
      } catch {
        setError('Could not load product.');
      } finally {
        setLoading(false);
      }
    })();
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.some(img => img.uploading) || freebies.some(f => f.uploading)) {
      setError('Please wait for all uploads to finish');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:             formData.name,
          shortDescription: formData.shortDescription || null,
          description:      formData.description      || null,
          basePrice:        formData.basePrice     ? parseFloat(formData.basePrice)     : null,
          discountPrice:    formData.discountPrice ? parseFloat(formData.discountPrice) : null,
          stock:            parseInt(formData.stock)         || 0,
          lowStockAlert:    parseInt(formData.lowStockAlert) || 10,
          brand:            formData.brand    || null,
          material:         formData.material || null,
          warranty:         formData.warranty || null,
          status:           formData.status,
          isFeatured:       formData.isFeatured,
          images:         images.filter(img => img.url).map(img => ({ url: img.url, altText: img.altText || null, isPrimary: img.isPrimary })),
          specifications: specs.filter(s => s.label.trim() && s.value.trim()),
          freebies:       freebies.filter(f => f.name.trim()).map(f => ({ name: f.name, image: f.image || null })),
          variants:       variants.filter(v => v.price).map(v => ({
            sizeGroup: v.sizeGroup,
            size:      v.size      || null,
            thickness: v.thickness || null,
            firmness:  v.firmness  || null,
            price:     parseFloat(v.price),
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setSuccess('Product updated successfully!');
      setTimeout(() => router.push('/admin/products'), 1200);
    } catch (e: any) {
      setError(e.message || 'Failed to update product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] gap-3 text-gray-500">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading product...
    </div>
  );

  return (
    <ProductForm
      mode="edit"
      productName={productName}
      formData={formData}
      images={images}
      specs={specs}
      freebies={freebies}
      variants={variants}
      submitting={submitting}
      error={error}
      success={success}
      onFormChange={setFormData}
      onImagesChange={setImages}
      onSpecsChange={setSpecs}
      onFreebiesChange={setFreebies}
      onVariantsChange={setVariants}
      onSubmit={handleSubmit}
      onErrorClose={() => setError('')}
    />
  );
}
