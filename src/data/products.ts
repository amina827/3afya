import { Product } from '@/types';

export const products: Product[] = [
  {
    id: 'afia-1500',
    nameAr: 'عافية 1.5 لتر',
    nameEn: 'Afia 1.5L',
    volume: 1500,
    descriptionAr: 'زيت طبخ نباتي فاخر غني بفيتامين E، مثالي للقلي العميق والطبخ اليومي',
    descriptionEn: 'Premium vegetable cooking oil rich in Vitamin E, ideal for deep frying and daily cooking',
    image: '🏆',
    caloriesPerMl: 8.84,
    fatPerMl: 1.0,
    vitaminEPerMl: 0.15,
  },
];

export const DEFAULT_PRODUCT = products[0];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id) || DEFAULT_PRODUCT;
}

export function getProductByQR(qrText: string): Product | undefined {
  // Single 1.5L bottle - any QR resolves to it
  void qrText;
  return DEFAULT_PRODUCT;
}
