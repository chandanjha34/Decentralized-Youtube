'use client';

import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { ContentList, EarningsList } from "@/components/dashboard";
import Link from "next/link";
import { useAccount } from "wagmi";

/**
 * Creator Dashboard Page
 * 
 * Displays:
 * - List of creator's uploaded content
 * - Content management options (edit price, view details)
 * - Earnings display with total and recent transactions
 * 
 * Validates: Requirements 8.1, 8.2, 8.5, 8.6
 */
export default function DashboardPage() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-background">
      {/* Header with Connect Button */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
            Unlock
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                Browse
              </Button>
            </Link>
            <Link href="/upload">
              <Button variant="outline" size="sm">
                Upload Content
              </Button>
            </Link>
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Creator Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage your content and track your earnings
          </p>
        </div>

        {/* Dashboard Content */}
        {!isConnected ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-muted-foreground mb-6">
              Connect your wallet to view and manage your content
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Earnings Display */}
            <EarningsList />
            
            {/* Content List */}
            <ContentList />
          </div>
        )}
      </div>
    </main>
  );
}
