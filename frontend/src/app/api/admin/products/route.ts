import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET all products
export async function GET(_request: NextRequest) {
  try {
    const products = await prisma.product.findMany({
      include: {
        categories: { include: { category: true } },
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        variants: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = products.map((p) => {
      const prices = p.variants.map((v) => Number(v.price));
      const salePrices = p.variants.filter((v) => v.salePrice).map((v) => Number(v.salePrice!));
      return {
        id: p.id,
        wcId: p.wcId,
        name: p.name,
        slug: p.slug,
        sku: p.sku || '-',
        basePrice: prices.length > 0 ? Math.min(...prices) : Number(p.basePrice) || 0,
        discountPrice: salePrices.length > 0 ? Math.min(...salePrices) : Number(p.discountPrice) || null,
        stock: p.stock,
        inStock: p.inStock,
        status: p.status,
        isFeatured: p.isFeatured,
        image: p.images[0]?.url || null,
        categories: p.categories.map((pc) => pc.category.name),
        variantCount: p.variants.length,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST create product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const product = await prisma.product.create({
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        shortDescription: body.shortDescription || null,
        basePrice: body.basePrice || null,
        discountPrice: body.discountPrice || null,
        sku: body.sku || null,
        inStock: body.inStock ?? true,
        stock: body.stock || 0,
        lowStockAlert: body.lowStockAlert || 10,
        brand: body.brand || null,
        material: body.material || null,
        warranty: body.warranty || null,
        status: body.status || 'ACTIVE',
        isFeatured: body.isFeatured || false,

        // Images
        images: body.images?.length > 0 ? {
          create: body.images.map((img: any, i: number) => ({
            url: img.url,
            altText: img.altText || null,
            isPrimary: img.isPrimary || i === 0,
            sortOrder: i,
          })),
        } : undefined,

        // Specifications
        specifications: body.specifications?.length > 0 ? {
          create: body.specifications
            .filter((s: any) => s.label && s.value)
            .map((s: any, i: number) => ({
              label: s.label,
              value: s.value,
              sortOrder: i,
            })),
        } : undefined,

        // Freebies
        freebies: body.freebies?.length > 0 ? {
          create: body.freebies
            .filter((f: any) => f.name)
            .map((f: any, i: number) => ({
              name: f.name,
              image: f.image || null,
              sortOrder: i,
            })),
        } : undefined,

        // Variants
        variants: body.variants?.length > 0 ? {
          create: body.variants
            .filter((v: any) => v.price)
            .map((v: any, i: number) => ({
              sizeGroup: v.sizeGroup || null,
              size:      v.size      || '',
              thickness: v.thickness || null,
              firmness:  v.firmness  || null,
              price:     parseFloat(v.price),
              salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
              sortOrder: i,
              isActive:  true,
            })),
        } : undefined,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to create product' }, { status: 500 });
  }
}
