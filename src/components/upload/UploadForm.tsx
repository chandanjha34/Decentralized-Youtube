'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ErrorMessage, getErrorType, getUserFriendlyMessage } from '@/components/ui/error-message';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UploadProgress } from './UploadProgress';
import { useContentUpload } from '@/hooks/useContentUpload';
import {
  UploadFormData,
  UploadStatus,
  Category,
  CATEGORIES,
  ALL_ACCEPTED_TYPES,
  THUMBNAIL_ACCEPTED_TYPES,
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
 * Provides a complete upload form for creators to upload content with:
 * - File dropzone for content
 * - Thumbnail upload (optional)
 * - Title, description, category dropdown, tags input, price input
 * 
 * Requirements: 3.1, 3.2
 */
export function UploadForm({ onUploadComplete, onUploadError }: UploadFormProps) {
  const { address, isConnected } = useAccount();
  const [formData, setFormData] = useState<UploadFormData>(initialFormData);
  const [localStatus, setLocalStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [thumbnailDragActive, setThumbnailDragActive] = useState(false);
  const [uploadedContentId, setUploadedContentId] = useState<string | null>(null);
  
  // Track metadata CIDs for transaction success handling
  const [pendingUpload, setPendingUpload] = useState<{
    metadataCID: string;
    contentCID: string;
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
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
  
  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && txHash && pendingUpload) {
      const result = handleTransactionSuccess(
        pendingUpload.metadataCID,
        pendingUpload.contentCID,
        txHash
      );
      setUploadedContentId(result.contentId);
      setFormData(initialFormData);
      onUploadComplete?.(result.contentId);
    }
  }, [isConfirmed, txHash, pendingUpload, handleTransactionSuccess, onUploadComplete]);
  
  // Handle write errors
  useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message || 'Transaction failed';
      setError(errorMessage);
      setLocalStatus('error');
      onUploadError?.(new Error(errorMessage));
    }
  }, [writeError, onUploadError]);
  
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
   * Handle thumbnail selection
   */
  const handleThumbnailSelect = useCallback((file: File | null) => {
    if (!file) return;
    
    // Validate file type
    if (!THUMBNAIL_ACCEPTED_TYPES.includes(file.type)) {
      setError('Thumbnail must be JPEG, PNG, or WebP image.');
      return;
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZES.thumbnail) {
      setError(`Thumbnail too large. Maximum size is ${formatFileSize(MAX_FILE_SIZES.thumbnail)}.`);
      return;
    }
    
    setError(null);
    setFormData(prev => ({ ...prev, thumbnail: file }));
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
   * Handle drag events for thumbnail dropzone
   */
  const handleThumbnailDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setThumbnailDragActive(true);
    } else if (e.type === 'dragleave') {
      setThumbnailDragActive(false);
    }
  }, []);

  /**
   * Handle drop for thumbnail
   */
  const handleThumbnailDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setThumbnailDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleThumbnailSelect(e.dataTransfer.files[0]);
    }
  }, [handleThumbnailSelect]);

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
   * Wires up the complete upload flow:
   * Generate AES key → Encrypt file → Upload to Pinata → Create metadata JSON → Upload metadata → Call registerContent
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
    setUploadedContentId(null);
    resetUpload();
  }, [resetUpload]);

  // Show progress indicator during upload
  if (status !== 'idle' && status !== 'error') {
    return (
      <UploadProgress 
        status={status} 
        onReset={handleReset}
        contentTitle={formData.title}
        contentId={uploadedContentId || txHash || undefined}
        errorMessage={error || undefined}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Content</CardTitle>
        <CardDescription>
          Upload your content to monetize it with pay-per-view access.
          Your file will be encrypted client-side before upload.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <ErrorMessage
              type={getErrorType(error)}
              message={getUserFriendlyMessage(error)}
              onDismiss={() => setError(null)}
              showSuggestion={true}
              variant="banner"
            />
          )}

          {/* Content File Dropzone */}
          <div className="space-y-2">
            <Label htmlFor="content-file">Content File *</Label>
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${formData.file ? 'bg-muted/50' : 'hover:border-primary/50'}
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
                  <p className="font-medium">{formData.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(formData.file.size)} • {getContentTypeFromMime(formData.file.type)}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, file: null }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports video, audio, PDF, images, and text files (max {formatFileSize(MAX_FILE_SIZES.content)})
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Thumbnail Upload (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail">Thumbnail (Optional)</Label>
            <div
              className={`
                border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
                transition-colors
                ${thumbnailDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                ${formData.thumbnail ? 'bg-muted/50' : 'hover:border-primary/50'}
              `}
              onDragEnter={handleThumbnailDrag}
              onDragLeave={handleThumbnailDrag}
              onDragOver={handleThumbnailDrag}
              onDrop={handleThumbnailDrop}
              onClick={() => thumbnailInputRef.current?.click()}
            >
              <input
                ref={thumbnailInputRef}
                type="file"
                id="thumbnail"
                className="hidden"
                accept={THUMBNAIL_ACCEPTED_TYPES.join(',')}
                onChange={(e) => handleThumbnailSelect(e.target.files?.[0] || null)}
              />
              {formData.thumbnail ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm">{formData.thumbnail.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, thumbnail: null }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add a thumbnail image (JPEG, PNG, WebP)
                </p>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter a title for your content"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your content..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              maxLength={1000}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value: Category) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (up to 10)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Add a tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                maxLength={30}
                disabled={formData.tags.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addTag}
                disabled={!tagInput.trim() || formData.tags.length >= 10}
              >
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => removeTag(tag)}
                  >
                    {tag} ×
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Price (USDC) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.priceUSDC}
                onChange={(e) => setFormData(prev => ({ ...prev, priceUSDC: e.target.value }))}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set the price consumers will pay to unlock your content
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={!isConnected || status !== 'idle'}
            >
              {!isConnected ? 'Connect Wallet to Upload' : 'Upload Content'}
            </Button>
            {(formData.file || formData.title || formData.description) && (
              <Button type="button" variant="outline" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
