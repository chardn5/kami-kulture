export const garments = {
  powerover9000: {
    name: "Comfort Colors 1717",
    fit: "Relaxed unisex fit",
    fabric: "100% ring-spun cotton",
    weight: "6.1 oz/yd² (206.8 g/m²)",
    description:
      "Soft-washed, garment-dyed cotton with a relaxed shape and a crew neckline. Pre-shrunk fabric and reinforced stitching make this a comfortable everyday layer.",
    notes:
      "Garment-dyed shades have a washed finish. Screen colors and mockups can differ slightly from the finished shirt.",
    source:
      "https://printify.com/app/products/706/comfort-colors/unisex-garmentdyed-tshirt",
    tolerance: 1.5,
    sizes: [
      ["S", 18.25, 26.62],
      ["M", 20.25, 28],
      ["L", 22, 29.37],
      ["XL", 24, 30.75],
      ["2XL", 26, 31.62],
      ["3XL", 27.75, 32.5],
      ["4XL", 29.75, 33.5],
    ],
  },
  sorryimlate: {
    name: "Gildan 5000",
    fit: "Classic unisex fit",
    fabric: "Cotton; fiber content varies by color",
    weight: "5.3 oz/yd² (180 g/m²)",
    description:
      "A classic crew-neck tee with a seamless body, reinforced shoulders, and a tear-away label. A relaxed everyday staple with a substantial cotton feel.",
    notes:
      "White and Light Pink are cotton. Heather Red contains a cotton/polyester blend. White may appear slightly off-white.",
    source:
      "https://printify.com/app/products/6/gildan/unisex-heavy-cotton-tee",
    tolerance: 1.5,
    sizes: [
      ["S", 18, 28],
      ["M", 20, 29],
      ["L", 22, 30],
      ["XL", 24, 31],
      ["2XL", 26, 32],
      ["3XL", 28, 33],
      ["4XL", 30, 34],
      ["5XL", 32, 35],
    ],
  },
} satisfies Record<
  string,
  {
    name: string;
    fit: string;
    fabric: string;
    weight: string;
    description: string;
    notes: string;
    source: string;
    tolerance: number;
    sizes: Array<[string, number, number]>;
  }
>;

export function getGarment(slug: string) {
  return garments[slug as keyof typeof garments];
}
