import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        categories:     { include: { category: { select: { id: true, name: true, slug: true } } } },
        images:         { orderBy: { sortOrder: 'asc' } },
        variants:       { orderBy: { sortOrder: 'asc' } },
        specifications: { orderBy: { sortOrder: 'asc' } },
        badges:         { orderBy: { sortOrder: 'asc' } },
        freebies:       { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const id = params.id;

    // ── core product fields ──────────────────────────────────
    const updateData: Record<string, any> = {};
    if (body.name !== undefined)             updateData.name             = body.name;
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription || null;
    if (body.description !== undefined)      updateData.description      = body.description || null;
    if (body.basePrice !== undefined)        updateData.basePrice        = body.basePrice != null ? parseFloat(body.basePrice) : null;
    if (body.discountPrice !== undefined)    updateData.discountPrice    = body.discountPrice ? parseFloat(body.discountPrice) : null;
    if (body.stock !== undefined)            updateData.stock            = parseInt(body.stock);
    if (body.lowStockAlert !== undefined)    updateData.lowStockAlert    = parseInt(body.lowStockAlert);
    if (body.brand !== undefined)            updateData.brand            = body.brand || null;
    if (body.material !== undefined)         updateData.material         = body.material || null;
    if (body.warranty !== undefined)         updateData.warranty         = body.warranty || null;
    if (body.status !== undefined)           updateData.status           = body.status;
    if (body.isFeatured !== undefined)       updateData.isFeatured       = Boolean(body.isFeatured);

    await prisma.product.update({ where: { id }, data: updateData });

    // ── images (replace all) ─────────────────────────────────
    if (Array.isArray(body.images)) {
      await prisma.productImage.deleteMany({ where: { productId: id } });
      if (body.images.length > 0) {
        await prisma.productImage.createMany({
          data: body.images.map((img: any, i: number) => ({
            productId: id,
            url:       img.url,
            altText:   img.altText || null,
            isPrimary: img.isPrimary || i === 0,
            sortOrder: i,
          })),
        });
      }
    }

    // ── specifications (replace all) ─────────────────────────
    if (Array.isArray(body.specifications)) {
      await prisma.productSpecification.deleteMany({ where: { productId: id } });
      const validSpecs = body.specifications.filter((s: any) => s.label && s.value);
      if (validSpecs.length > 0) {
        await prisma.productSpecification.createMany({
          data: validSpecs.map((s: any, i: number) => ({
            productId: id, label: s.label, value: s.value, sortOrder: i,
          })),
        });
      }
    }

    // ── freebies (replace all) ───────────────────────────────
    if (Array.isArray(body.freebies)) {
      await prisma.productFreebie.deleteMany({ where: { productId: id } });
      const validFreebies = body.freebies.filter((f: any) => f.name);
      if (validFreebies.length > 0) {
        await prisma.productFreebie.createMany({
          data: validFreebies.map((f: any, i: number) => ({
            productId: id, name: f.name, image: f.image || null, sortOrder: i,
          })),
        });
      }
    }

    // ── variants (replace all) ───────────────────────────────
    if (Array.isArray(body.variants)) {
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      const validVariants = body.variants.filter((v: any) => v.price);
      if (validVariants.length > 0) {
        await prisma.productVariant.createMany({
          data: validVariants.map((v: any, i: number) => ({
            productId: id,
            sizeGroup: v.sizeGroup || null,
            size:      v.size      || '',
            thickness: v.thickness || null,
            firmness:  v.firmness  || null,
            price:     parseFloat(v.price),
            salePrice: v.salePrice ? parseFloat(v.salePrice) : null,
            sortOrder: i,
            isActive:  true,
          })),
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Product updated successfully' });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: error.message || 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.productImage.deleteMany({ where: { productId: params.id } });
    await prisma.productVariant.deleteMany({ where: { productId: params.id } });
    await prisma.productSpecification.deleteMany({ where: { productId: params.id } });
    await prisma.productBadge.deleteMany({ where: { productId: params.id } });
    await prisma.productFreebie.deleteMany({ where: { productId: params.id } });
    await prisma.productCategory.deleteMany({ where: { productId: params.id } });
    await prisma.product.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, message: 'Product deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete product' }, { status: 500 });
  }
}
