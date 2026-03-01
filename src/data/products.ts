import { Product } from '@/types';

export const products: Product[] = [
  {
    id: 'afia-gold-1500',
    nameAr: 'عافية الذهبي 1.5 لتر',
    nameEn: 'Afia Gold 1.5L',
    volume: 1500,
    descriptionAr: 'زيت طبخ نباتي فاخر غني بفيتامين E، مثالي للقلي العميق والطبخ اليومي',
    descriptionEn: 'Premium vegetable cooking oil rich in Vitamin E, ideal for deep frying and daily cooking',
    image: '🏆',
    caloriesPerMl: 8.84,
    fatPerMl: 1.0,
    vitaminEPerMl: 0.15,
  },
  {
    id: 'afia-classic-750',
    nameAr: 'عافية كلاسيك 750 مل',
    nameEn: 'Afia Classic 750ml',
    volume: 750,
    descriptionAr: 'زيت طبخ عباد الشمس نقي، خفيف وصحي للاستخدام اليومي',
    descriptionEn: 'Pure sunflower cooking oil, light and healthy for everyday use',
    image: '🌻',
    caloriesPerMl: 8.84,
    fatPerMl: 1.0,
    vitaminEPerMl: 0.12,
  },
  {
    id: 'afia-olive-1000',
    nameAr: 'عافية زيت زيتون 1 لتر',
    nameEn: 'Afia Olive Oil 1L',
    volume: 1000,
    descriptionAr: 'زيت زيتون بكر ممتاز، مثالي للسلطات والطبخ الصحي',
    descriptionEn: 'Extra virgin olive oil, perfect for salads and healthy cooking',
    image: '🫒',
    caloriesPerMl: 8.84,
    fatPerMl: 1.0,
    vitaminEPerMl: 0.2,
  },
];

export function getProductById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}

export function getProductByQR(qrText: string): Product | undefined {
  const normalized = qrText.toLowerCase().trim();
  return products.find(
    (p) =>
      p.id === normalized ||
      normalized.includes(p.id) ||
      normalized.includes('gold') && p.id.includes('gold') ||
      normalized.includes('classic') && p.id.includes('classic') ||
      normalized.includes('olive') && p.id.includes('olive')
  );
}
