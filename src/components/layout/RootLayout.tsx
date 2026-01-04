import { Navigation } from './Navigation';
import { Footer } from './Footer';

/**
 * RootLayout Component
 * 
 * Wraps page content with Navigation and Footer.
 * Adds vertical border lines on container edges.
 * Sets max-width container (1060px).
 * 
 * Validates: Requirements 3.7
 */

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      {/* Main Content with Vertical Border Lines */}
      <main className="flex-1 relative">
        {/* Vertical Border Lines */}
        <div className="fixed left-0 top-0 bottom-0 w-px bg-[rgba(55,50,47,0.12)] pointer-events-none hidden lg:block" />
        <div className="fixed right-0 top-0 bottom-0 w-px bg-[rgba(55,50,47,0.12)] pointer-events-none hidden lg:block" />
        
        {/* Content Container */}
        <div className="max-w-container mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
