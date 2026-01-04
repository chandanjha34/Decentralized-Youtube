'use client';

import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';

/**
 * StatsOverview Component
 * 
 * Displays three stat cards showing creator metrics:
 * - Total Earnings (in USDC)
 * - Total Views
 * - Content Count
 * 
 * Uses responsive grid layout (3 columns desktop, 1 column mobile)
 * Matches frontend-sample design system with Instrument Serif for values
 * 
 * Validates: Requirements 5.4
 */

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function StatCard({ label, value, icon, isLoading }: StatCardProps) {
  return (
    <Card className="border border-border">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {label}
            </p>
            {isLoading ? (
              <div className="h-12 flex items-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : (
              <p className="text-5xl font-instrument-serif text-foreground">
                {value}
              </p>
            )}
          </div>
          <div className="text-foreground opacity-80">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsOverviewProps {
  totalEarnings: string;
  totalViews: number;
  contentCount: number;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export function StatsOverview({
  totalEarnings,
  totalViews,
  contentCount,
  isLoading = false,
  error = null,
  onRetry,
}: StatsOverviewProps) {
  // Error state
  if (error) {
    return (
      <div className="mb-8">
        <ErrorMessage
          type={getErrorType(error)}
          message={getUserFriendlyMessage(error)}
          onRetry={onRetry}
          showSuggestion={true}
          variant="card"
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <StatCard
        label="Total Earnings"
        value={`$${totalEarnings}`}
        icon={
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
        isLoading={isLoading}
      />
      <StatCard
        label="Total Views"
        value={totalViews.toLocaleString()}
        icon={
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        }
        isLoading={isLoading}
      />
      <StatCard
        label="Content Count"
        value={contentCount}
        icon={
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        }
        isLoading={isLoading}
      />
    </div>
  );
}

export default StatsOverview;
