'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getGatewayUrl } from '@/lib/lighthouse';
import { formatUSDC, type Category } from '@/types/content';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Props for ContentCard component
 * Validates: Requirements 4.1, 4.2, 4.5
 */
export interface ContentCardProps {
  /** Unique content identifier (bytes32 from contract) */
  contentId: string;
  /** Content title */
  title: string;
  /** IPFS CID for thumbnail image (null if no thumbnail) */
  thumbnailCID: string | null;
  /** Creator's wallet address */
  creatorAddress: string;
  /** Price in USDC (6 decimals) */
  priceUSDC: bigint;
  /** Content category */
  category: Category;
}

/**
 * Truncates an Ethereum address for display
 * @param address - Full Ethereum address
 * @returns Truncated address (e.g., "0x1234...5678")
 */
function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * ContentCard Component
 * 
 * Displays a content item in the browse grid with:
 * - Thumbnail image (or placeholder)
 * - Title
 * - Creator address (truncated)
 * - Price in USDC
 * - Category badge
 * 
 * Clicking the card navigates to /content/[id]
 * 
 * Validates: Requirements 4.1, 4.2, 4.5
 */
export function ContentCard({
  contentId,
  title,
  thumbnailCID,
  creatorAddress,
  priceUSDC,
  category,
}: ContentCardProps) {
  const thumbnailUrl = thumbnailCID ? getGatewayUrl(thumbnailCID) : null;

  return (
    <Link href={`/content/${contentId}`} className="block group">
      <Card 
        data-testid="content-card"
        className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer h-full"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-200 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
              <span className="text-4xl">🔒</span>
            </div>
          )}
          {/* Category badge overlay */}
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="capitalize text-xs">
              {category}
            </Badge>
          </div>
        </div>

        {/* Content info */}
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            by {truncateAddress(creatorAddress)}
          </p>
        </CardContent>

        {/* Price footer */}
        <CardFooter className="p-4 pt-0">
          <div className="flex items-center justify-between w-full">
            <span className="text-lg font-bold text-primary">
              ${formatUSDC(priceUSDC)}
            </span>
            <span className="text-xs text-muted-foreground">USDC</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default ContentCard;
