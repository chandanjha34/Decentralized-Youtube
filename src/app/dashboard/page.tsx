'use client';

import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ContentList, EarningsList } from "@/components/dashboard";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { useAccount } from "wagmi";
import { useCreatorEarnings, useCreatorDashboardContent } from "@/hooks/useContentRegistry";
import { formatUSDC } from "@/types/content";
import { useMemo } from "react";

/**
 * Creator Dashboard Page
 * 
 * Displays:
 * - Stats overview (total earnings, views, content count)
 * - List of creator's uploaded content
 * - Content management options (edit price, view details)
 * - Earnings display with total and recent transactions
 * 
 * Validates: Requirements 5.1, 5.2, 5.4, 5.5
 */
export default function DashboardPage() {
  const { address, isConnected } = useAccount();

  // Fetch earnings data
  const { earnings, isLoading: isLoadingEarnings, error: earningsError } = useCreatorEarnings(address);
  
  // Fetch content data
  const { content, isLoading: isLoadingContent, error: contentError } = useCreatorDashboardContent(address);

  // Calculate stats for overview
  const stats = useMemo(() => {
    const totalEarnings = formatUSDC(earnings.totalEarningsUSDC);
    const totalViews = content.reduce((sum, item) => sum + item.viewCount, 0);
    const contentCount = content.length;

    return {
      totalEarnings,
      totalViews,
      contentCount,
    };
  }, [earnings.totalEarningsUSDC, content]);

  return (
    <div className="py-16 px-8">
      <div className="max-w-[1060px] mx-auto">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-instrument-serif text-foreground tracking-tight mb-4">
            Creator Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your content and track your earnings
          </p>
        </div>

        {/* Dashboard Content */}
        {!isConnected ? (
          <div className="text-center py-24">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-instrument-serif text-foreground mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                Connect your wallet to view and manage your content
              </p>
              <ConnectButton />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <StatsOverview
              totalEarnings={stats.totalEarnings}
              totalViews={stats.totalViews}
              contentCount={stats.contentCount}
              isLoading={isLoadingEarnings || isLoadingContent}
              error={earningsError || contentError}
              onRetry={() => {
                // Refetch will be handled by the individual components
              }}
            />

            {/* Earnings Display */}
            <EarningsList />
            
            {/* Content List */}
            <ContentList />
          </div>
        )}
      </div>
    </div>
  );
}
