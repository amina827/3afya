'use client';

import { HeroSection } from '@/components/landing/HeroSection';
import { StatsSection } from '@/components/landing/StatsSection';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { HealthTips } from '@/components/landing/HealthTips';
import { CTASection } from '@/components/landing/CTASection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesGrid />
      <HowItWorks />
      <HealthTips />
      <CTASection />
    </>
  );
}
