'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ProductForm, EMPTY_FORM, emptyImage, emptyFreebie, emptyVariant,
  type ProductFormData, type ImageRow, type SpecRow, type FreebieRow, type VariantRow,
} from '@/components/admin/ProductForm';

function toSlug(name: string) {
  return name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export default function AddProductPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [formData, setFormData]     = useState<ProductFormData>(EMPTY_FORM);
  const [images, setImages]         = useState<ImageRow[]>([emptyImage(true)]);
  const [specs, setSpecs]           = useState<SpecRow[]>([{ label: '', value: '' }]);
  const [freebies, setFreebies]     = useState<FreebieRow[]>([emptyFreebie()]);
  const [variants, setVariants]     = useState<VariantRow[]>([emptyVariant()]);

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
      const slug = toSlug(formData.name) + '-' + Date.now();
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name, slug,
          sku:              formData.sku              || null,
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
          inStock:          true,
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
    <ProductForm
      mode="add"
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
