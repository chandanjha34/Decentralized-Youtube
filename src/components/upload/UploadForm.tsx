'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { UploadProgress } from './UploadProgress';
import { useContentUpload } from '@/hooks/useContentUpload';
import {
  UploadFormData,
  UploadStatus,
  Category,
  CATEGORIES,
  ALL_ACCEPTED_TYPES,
  MAX_FILE_SIZES,
  formatFileSize,
  getContentTypeFromMime,
} from '@/types/content';

/**
 * Props for UploadForm component
 */
interface UploadFormProps {
  /** Callback when upload completes successfully */
  onUploadComplete?: (contentId: string) => void;
  /** Callback when upload fails */
  onUploadError?: (error: Error) => void;
}

/**
 * Initial form state
 */
const initialFormData: UploadFormData = {
  file: null,
  thumbnail: null,
  title: '',
  description: '',
  category: '',
  tags: [],
  priceUSDC: '',
};

/**
 * UploadForm Component
 * 
 * Styled upload form matching the design system from frontend-sample.
 * Features:
 * - Centered form with max-width 600px
 * - Design system input styling
 * - File upload drag-and-drop zone
 * - Form validation
 * 
 * Requirements: 6.1
 */
export function UploadForm({ onUploadComplete, onUploadError }: UploadFormProps) {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<UploadFormData>(initialFormData);
  const [localStatus, setLocalStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // Track metadata CIDs for transaction success handling
  const [pendingUpload, setPendingUpload] = useState<{
    metadataCID: string;
    contentCID: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use the content upload hook
  const {
    status: uploadStatus,
    error: uploadError,
    result: uploadResult,
    txHash,
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError,
    receiptError,
    upload,
    reset: resetUpload,
    handleTransactionSuccess,
  } = useContentUpload();
  
  // Derive the actual status from hook state
  const status: UploadStatus = (() => {
    if (localStatus === 'error') return 'error';
    if (isConfirmed && uploadResult) return 'success';
    if (isConfirming || isWritePending) return 'registering';
    return uploadStatus;
  })();
  
  // Handle transaction confirmation - clear any errors on success
  useEffect(() => {
    if (isConfirmed && txHash && pendingUpload) {
      // Clear any previous errors since transaction succeeded
      setError(null);
      setLocalStatus('idle');
      
      const result = handleTransactionSuccess();
      if (result) {
        setFormData(initialFormData);
        onUploadComplete?.(result.contentId);
      }
    }
  }, [isConfirmed, txHash, pendingUpload, handleTransactionSuccess, onUploadComplete]);
  
  // Handle write errors - but don't show error if transaction eventually succeeds
  useEffect(() => {
    if (writeError && !isConfirmed) {
      console.error('Write error:', writeError);
      let errorMessage = 'Transaction failed';
      const errMsg = typeof writeError === 'string' ? writeError : '';
      
      if (errMsg.includes('User rejected') || errMsg.includes('user rejected')) {
        errorMessage = 'Transaction was rejected by user';
      } else if (errMsg.includes('insufficient')) {
        errorMessage = 'Insufficient POL for gas fees';
      } else if (errMsg.includes('Internal JSON-RPC error') || errMsg.includes('internal error') || errMsg.includes('network')) {
        // RPC errors - the fallback should handle this automatically
        errorMessage = 'Network issue detected. Retrying with different RPC...';
        // Don't set error state, let the fallback RPC handle it
        return;
      } else if (errMsg.includes('execution reverted')) {
        errorMessage = 'Contract execution failed. Please try again.';
      } else {
        // Show first 200 chars of error
        errorMessage = errMsg.length > 200 ? errMsg.slice(0, 200) + '...' : errMsg || 'Transaction failed';
      }
      setError(errorMessage);
      setLocalStatus('error');
      onUploadError?.(new Error(errorMessage));
    }
  }, [writeError, isConfirmed, onUploadError]);
  
  // Handle receipt errors - but don't show error if transaction eventually succeeds
  useEffect(() => {
    if (receiptError && !isConfirmed) {
      const errorMessage = 'Failed to confirm transaction. Check your wallet for status.';
      setError(errorMessage);
      setLocalStatus('error');
      onUploadError?.(new Error(errorMessage));
    }
  }, [receiptError, isConfirmed, onUploadError]);
  
  // Handle upload errors
  useEffect(() => {
    if (uploadError) {
      setError(uploadError);
      setLocalStatus('error');
      onUploadError?.(new Error(uploadError));
    }
  }, [uploadError, onUploadError]);

  /**
   * Handle file selection for content
   */
  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;
    
    // Validate file type
    if (!(ALL_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
      setError(`Unsupported file type: ${file.type}. Please upload video, audio, PDF, image, or text files.`);
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZES.content) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZES.content)}.`);
      return;
    }
    
    setError(null);
    setFormData(prev => ({ ...prev, file }));
  }, []);

  /**
   * Handle drag events for content dropzone
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle drop for content
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  /**
   * Add a tag
   */
  const addTag = useCallback(() => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  }, [tagInput, formData.tags]);

  /**
   * Remove a tag
   */
  const removeTag = useCallback((tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  }, []);

  /**
   * Handle tag input key press
   */
  const handleTagKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  }, [addTag]);

  /**
   * Validate form before submission
   */
  const validateForm = useCallback((): boolean => {
    if (!formData.file) {
      setError('Please select a file to upload.');
      return false;
    }
    if (!formData.title.trim()) {
      setError('Please enter a title.');
      return false;
    }
    if (!formData.category) {
      setError('Please select a category.');
      return false;
    }
    if (!formData.priceUSDC || parseFloat(formData.priceUSDC) < 0) {
      setError('Please enter a valid price.');
      return false;
    }
    return true;
  }, [formData]);

  /**
   * Handle form submission
   * Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 2.7
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected || !address) {
      setError('Please connect your wallet first.');
      return;
    }
    
    if (!validateForm()) return;
    
    setError(null);
    setLocalStatus('idle');
    setPendingUpload(null);
    
    try {
      // Execute the upload flow
      const result = await upload(formData);
      
      // Store the CIDs for when the transaction confirms
      setPendingUpload({
        metadataCID: result.metadataCID,
        contentCID: result.contentCID,
      });
      
    } catch (err) {
      setLocalStatus('error');
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      onUploadError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [isConnected, address, validateForm, upload, formData, onUploadError]);

  /**
   * Reset form
   */
  const handleReset = useCallback(() => {
    setFormData(initialFormData);
    setLocalStatus('idle');
    setError(null);
    setTagInput('');
    setPendingUpload(null);
    resetUpload();
  }, [resetUpload]);

  // Show progress indicator during upload
  if (status !== 'idle' && status !== 'error') {
    return (
      <UploadProgress 
        status={status} 
        onReset={handleReset}
        fileName={formData.file?.name || ''}
      />
    );
  }

  return (
    <div className="w-full max-w-[600px] mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Content File Dropzone */}
        <div className="space-y-2">
          <label htmlFor="content-file" className="block text-sm font-medium text-[#37322F]">
            Content File *
          </label>
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${dragActive ? 'border-[#37322F] bg-[#37322F]/5' : 'border-[#E0DEDB]'}
              ${formData.file ? 'bg-[#F7F5F3]' : 'hover:border-[#37322F]/50'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              id="content-file"
              className="hidden"
              accept={ALL_ACCEPTED_TYPES.join(',')}
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
            {formData.file ? (
              <div className="space-y-2">
                <p className="font-medium text-[#37322F]">{formData.file.name}</p>
                <p className="text-sm text-[#605A57]">
                  {formatFileSize(formData.file.size)} • {getContentTypeFromMime(formData.file.type)}
                </p>
                <button
                  type="button"
                  className="mt-2 px-4 py-2 text-sm font-medium text-[#37322F] bg-white border border-[#E0DEDB] rounded-full hover:bg-[#F7F5F3] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData(prev => ({ ...prev, file: null }));
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[#605A57]">
                  Drag and drop your file here, or click to browse
                </p>
                <p className="text-xs text-[#847971]">
                  Supports video, audio, PDF, images, and text files (max {formatFileSize(MAX_FILE_SIZES.content)})
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-[#37322F]">
            Title *
          </label>
          <input
            id="title"
            type="text"
            placeholder="Enter a title for your content"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            maxLength={100}
            className="w-full px-4 py-3 text-sm border border-[#E0DEDB] rounded-lg focus:outline-none focus:border-[#37322F] transition-colors"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-[#37322F]">
            Description
          </label>
          <textarea
            id="description"
            placeholder="Describe your content..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={4}
            maxLength={1000}
            className="w-full px-4 py-3 text-sm border border-[#E0DEDB] rounded-lg focus:outline-none focus:border-[#37322F] transition-colors resize-none"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-[#37322F]">
            Category *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
            className="w-full px-4 py-3 text-sm border border-[#E0DEDB] rounded-lg focus:outline-none focus:border-[#37322F] transition-colors bg-white"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label htmlFor="tags" className="block text-sm font-medium text-[#37322F]">
            Tags (up to 10)
          </label>
          <div className="flex gap-2">
            <input
              id="tags"
              type="text"
              placeholder="Add a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              maxLength={30}
              disabled={formData.tags.length >= 10}
              className="flex-1 px-4 py-3 text-sm border border-[#E0DEDB] rounded-lg focus:outline-none focus:border-[#37322F] transition-colors disabled:opacity-50"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim() || formData.tags.length >= 10}
              className="px-4 py-3 text-sm font-medium text-[#37322F] bg-white border border-[#E0DEDB] rounded-lg hover:bg-[#F7F5F3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-[#F7F5F3] text-[#37322F] rounded-full cursor-pointer hover:bg-[#E0DEDB] transition-colors"
                  onClick={() => removeTag(tag)}
                >
                  {tag} ×
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="space-y-2">
          <label htmlFor="price" className="block text-sm font-medium text-[#37322F]">
            Price (USDC) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#605A57]">
              $
            </span>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.priceUSDC}
              onChange={(e) => setFormData(prev => ({ ...prev, priceUSDC: e.target.value }))}
              className="w-full pl-8 pr-4 py-3 text-sm border border-[#E0DEDB] rounded-lg focus:outline-none focus:border-[#37322F] transition-colors"
            />
          </div>
          <p className="text-xs text-[#847971]">
            Set the price consumers will pay to unlock your content
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={!isConnected || status !== 'idle'}
            className="flex-1 px-6 py-3 text-sm font-medium text-white bg-[#37322F] rounded-full hover:bg-[#49423D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset]"
          >
            {!isConnected ? 'Connect Wallet to Upload' : 'Upload Content'}
          </button>
          {(formData.file || formData.title || formData.description) && (
            <button
              type="button"
              onClick={handleReset}
              className="px-6 py-3 text-sm font-medium text-[#37322F] bg-white border border-[#E0DEDB] rounded-full hover:bg-[#F7F5F3] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
