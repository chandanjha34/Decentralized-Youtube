'use client';

import { useRouter } from 'next/navigation';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { UploadForm } from '@/components/upload';

/**
 * Upload Page
 * 
 * Creator upload form page for uploading new content.
 */
export default function UploadPage() {
  const router = useRouter();

  const handleUploadComplete = (contentId: string) => {
    console.log('Upload complete:', contentId);
    // Could navigate to content page or dashboard
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <button 
            onClick={() => router.push('/')}
            className="text-xl font-bold hover:opacity-80 transition-opacity"
          >
            Unlock
          </button>
          <ConnectButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Upload Content</h1>
          <p className="text-muted-foreground">
            Monetize your content with pay-per-view access
          </p>
        </div>

        <UploadForm
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />
      </div>
    </main>
  );
}
