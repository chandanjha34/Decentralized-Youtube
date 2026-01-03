'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchFromIPFS } from '@/lib/ipfs';
import { decrypt, base64ToBytes } from '@/lib/encryption';
import { type ContentType } from '@/types/content';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorMessage } from '@/components/ui/error-message';

/**
 * Props for ContentPlayer component
 */
export interface ContentPlayerProps {
  /** IPFS CID of the encrypted content */
  contentCID: string;
  /** Content type for rendering */
  contentType: ContentType;
  /** Base64-encoded decryption key */
  decryptionKey: string;
  /** Optional MIME type override */
  mimeType?: string;
}

/**
 * Player state for tracking loading and errors
 */
type PlayerState = 
  | { status: 'loading' }
  | { status: 'decrypting' }
  | { status: 'ready'; objectUrl: string }
  | { status: 'error'; message: string };

/**
 * Get MIME type from content type
 */
function getMimeType(contentType: ContentType, mimeTypeOverride?: string): string {
  if (mimeTypeOverride) return mimeTypeOverride;
  
  const mimeMap: Record<ContentType, string> = {
    video: 'video/mp4',
    audio: 'audio/mpeg',
    pdf: 'application/pdf',
    image: 'image/jpeg',
    article: 'text/markdown',
  };
  return mimeMap[contentType] || 'application/octet-stream';
}


/**
 * ContentPlayer Component
 * 
 * Fetches encrypted content from IPFS, decrypts it with the provided key,
 * and renders it based on the content type.
 * 
 * Supported content types:
 * - video: HTML5 video player
 * - audio: HTML5 audio player
 * - pdf: iframe viewer
 * - image: img tag
 * - article: Markdown/text renderer
 * 
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5
 */
export function ContentPlayer({
  contentCID,
  contentType,
  decryptionKey,
  mimeType: mimeTypeOverride,
}: ContentPlayerProps) {
  const [state, setState] = useState<PlayerState>({ status: 'loading' });
  const [articleContent, setArticleContent] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  // Cleanup object URL on unmount or when content changes
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [contentCID, decryptionKey]);

  // Fetch and decrypt content
  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      // Cleanup previous object URL
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      setState({ status: 'loading' });

      try {
        // Fetch encrypted content from IPFS
        const encryptedBuffer = await fetchFromIPFS(contentCID);
        
        if (cancelled) return;
        setState({ status: 'decrypting' });

        // Convert base64 key to Uint8Array
        const keyBytes = base64ToBytes(decryptionKey);
        
        // Decrypt content
        const encryptedContent = new Uint8Array(encryptedBuffer);
        const decryptedContent = await decrypt(encryptedContent, keyBytes);

        if (cancelled) return;

        // Handle article content specially (convert to text)
        if (contentType === 'article') {
          const textDecoder = new TextDecoder('utf-8');
          const text = textDecoder.decode(decryptedContent);
          setArticleContent(text);
          setState({ status: 'ready', objectUrl: '' });
          return;
        }

        // Create blob and object URL for media content
        const mimeType = getMimeType(contentType, mimeTypeOverride);
        // Create ArrayBuffer copy for Blob constructor compatibility
        const buffer = new ArrayBuffer(decryptedContent.length);
        new Uint8Array(buffer).set(decryptedContent);
        const blob = new Blob([buffer], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        setState({ status: 'ready', objectUrl });
      } catch (error) {
        if (cancelled) return;
        console.error('Content decryption failed:', error);
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to decrypt content',
        });
      }
    }

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [contentCID, contentType, decryptionKey, mimeTypeOverride, retryCount]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  // Render based on state
  if (state.status === 'loading') {
    return <LoadingState message="Fetching content from IPFS..." />;
  }

  if (state.status === 'decrypting') {
    return <LoadingState message="Decrypting content..." />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={handleRetry} />;
  }

  // Render content based on type
  switch (contentType) {
    case 'video':
      return <VideoPlayer src={state.objectUrl} />;
    case 'audio':
      return <AudioPlayer src={state.objectUrl} />;
    case 'pdf':
      return <PDFViewer src={state.objectUrl} />;
    case 'image':
      return <ImageViewer src={state.objectUrl} />;
    case 'article':
      return <ArticleViewer content={articleContent} />;
    default:
      return <ErrorState message={`Unsupported content type: ${contentType}`} />;
  }
}


/**
 * Loading state component
 */
function LoadingState({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/50">
      <LoadingSpinner size="lg" message={message} />
    </div>
  );
}

/**
 * Error state component
 * 
 * Validates: Requirements 10.4 - Decryption failure error message
 */
function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 p-4">
      <ErrorMessage
        type="decryption"
        message={message}
        onRetry={onRetry}
        showSuggestion={true}
        variant="card"
        className="max-w-md"
      />
    </div>
  );
}

/**
 * Video Player Component
 * 
 * HTML5 video player with controls for decrypted video content.
 * 
 * Validates: Requirements 7.5 - Render video content
 */
function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={src}
        controls
        autoPlay={false}
        playsInline
        className="max-w-full max-h-full w-full h-full object-contain"
        controlsList="nodownload"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}

