'use client';

import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import { useCreatorEarnings } from '@/hooks/useContentRegistry';
import { formatUSDC } from '@/types/content';

/**
 * Truncates an address for display
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Truncates a transaction hash for display
 */
function truncateTxHash(hash: string): string {
  if (!hash || hash.length < 16) return hash;
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns the Polygonscan URL for a transaction
 */
function getPolygonscanUrl(txHash: string): string {
  // Polygon Amoy testnet explorer
  return `https://amoy.polygonscan.com/tx/${txHash}`;
}

/**
 * EarningsList Component
 * 
 * Displays creator's earnings:
 * - Total earnings in USDC
 * - Recent transactions with consumer, amount, date
 * - Links to Polygonscan for each transaction
 * 
 * Validates: Requirements 8.5, 8.6
 */
export function EarningsList() {
  const { address, isConnected } = useAccount();
  const { earnings, isLoading, error, refetch } = useCreatorEarnings(address);

  // Not connected state
  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your earnings
          </p>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-instrument-serif">Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" message="Loading earnings..." />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-instrument-serif">Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorMessage
            type={getErrorType(error)}
            message={getUserFriendlyMessage(error)}
            onRetry={() => refetch()}
            showSuggestion={true}
            variant="card"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Earnings Card */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-instrument-serif">Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-instrument-serif text-foreground">
              ${formatUSDC(earnings.totalEarningsUSDC)}
            </span>
            <span className="text-lg text-muted-foreground">USDC</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            From {earnings.transactionCount} transaction{earnings.transactionCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-instrument-serif">Recent Transactions</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {earnings.recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No transactions yet. Share your content to start earning!
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Content
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Consumer
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Amount
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                        Date
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                        Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.recentTransactions.map((tx, index) => (
                      <tr 
                        key={`${tx.txHash}-${index}`}
                        className="border-b border-border last:border-0 hover:bg-[rgba(55,50,47,0.03)] transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="text-sm font-medium text-foreground">{tx.contentTitle}</div>
                        </td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className="font-mono text-xs">
                            {truncateAddress(tx.consumerAddress)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-semibold text-green-600">
                            +${formatUSDC(tx.amountUSDC)}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1">USDC</span>
                        </td>
                        <td className="py-4 px-4 text-sm text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <a
                            href={getPolygonscanUrl(tx.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline font-mono"
                          >
                            {truncateTxHash(tx.txHash)} ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {earnings.recentTransactions.map((tx, index) => (
                  <Card 
                    key={`${tx.txHash}-${index}`}
                    className="border border-border"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-sm font-medium text-foreground mb-1">
                              {tx.contentTitle}
                            </h3>
                            <Badge variant="outline" className="font-mono text-xs">
                              {truncateAddress(tx.consumerAddress)}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              +${formatUSDC(tx.amountUSDC)}
                            </div>
                            <div className="text-xs text-muted-foreground">USDC</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatDate(tx.timestamp)}</span>
                          <a
                            href={getPolygonscanUrl(tx.txHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono"
                          >
                            {truncateTxHash(tx.txHash)} ↗
                          </a>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EarningsList;
