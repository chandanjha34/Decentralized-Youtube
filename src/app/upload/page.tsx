'use client';

import { useAccount } from 'wagmi';
import { UploadForm } from '@/components/upload';
import { ConnectButton } from '@/components/wallet/ConnectButton';

/**
 * Upload Page
 * 
 * Creator upload form page for uploading new content.
 * Requires wallet connection to access.
 * 
 * Requirements: 6.5
 */
export default function UploadPage() {
  const { isConnected } = useAccount();

  const handleUploadComplete = (contentId: string) => {
    console.log('Upload complete:', contentId);
    // Navigate to dashboard on success
    window.location.href = '/dashboard';
  };

  const handleUploadError = (error: Error) => {
    console.error('Upload error:', error);
  };

  return (
    <div className="py-16 px-8">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-instrument-serif text-[#37322F] mb-4">Upload Content</h1>
        <p className="text-lg text-[#605A57]">
          Monetize your content with pay-per-view access
        </p>
      </div>

      {!isConnected ? (
        <div className="w-full max-w-[600px] mx-auto">
          <div className="bg-white border border-[#E0DEDB] rounded-lg p-8 text-center">
            <h2 className="text-2xl font-instrument-serif text-[#37322F] mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-[#605A57] mb-6">
              You need to connect your wallet to upload content and receive payments.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        </div>
      ) : (
        <UploadForm
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />
      )}
    </div>
  );
}
