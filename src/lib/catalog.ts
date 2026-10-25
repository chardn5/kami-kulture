import { prisma } from "@/lib/prisma";
import {
  products as staticProducts,
  type StaticProduct,
} from "@/data/products";
import { cache } from "react";

export type CatalogVariant = {
  size?: string;
  color?: string;
  sku?: string;
  variantId?: number;
  printifyProductId?: string;
  price?: number;
  isAvailable?: boolean;
  images?: string[];
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
  garment?: string;
};

type DbProductForStatic = Awaited<
  ReturnType<typeof getMappedPrintifyProducts>
>[number];

function skuPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeOption(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function findDbVariant(
  dbProduct: DbProductForStatic | undefined,
  product: StaticProduct,
  color: string | undefined,
  size: string,
) {
  if (!dbProduct) return undefined;

  const mappedColor = color
    ? (product.printifyColorMap?.[color] ?? color)
    : undefined;

  return dbProduct.variants.find(
    (variant) =>
      normalizeOption(variant.size) === normalizeOption(size) &&
      (!mappedColor ||
        normalizeOption(variant.color) === normalizeOption(mappedColor)),
  );
}

function mapStaticProduct(
  product: StaticProduct,
  dbProduct?: DbProductForStatic,
): CatalogProduct {
  const enabled = dbProduct?.variants ?? [];
  const colors = Array.from(
    new Set(enabled.map((v) => v.color).filter((v): v is string => !!v)),
  );
  const sizeOrder = ["S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];
  const sizes = Array.from(
    new Set(enabled.map((v) => v.size).filter((v): v is string => !!v)),
  ).sort((a, b) => sizeOrder.indexOf(a) - sizeOrder.indexOf(b));
  const variants = sizes.flatMap((size) => {
    const variantColors = colors.length ? colors : [undefined];
    return variantColors.map((color) => {
      const dbVariant = findDbVariant(dbProduct, product, color, size);

      return {
        size,
        color,
        sku: [product.slug, color ? skuPart(color) : undefined, skuPart(size)]
          .filter(Boolean)
          .join("-"),
        variantId: dbVariant?.variantId,
        printifyProductId: dbVariant ? product.printifyId : undefined,
        price: product.price,
        isAvailable: Boolean(
          dbProduct?.visible && dbVariant?.isEnabled && dbVariant?.isAvailable,
        ),
        images:
          dbProduct?.images
            .filter(
              (image) =>
                dbVariant && image.variantIds.includes(dbVariant.variantId),
            )
            .map((image) => image.url) ?? [],
      };
    });
  });

  return {
    slug: product.slug,
    title: product.title,
    price: product.price,
    description: product.description,
    images: product.images ?? [],
    tags: product.tags,
    garment: dbProduct?.title,
    sizes,
    colors,
    variants,
    printifyId: product.printifyId,
  };
}

async function getMappedPrintifyProducts() {
  const ids = staticProducts
    .map((product) => product.printifyId)
    .filter((value): value is string => Boolean(value));

  if (!ids.length) return [];

  return prisma.product.findMany({
    where: { printifyId: { in: ids } },
    include: {
      variants: {
        where: { isEnabled: true },
      },
      images: { orderBy: { position: "asc" } },
    },
  });
}

export const getCatalogProducts = cache(async (): Promise<CatalogProduct[]> => {
  try {
    const dbProducts = await getMappedPrintifyProducts();
    const byPrintifyId = new Map(
      dbProducts.map((product) => [product.printifyId, product]),
    );
    return staticProducts.map((product) =>
      mapStaticProduct(product, byPrintifyId.get(product.printifyId ?? "")),
    );
  } catch (error) {
    console.warn("[catalog] falling back to static products", error);
  }

  return staticProducts.map((product) => mapStaticProduct(product));
});

export async function getCatalogProduct(
  slug: string,
): Promise<CatalogProduct | null> {
  const products = await getCatalogProducts();
  return products.find((product) => product.slug === slug) ?? null;
}
