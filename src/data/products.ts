// /src/data/products.ts
export type StaticProduct = {
  slug: string;
  title: string;
  price: number;
  images: string[];
  description?: string;
  designId?: string;
  tags?: string[];
  sizes?: string[];
  colors?: string[];
  printifyId?: string;
  printifyColorMap?: Record<string, string>;
  rating?: number;
  ratingCount?: number;
};

export const products: StaticProduct[] = [
  {
    slug: "powerover9000",
    title: "Power Level Over 9000",
    price: 30, // USD
    images: [
      "/images/products/over9000/Person%201%20(1).png",
      "/images/products/over9000/Front.png",
      "/images/products/over9000/Back.png",
      "/images/products/over9000/Folded.png"
    ],
    description: "Heavy lifts. Bigger appetites. An anime-inspired gym graphic on a relaxed garment-dyed tee, with a Kami Kulture back print.",
    designId: "over9000",
    tags: ["tee","cotton","unisex"],
    sizes: ["S","M","L","XL","2XL"],
    colors: ["Black", "Navy Blue", "White"],
    printifyId: "689e27a7e99e06b0d50247c8",
    printifyColorMap: {
      "Navy Blue": "Navy"
    },
  },
  {
    slug: "sorryimlate",
    title: "Sorry I'm late",
    price: 30, // USD
    images: [
      "/images/products/sorryimlate/Duo.png",
      "/images/products/sorryimlate/Front.png",
      "/images/products/sorryimlate/Hanging%201.png",
      "/images/products/sorryimlate/Front%20Collar%20Closeup.png"
    ],
    description: "For the entrance that needs no explanation. A playful statement print on a classic unisex cotton tee.",
    designId: "sorryimlate",
    tags: ["tee","cotton","unisex"],
    sizes: ["S","M","L","XL","2XL"],
    colors: ["White", "Pink", "Red"],
    printifyId: "689e42051812f0dd880af898",
    printifyColorMap: {
      "Pink": "Light Pink"
    },
  }
];
