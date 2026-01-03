'use client';

import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useContent, useHasAccess } from '@/hooks/useContentRegistry';
import { fetchJSONFromIPFS, getGatewayUrl } from '@/lib/ipfs';
import { formatUSDC, type ContentMetadata } from '@/types/content';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { PaymentGate } from '@/components/content/PaymentGate';
import { ContentPlayer } from '@/components/content/ContentPlayer';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';

/**
 * Truncates an Ethereum address for display
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Unknown date';
  }
}

/**
 * Get content type icon
 */
function getContentTypeIcon(contentType: string): string {
  const icons: Record<string, string> = {
    video: '🎬',
    audio: '🎵',
    pdf: '📄',
    image: '🖼️',
    article: '📝',
  };
  return icons[contentType] || '📁';
}

/**
 * Content Detail Page
 * 
 * Displays full content information including:
 * - Thumbnail and metadata
 * - Creator info and price
 * - PaymentGate if user doesn't have access
 * - ContentPlayer if user has access
 * 
 * Validates: Requirements 4.5, 7.1
 */
export default function ContentDetailPage() {
  const params = useParams();
  const contentId = params.id as string;
  const { address, isConnected } = useAccount();
  
  // Fetch content info from contract
  const { contentInfo, isLoading: isLoadingContent, error: contentError } = useContent(contentId);
  
  // Check if user has access
  const { hasAccess, isLoading: isLoadingAccess } = useHasAccess(contentId, address);
  
  // Fetch metadata from IPFS
  const [metadata, setMetadata] = useState<ContentMetadata | null>(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataError, setMetadataError] = useState<Error | null>(null);
  
  // Payment success state - tracks when user unlocks content via payment
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
  const [unlockedContentCID, setUnlockedContentCID] = useState<string | null>(null);
  
  /**
   * Handle successful payment from PaymentGate
   */
  const handlePaymentSuccess = useCallback((key: string, contentCID: string) => {
    setDecryptionKey(key);
    setUnlockedContentCID(contentCID);
    setPaymentSuccess(true);
  }, []);

  /**
   * Handle payment error from PaymentGate
   */
  const handlePaymentError = useCallback((error: string) => {
    console.error('Payment failed:', error);
    // Error is already displayed in PaymentGate component
  }, []);
  
  useEffect(() => {
    async function fetchMetadata() {
      if (!contentInfo?.metadataCID) return;
      
      setIsLoadingMetadata(true);
      setMetadataError(null);
      
      try {
        const data = await fetchJSONFromIPFS<ContentMetadata>(contentInfo.metadataCID);
        setMetadata(data);
      } catch (err) {
        setMetadataError(err instanceof Error ? err : new Error('Failed to fetch metadata'));
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    
    fetchMetadata();
  }, [contentInfo?.metadataCID]);
  
  const isLoading = isLoadingContent || isLoadingMetadata || isLoadingAccess;
  const error = contentError || metadataError;
  
  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <LoadingSpinner size="lg" message="Loading content..." />
          </div>
          <ContentDetailSkeleton />
        </div>
      </main>
    );
  }
  
  // Error state
  if (error) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <ErrorMessage
              type={getErrorType(error)}
              message={getUserFriendlyMessage(error)}
              showSuggestion={true}
              variant="card"
            />
            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="outline">← Back to Browse</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }
  
  // Content not found
  if (!contentInfo || !contentInfo.active) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="text-6xl mb-4">🔍</div>
              <CardTitle>Content Not Found</CardTitle>
              <CardDescription>
                This content doesn&apos;t exist or has been removed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/">
                <Button>Browse Content</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }
  
  const thumbnailUrl = metadata?.thumbnailCID ? getGatewayUrl(metadata.thumbnailCID) : null;
  
  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6">
          ← Back to Browse
        </Link>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thumbnail / Content Player Area */}
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {(hasAccess || paymentSuccess) && decryptionKey ? (
                // ContentPlayer for decrypted content
                <ContentPlayer 
                  contentCID={unlockedContentCID || contentInfo.contentCID}
                  contentType={(metadata?.contentType || 'video') as import('@/types/content').ContentType}
                  decryptionKey={decryptionKey}
                  mimeType={metadata?.mimeType}
                />
              ) : (hasAccess && !decryptionKey) ? (
                // User has access but no key yet - need to fetch key
                <AccessGrantedNoKey 
                  contentId={contentId}
                  contentType={metadata?.contentType || 'video'}
                  onKeyReceived={(key: string) => {
                    setDecryptionKey(key);
                    setUnlockedContentCID(contentInfo.contentCID);
                  }}
                />
              ) : (
                // Show thumbnail with lock overlay
                <>
                  {thumbnailUrl ? (
                    <Image
                      src={thumbnailUrl}
                      alt={metadata?.title || 'Content thumbnail'}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/20">
                      <span className="text-8xl">{getContentTypeIcon(metadata?.contentType || 'video')}</span>
                    </div>
                  )}
                  {/* Lock overlay */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <div className="text-center text-white">
                      <span className="text-6xl block mb-4">🔒</span>
                      <p className="text-lg font-medium">Content Locked</p>
                      <p className="text-sm text-white/70">Pay to unlock</p>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Content info */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {metadata?.title || 'Untitled Content'}
                </h1>
                <Badge variant="secondary" className="capitalize shrink-0">
                  {metadata?.category || 'other'}
                </Badge>
              </div>
              
              {/* Creator and date */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span>by {truncateAddress(contentInfo.creator)}</span>
                <span>•</span>
                <span>{metadata?.createdAt ? formatDate(metadata.createdAt) : 'Unknown date'}</span>
              </div>
              
              {/* Description */}
              {metadata?.description && (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {metadata.description}
                </p>
              )}
              
              {/* Tags */}
              {metadata?.tags && metadata.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {metadata.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment / Access Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Price</span>
                  <span className="text-2xl text-primary">
                    ${formatUSDC(contentInfo.priceUSDC)} USDC
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!isConnected ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Connect your wallet to unlock this content
                    </p>
                    <ConnectButton />
                  </div>
                ) : (hasAccess || paymentSuccess) ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <span className="text-xl">✓</span>
                      <span className="font-medium">Access Granted</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You have access to this content. Enjoy!
                    </p>
                  </div>
                ) : (
                  // PaymentGate component for x402 micropayments
                  <PaymentGate 
                    contentId={contentId}
                    priceUSDC={contentInfo.priceUSDC}
                    creatorAddress={contentInfo.creator}
                    onPaymentSuccess={handlePaymentSuccess}
                    onPaymentError={handlePaymentError}
                  />
                )}
              </CardContent>
            </Card>
            
            {/* Content Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Type" value={metadata?.contentType || 'Unknown'} />
                <DetailRow label="Category" value={metadata?.category || 'other'} />
                {metadata?.fileSize && (
                  <DetailRow label="Size" value={formatFileSize(metadata.fileSize)} />
                )}
                {metadata?.duration && (
                  <DetailRow label="Duration" value={formatDuration(metadata.duration)} />
                )}
                <DetailRow label="Encryption" value="AES-256-GCM" />
              </CardContent>
            </Card>
            
            {/* Creator Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Creator</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-lg">👤</span>
                  </div>
                  <div>
                    <p className="font-mono text-sm">{truncateAddress(contentInfo.creator)}</p>
                    <a 
                      href={`https://amoy.polygonscan.com/address/${contentInfo.creator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View on Polygonscan →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Header component
 */
function Header() {
  return (
    <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
          Unlock
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/upload">
            <Button variant="outline" size="sm">
              Upload Content
            </Button>
          </Link>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}

/**
 * Detail row component for content details card
 */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to human readable
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Skeleton loader for content detail page
 */
function ContentDetailSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-8 animate-pulse">
      <div className="lg:col-span-2 space-y-6">
        <div className="aspect-video bg-muted rounded-lg" />
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="h-40 bg-muted rounded-lg" />
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

/**
 * AccessGrantedNoKey Component
 * 
 * Shown when user has on-chain access but needs to fetch the decryption key.
 * Automatically fetches the key from the API endpoint.
 * 
 * Validates: Requirements 7.1, 7.2, 10.4
 */
function AccessGrantedNoKey({ 
  contentId, 
  contentType,
  onKeyReceived 
}: { 
  contentId: string; 
  contentType: string;
  onKeyReceived: (key: string) => void;
}) {
  const { address } = useAccount();
  const [, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKey() {
      if (!address) {
        setError('Wallet not connected');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/key/${contentId}`, {
          headers: {
            'x-consumer-address': address,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch decryption key');
        }

        const data = await response.json();
        
        if (data.key) {
          onKeyReceived(data.key);
        } else {
          throw new Error('No key returned from server');
        }
      } catch (err) {
        console.error('Error fetching key:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch key');
        setIsLoading(false);
      }
    }

    fetchKey();
  }, [contentId, address, onKeyReceived]);

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4">
        <ErrorMessage
          type="decryption"
          message={getUserFriendlyMessage(error)}
          onRetry={() => {
            setError(null);
            setIsLoading(true);
          }}
          showSuggestion={true}
          variant="card"
          className="max-w-md"
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-green-900/20 to-green-600/20">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        <span className="text-4xl block my-4">{getContentTypeIcon(contentType)}</span>
        <p className="text-lg font-medium text-green-600">Access Verified</p>
        <p className="text-sm text-muted-foreground">
          Loading decryption key...
        </p>
      </div>
    </div>
  );
}
