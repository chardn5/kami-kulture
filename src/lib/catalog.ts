import { prisma } from '@/lib/prisma';
import { products as staticProducts } from '@/data/products';

export type CatalogVariant = {
  size?: string;
  color?: string;
  sku?: string;
  variantId?: number;
  printifyProductId?: string;
  price?: number;
  isAvailable?: boolean;
};

export type CatalogProduct = {
  slug: string;
  title: string;
  price: number;
  description?: string;
  images: string[];
  tags?: string[];
  createdAt?: string;
  rating?: number;
  ratingCount?: number;
  printifyId?: string;
  sizes?: string[];
  colors?: string[];
  variants?: CatalogVariant[];
};

type StaticProduct = (typeof staticProducts)[number] & {
  sizes?: string[];
  colors?: string[];
};

function centsToMajor(cents: number) {
  return Math.max(0, cents) / 100;
}

function stripHtml(input?: string | null) {
  return (input ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueDefined(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function skuPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapStaticProduct(product: StaticProduct): CatalogProduct {
  const colors = product.colors ?? [];
  const sizes = product.sizes ?? [];
  const variants = sizes.flatMap((size) => {
    const variantColors = colors.length ? colors : [undefined];
    return variantColors.map((color) => ({
      size,
      color,
      sku: [product.slug, color ? skuPart(color) : undefined, skuPart(size)].filter(Boolean).join('-'),
      price: product.price,
      isAvailable: true,
    }));
  });

  return {
    slug: product.slug,
    title: product.title,
    price: product.price,
    description: product.description,
    images: product.images ?? [],
    tags: product.tags,
    rating: product.rating,
    ratingCount: product.ratingCount,
    sizes,
    colors,
    variants,
  };
}

async function getDatabaseCatalogProducts(): Promise<CatalogProduct[]> {
  const rows = await prisma.product.findMany({
    where: { visible: true },
    include: {
      images: { orderBy: { position: 'asc' } },
      variants: {
        where: { isEnabled: true, isAvailable: true },
        orderBy: [{ color: 'asc' }, { size: 'asc' }, { variantId: 'asc' }],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rows.map((product) => {
    const variants = product.variants.map((variant) => ({
      size: variant.size ?? undefined,
      color: variant.color ?? undefined,
      sku: variant.sku || undefined,
      variantId: variant.variantId,
      printifyProductId: product.printifyId,
      price: centsToMajor(variant.priceCents),
      isAvailable: variant.isAvailable,
    }));

    return {
      slug: product.slug,
      title: product.title,
      price: centsToMajor(product.priceMinCents),
      description: stripHtml(product.description),
      images: product.images.map((image) => image.url),
      tags: product.tags,
      createdAt: product.createdAt.toISOString(),
      printifyId: product.printifyId,
      sizes: uniqueDefined(variants.map((variant) => variant.size)),
      colors: uniqueDefined(variants.map((variant) => variant.color)),
      variants,
    };
  });
}

export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  try {
    const dbProducts = await getDatabaseCatalogProducts();
    if (dbProducts.length > 0) return dbProducts;
  } catch (error) {
    console.warn('[catalog] falling back to static products', error);
  }

  return staticProducts.map(mapStaticProduct);
}

export async function getCatalogProduct(slug: string): Promise<CatalogProduct | null> {
  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug) ?? null;
}
