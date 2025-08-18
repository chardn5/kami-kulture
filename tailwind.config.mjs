/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // these reference CSS variables we’ll set from next/font
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        brand: ['var(--font-brand)', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
