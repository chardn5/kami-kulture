// /src/components/PaySection.tsx
'use client';

import { useEffect, useRef } from 'react';

type PaySectionProps = {
  amount: number; // store currency
  productTitle: string;
  selectedSize?: string;
  productSlug?: string;
  sku?: string;
};

export default function PaySection({
  amount,
  productTitle,
  selectedSize,
  productSlug,
  sku,
}: PaySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paypal = (typeof window !== 'undefined' ? (window as any).paypal : undefined);
    if (!paypal || !containerRef.current) return;

    // Clear existing buttons before re-render (size changes)
    containerRef.current.innerHTML = '';

    const description = `${productTitle}${selectedSize ? ` - Size: ${selectedSize}` : ''}`;
    const customId = ['KK', productSlug ?? '', selectedSize ?? '', sku ?? '', Math.random().toString(36).slice(2, 8)]
      .filter(Boolean)
      .join(':');

    paypal
      .Buttons({
        style: { shape: 'pill', label: 'paypal', layout: 'horizontal' },
        createOrd
