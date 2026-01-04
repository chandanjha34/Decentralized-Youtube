'use client';

import { useEffect, useState } from 'react';
import { UploadStatus } from '@/types/content';

/**
 * Props for UploadProgress component
 */
interface UploadProgressProps {
  /** Current upload status */
  status: UploadStatus;
  /** Callback to reset the form */
  onReset: () => void;
  /** Name of the file being uploaded */
  fileName?: string;
}

/**
 * Upload step configuration
 */
interface UploadStep {
  id: UploadStatus;
  label: string;
  description: string;
}

/**
 * Upload steps in order
 */
const UPLOAD_STEPS: UploadStep[] = [
  {
    id: 'encrypting',
    label: 'Encrypting',
    description: 'Encrypting your content with AES-256...',
  },
  {
    id: 'uploading',
    label: 'Uploading',
    description: 'Uploading encrypted content to IPFS...',
  },
  {
    id: 'registering',
    label: 'Registering',
    description: 'Registering content on-chain...',
  },
  {
    id: 'success',
    label: 'Done',
    description: 'Your content is live!',
  },
];

/**
 * Get the index of the current step
 */
function getStepIndex(status: UploadStatus): number {
  return UPLOAD_STEPS.findIndex(step => step.id === status);
}

/**
 * UploadProgress Component
 * 
 * Shows the multi-step upload progress with design system styling:
 * - Progress bar with animated width
 * - Stage indicator (encrypting, uploading, registering)
 * - Success animation
 * 
 * Requirements: 6.3
 */
export function UploadProgress({
  status,
  onReset,
  fileName,
}: UploadProgressProps) {
  const [progress, setProgress] = useState(0);
  const currentStepIndex = getStepIndex(status);

  // Animate progress bar
  useEffect(() => {
    if (currentStepIndex >= 0) {
      const targetProgress = ((currentStepIndex + 1) / UPLOAD_STEPS.length) * 100;
      const timer = setTimeout(() => {
        setProgress(targetProgress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex]);

  const isComplete = status === 'success';
  const isError = status === 'error';
  const currentStep = UPLOAD_STEPS[currentStepIndex];

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <div className="bg-white border border-[#E0DEDB] rounded-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-instrument-serif text-[#37322F] mb-2">
            {isComplete ? '🎉 Upload Complete!' : isError ? '❌ Upload Failed' : 'Uploading Content'}
          </h2>
          {fileName && (
            <p className="text-sm text-[#605A57]">
              {fileName}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-[rgba(55,50,47,0.1)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#37322F] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stage Indicator */}
        <div className="text-center mb-8">
          {isError ? (
            <div className="space-y-2">
              <p className="text-red-600">
                An error occurred during upload. Please try again.
              </p>
            </div>
          ) : isComplete ? (
            <div className="space-y-4">
              <p className="text-[#605A57]">
                Your content has been encrypted, uploaded to IPFS, and registered on-chain.
              </p>
              <div className="flex flex-col items-center gap-2 text-sm text-[#605A57]">
                <p>✓ Content encrypted with AES-256</p>
                <p>✓ Stored on IPFS (decentralized)</p>
                <p>✓ Registered on Polygon Amoy</p>
              </div>
            </div>
          ) : currentStep ? (
            <div className="space-y-2">
              <p className="text-lg font-medium text-[#37322F]">
                {currentStep.label}
              </p>
              <p className="text-sm text-[#605A57]">
                {currentStep.description}
              </p>
              <p className="text-xs text-[#847971]">
                Please don&apos;t close this window
              </p>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {isComplete && (
            <>
              <button
                onClick={onReset}
                className="px-6 py-3 text-sm font-medium text-white bg-[#37322F] rounded-full hover:bg-[#49423D] transition-colors shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset]"
              >
                Upload Another
              </button>
              <a
                href="/dashboard"
                className="px-6 py-3 text-sm font-medium text-[#37322F] bg-white border border-[#E0DEDB] rounded-full hover:bg-[#F7F5F3] transition-colors"
              >
                View Dashboard
              </a>
            </>
          )}
          {isError && (
            <button
              onClick={onReset}
              className="px-6 py-3 text-sm font-medium text-white bg-[#37322F] rounded-full hover:bg-[#49423D] transition-colors shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset]"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
