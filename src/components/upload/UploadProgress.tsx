'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadStatus } from '@/types/content';

/**
 * Props for UploadProgress component
 */
interface UploadProgressProps {
  /** Current upload status */
  status: UploadStatus;
  /** Callback to reset the form */
  onReset: () => void;
  /** Title of the content being uploaded */
  contentTitle?: string;
  /** Content ID after successful registration */
  contentId?: string;
  /** Error message if upload failed */
  errorMessage?: string;
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
 * Shows the multi-step upload progress:
 * Encrypting → Uploading → Registering → Done
 * 
 * Requirements: 2.8
 */
export function UploadProgress({
  status,
  onReset,
  contentTitle,
  contentId,
  errorMessage,
}: UploadProgressProps) {
  const [animatedStep, setAnimatedStep] = useState(0);
  const currentStepIndex = getStepIndex(status);

  // Animate step transitions
  useEffect(() => {
    if (currentStepIndex >= 0) {
      const timer = setTimeout(() => {
        setAnimatedStep(currentStepIndex);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStepIndex]);

  const isComplete = status === 'success';
  const isError = status === 'error';

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle>
          {isComplete ? '🎉 Upload Complete!' : isError ? '❌ Upload Failed' : 'Uploading Content'}
        </CardTitle>
        {contentTitle && (
          <CardDescription className="text-base">
            {contentTitle}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Progress Steps */}
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out"
              style={{
                width: `${(animatedStep / (UPLOAD_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {UPLOAD_STEPS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex || status === 'success';
              const isPending = index > currentStepIndex;

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center"
                  style={{ width: '25%' }}
                >
                  {/* Step Circle */}
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-medium transition-all duration-300
                      ${isCompleted ? 'bg-primary text-primary-foreground' : ''}
                      ${isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                      ${isPending ? 'bg-muted text-muted-foreground' : ''}
                      ${isError && isActive ? 'bg-destructive text-destructive-foreground' : ''}
                    `}
                  >
                    {isCompleted && !isActive ? (
                      <CheckIcon />
                    ) : isError && isActive ? (
                      <XIcon />
                    ) : isActive ? (
                      <SpinnerIcon />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Step Label */}
                  <span
                    className={`
                      mt-2 text-sm font-medium text-center
                      ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Step Description */}
        <div className="text-center py-4">
          {isError ? (
            <div className="space-y-2">
              <p className="text-destructive">
                {errorMessage || 'An error occurred during upload. Please try again.'}
              </p>
            </div>
          ) : isComplete ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Your content has been encrypted, uploaded to IPFS, and registered on-chain.
              </p>
              {contentId && (
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  Content ID: {contentId}
                </p>
              )}
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <p>✓ Content encrypted with AES-256</p>
                <p>✓ Stored on IPFS (decentralized)</p>
                <p>✓ Registered on Polygon Amoy</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">
                {UPLOAD_STEPS[currentStepIndex]?.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Please don&apos;t close this window
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {isComplete && (
            <>
              <Button onClick={onReset}>Upload Another</Button>
              <Button variant="outline" asChild>
                <a href={`/content/${contentId || ''}`}>View Content</a>
              </Button>
            </>
          )}
          {isError && (
            <Button onClick={onReset}>Try Again</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Check icon for completed steps
 */
function CheckIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

/**
 * X icon for error state
 */
function XIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Spinner icon for active step
 */
function SpinnerIcon() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