/**
 * Audio Player Component
 * 
 * HTML5 audio player with controls and visual representation.
 * 
 * Validates: Requirements 7.5 - Render audio content
 */
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-purple-900/20 to-blue-900/20">
      <span className="text-8xl mb-8">🎵</span>
      <audio
        ref={audioRef}
        src={src}
        controls
        autoPlay={false}
        className="w-full max-w-md"
        controlsList="nodownload"
      >
        Your browser does not support the audio tag.
      </audio>
      <p className="text-sm text-muted-foreground mt-4">
        Audio content ready to play
      </p>
    </div>
  );
}

/**
 * PDF Viewer Component
 * 
 * Displays PDF content using an iframe.
 * 
 * Validates: Requirements 7.5 - Render PDF content
 */
function PDFViewer({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 bg-white">
      <iframe
        src={src}
        title="PDF Viewer"
        className="w-full h-full border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}

/**
 * Image Viewer Component
 * 
 * Displays decrypted image content.
 * 
 * Validates: Requirements 7.5 - Render image content
 */
function ImageViewer({ src }: { src: string }) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse text-4xl">🖼️</div>
        </div>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Decrypted content"
        className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}


/**
 * Article Viewer Component
 * 
 * Renders text/markdown content with basic formatting.
 * 
 * Validates: Requirements 7.5 - Render article content
 */
function ArticleViewer({ content }: { content: string }) {
  // Simple markdown-like rendering for basic formatting
  const renderContent = useCallback(() => {
    // Split content into paragraphs
    const paragraphs = content.split(/\n\n+/);
    
    return paragraphs.map((paragraph, index) => {
      // Check for headers
      if (paragraph.startsWith('# ')) {
        return (
          <h1 key={index} className="text-3xl font-bold mb-4 mt-6 first:mt-0">
            {paragraph.slice(2)}
          </h1>
        );
      }
      if (paragraph.startsWith('## ')) {
        return (
          <h2 key={index} className="text-2xl font-semibold mb-3 mt-5">
            {paragraph.slice(3)}
          </h2>
        );
      }
      if (paragraph.startsWith('### ')) {
        return (
          <h3 key={index} className="text-xl font-medium mb-2 mt-4">
            {paragraph.slice(4)}
          </h3>
        );
      }
      
      // Check for code blocks
      if (paragraph.startsWith('```')) {
        const codeContent = paragraph.replace(/^```\w*\n?/, '').replace(/```$/, '');
        return (
          <pre key={index} className="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm">
            <code>{codeContent}</code>
          </pre>
        );
      }
      
      // Check for bullet lists
      if (paragraph.match(/^[-*]\s/m)) {
        const items = paragraph.split(/\n/).filter(line => line.match(/^[-*]\s/));
        return (
          <ul key={index} className="list-disc list-inside my-4 space-y-1">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^[-*]\s/, '')}</li>
            ))}
          </ul>
        );
      }
      
      // Check for numbered lists
      if (paragraph.match(/^\d+\.\s/m)) {
        const items = paragraph.split(/\n/).filter(line => line.match(/^\d+\.\s/));
        return (
          <ol key={index} className="list-decimal list-inside my-4 space-y-1">
            {items.map((item, i) => (
              <li key={i}>{item.replace(/^\d+\.\s/, '')}</li>
            ))}
          </ol>
        );
      }
      
      // Check for blockquotes
      if (paragraph.startsWith('> ')) {
        return (
          <blockquote key={index} className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
            {paragraph.slice(2)}
          </blockquote>
        );
      }
      
      // Regular paragraph with inline formatting
      return (
        <p key={index} className="my-3 leading-relaxed">
          {renderInlineFormatting(paragraph)}
        </p>
      );
    });
  }, [content]);

  return (
    <div className="absolute inset-0 overflow-auto bg-background">
      <article className="max-w-3xl mx-auto p-6 md:p-8 prose prose-neutral dark:prose-invert">
        {renderContent()}
      </article>
    </div>
  );
}

/**
 * Render inline formatting (bold, italic, code, links)
 */
function renderInlineFormatting(text: string): React.ReactNode {
  // Split by formatting patterns and render accordingly
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  // Process inline code first
  while (remaining.length > 0) {
    // Match inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      // Add text before the match
      if (codeMatch.index > 0) {
        parts.push(
          <span key={key++}>{processEmphasis(remaining.slice(0, codeMatch.index))}</span>
        );
      }
      // Add the code
      parts.push(
        <code key={key++} className="bg-muted px-1.5 py-0.5 rounded text-sm">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
    } else {
      // No more code, process the rest for emphasis
      parts.push(<span key={key++}>{processEmphasis(remaining)}</span>);
      break;
    }
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

/**
 * Process bold and italic emphasis
 */
function processEmphasis(text: string): React.ReactNode {
  // Simple approach: just return the text with basic processing
  // For a full implementation, you'd want a proper markdown parser
  
  // Handle **bold**
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  if (boldParts.length > 1) {
    return boldParts.map((part, i) => 
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  }
  
  // Handle *italic*
  const italicParts = text.split(/\*([^*]+)\*/g);
  if (italicParts.length > 1) {
    return italicParts.map((part, i) => 
      i % 2 === 1 ? <em key={i}>{part}</em> : part
    );
  }
  
  return text;
}

export default ContentPlayer;
