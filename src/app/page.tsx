"use client";

import { useState } from "react";
import { HeroSection, FeatureCards, DashboardPreview } from "@/components/landing";
import { BrowseContent } from "@/components/content";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const features = [
    {
      title: "🔐 Client-Side Encryption",
      description: "Your content is encrypted in your browser before upload. We never see your files.",
    },
    {
      title: "💰 Direct Payouts",
      description: "USDC goes straight to your wallet via x402 micropayments. No platform cut, no waiting.",
    },
    {
      title: "⛓️ On-Chain Access",
      description: "Access control is trustless and permanent on Polygon. Your purchases are forever.",
    },
  ];

  const previewImages = [
    "/modern-dashboard-interface-with-data-visualization.jpg",
    "/analytics-dashboard-with-charts-graphs-and-data-vi.jpg",
    "/data-visualization-dashboard-with-interactive-char.jpg",
  ];

  return (
    <div className="w-full">
      {/* Hero Section */}
      <HeroSection
        headline="Discover & Unlock Premium Content"
        subheadline="Decentralized content monetization with client-side encryption, IPFS storage, and x402 micropayments. Pay once, access forever."
        ctaText="Get Started"
        ctaHref="/explore"
      />

      {/* Dashboard Preview */}
      <DashboardPreview activeIndex={activePreviewIndex} images={previewImages} />

      {/* Feature Cards */}
      <FeatureCards features={features} onCardChange={setActivePreviewIndex} />

      {/* Social Proof Section */}
      <div className="w-full border-b border-[rgba(55,50,47,0.12)] flex flex-col justify-center items-center py-8 sm:py-12 md:py-16">
        <div className="w-full max-w-[586px] px-4 sm:px-6 py-4 sm:py-5 flex flex-col justify-start items-center gap-3 sm:gap-4">
          <div className="w-full text-center flex justify-center flex-col text-[#49423D] text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight font-sans tracking-tight">
            Trusted by creators worldwide
          </div>
          <div className="self-stretch text-center text-[#605A57] text-sm sm:text-base font-normal leading-6 sm:leading-7 font-sans">
            Join thousands of creators monetizing their content with blockchain technology.
          </div>
        </div>
      </div>

      {/* Browse Section */}
      <section className="py-16 px-4 sm:px-6 md:px-8">
        <div className="max-w-[1060px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#37322F]">Browse Content</h2>
            <Link href="/upload">
              <Button className="bg-[#37322F] hover:bg-[#49423D] text-white rounded-full">
                Upload Your Content
              </Button>
            </Link>
          </div>
          
          <BrowseContent />
        </div>
      </section>
    </div>
  );
}
