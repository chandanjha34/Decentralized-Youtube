'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import { useCreatorDashboardContent, useUpdatePrice } from '@/hooks/useContentRegistry';
import { formatUSDC, parseUSDC } from '@/types/content';
import Link from 'next/link';

/**
 * Truncates a content ID for display
 */
function truncateContentId(id: string): string {
  if (!id || id.length < 16) return id;
  return `${id.slice(0, 10)}...${id.slice(-6)}`;
}

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * ContentList Component
 * 
 * Displays a table of creator's uploaded content with:
 * - Title
 * - Category
 * - Price (with inline editing)
 * - Upload date
 * - Click row to edit
 * 
 * Validates: Requirements 8.1, 8.2, 8.4
 */
export function ContentList() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'title'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Price editing state
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [priceError, setPriceError] = useState<string | null>(null);

  // Fetch creator's content with dashboard data
  const { content, isLoading, error, refetch } = useCreatorDashboardContent(address);
  
  // Price update hook
  const { 
    updatePrice, 
    isPending: isUpdatingPrice, 
    isConfirming, 
    isSuccess: priceUpdateSuccess,
    error: updateError,
    reset: resetUpdatePrice 
  } = useUpdatePrice();

  // Handle successful price update
  useEffect(() => {
    if (priceUpdateSuccess) {
      setEditingContentId(null);
      setEditPrice('');
      setPriceError(null);
      resetUpdatePrice();
      // Refetch content to show updated price
      refetch();
    }
  }, [priceUpdateSuccess, resetUpdatePrice, refetch]);

  // Handle update error
  useEffect(() => {
    if (updateError) {
      setPriceError(updateError.message || 'Failed to update price');
    }
  }, [updateError]);

  // Sort content
  const sortedContent = [...content].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'date':
        comparison = a.uploadDate.getTime() - b.uploadDate.getTime();
        break;
      case 'price':
        comparison = Number(a.priceUSDC - b.priceUSDC);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Handle sort toggle
  const handleSort = (column: 'date' | 'price' | 'title') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Handle starting price edit
  const handleStartEdit = (contentId: string, currentPrice: bigint) => {
    setEditingContentId(contentId);
    setEditPrice(formatUSDC(currentPrice));
    setPriceError(null);
    resetUpdatePrice();
  };

  // Handle canceling price edit
  const handleCancelEdit = () => {
    setEditingContentId(null);
    setEditPrice('');
    setPriceError(null);
    resetUpdatePrice();
  };

  // Handle saving new price
  const handleSavePrice = async (contentId: string) => {
    // Validate price
    const priceNum = parseFloat(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setPriceError('Please enter a valid price');
      return;
    }
    if (priceNum > 1000000) {
      setPriceError('Price cannot exceed $1,000,000');
      return;
    }

    setPriceError(null);
    const newPriceUSDC = parseUSDC(editPrice);
    
    try {
      await updatePrice(contentId, newPriceUSDC);
    } catch (err) {
      console.error('Failed to update price:', err);
      setPriceError('Failed to update price. Please try again.');
    }
  };

  // Handle row click - navigate to content detail for editing
  const handleRowClick = (contentId: string) => {
    // Don't navigate if we're editing price
    if (editingContentId === contentId) return;
    router.push(`/content/${contentId}?edit=true`);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your content
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
          <CardTitle className="text-xl font-instrument-serif">Your Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" message="Loading your content..." />
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
          <CardTitle className="text-xl font-instrument-serif">Your Content</CardTitle>
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

  // Empty state
  if (sortedContent.length === 0) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle className="text-xl font-instrument-serif">Your Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground mb-4">
              You haven&apos;t uploaded any content yet
            </p>
            <Link href="/upload">
              <Button className="rounded-full">Upload Your First Content</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl font-instrument-serif">
          Your Content ({sortedContent.length})
        </CardTitle>
        <Link href="/upload">
          <Button size="sm" className="rounded-full">Upload New</Button>
        </Link>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('title')}
                >
                  Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                  Category
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('price')}
                >
                  Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th 
                  className="text-left py-3 px-4 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => handleSort('date')}
                >
                  Upload Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedContent.map((item) => (
                <tr 
                  key={item.contentId}
                  className="border-b border-border last:border-0 hover:bg-[rgba(55,50,47,0.03)] cursor-pointer transition-colors"
                  onClick={() => handleRowClick(item.contentId)}
                >
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-foreground">{item.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {truncateContentId(item.contentId)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {item.category}
                    </Badge>
                  </td>
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                    {editingContentId === item.contentId ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-24 h-8 text-sm"
                            placeholder="0.00"
                            disabled={isUpdatingPrice || isConfirming}
                            autoFocus
                          />
                          <span className="text-xs text-muted-foreground">USDC</span>
                        </div>
                        {priceError && (
                          <p className="text-xs text-destructive">{priceError}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="rounded-full"
                            onClick={() => handleSavePrice(item.contentId)}
                            disabled={isUpdatingPrice || isConfirming}
                          >
                            {isUpdatingPrice ? 'Signing...' : isConfirming ? 'Confirming...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            onClick={handleCancelEdit}
                            disabled={isUpdatingPrice || isConfirming}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          ${formatUSDC(item.priceUSDC)}
                        </span>
                        <span className="text-xs text-muted-foreground">USDC</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">
                    {formatDate(item.uploadDate)}
                  </td>
                  <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {editingContentId === item.contentId ? null : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-full"
                        onClick={() => handleStartEdit(item.contentId, item.priceUSDC)}
                      >
                        Edit Price
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {sortedContent.map((item) => (
            <Card 
              key={item.contentId}
              className="border border-border cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleRowClick(item.contentId)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-medium text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {truncateContentId(item.contentId)}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {item.category}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold text-foreground">
                        ${formatUSDC(item.priceUSDC)}
                      </span>
                      <span className="text-xs text-muted-foreground">USDC</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(item.uploadDate)}</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(item.contentId, item.priceUSDC);
                      }}
                    >
                      Edit Price
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default ContentList;
