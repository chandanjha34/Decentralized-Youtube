import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { BrowseContent } from "@/components/content";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header with Connect Button */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold hover:text-primary transition-colors">
            Unlock
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Dashboard
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Discover & Unlock Premium Content
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Decentralized content monetization with client-side encryption, 
            IPFS storage, and x402 micropayments. Pay once, access forever.
          </p>
        </div>

        {/* Features Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <Card>
            <CardHeader>
              <CardTitle>🔐 Client-Side Encryption</CardTitle>
              <CardDescription>
                Your content is encrypted in your browser before upload. 
                We never see your files.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>💰 Direct Payouts</CardTitle>
              <CardDescription>
                USDC goes straight to your wallet via x402 micropayments. 
                No platform cut, no waiting.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⛓️ On-Chain Access</CardTitle>
              <CardDescription>
                Access control is trustless and permanent on Polygon. 
                Your purchases are forever.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Browse Section */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Browse Content</h2>
            <Link href="/upload">
              <Button>
                Upload Your Content
              </Button>
            </Link>
          </div>
          
          <BrowseContent />
        </section>
      </div>
    </main>
  );
}
