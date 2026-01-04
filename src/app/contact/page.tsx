'use client';

import { ContactForm, ContactInfo } from '@/components/contact';

/**
 * Contact Page
 * 
 * Provides a way for users to contact the platform team.
 * Features:
 * - Two-column layout (form + info)
 * - Success message display
 * - Error handling
 * 
 * Requirements: 7.1, 7.2, 7.4, 7.5
 */
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#F7F5F3] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1060px] mx-auto">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-serif text-[#37322F] mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-[#605A57] max-w-2xl mx-auto">
            Have questions or feedback? We&apos;d love to hear from you. 
            Fill out the form below or reach out through any of our channels.
          </p>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Contact Form - 60% width on desktop */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-[#E0DEDB] rounded-lg p-6 sm:p-8">
              <h2 className="text-2xl font-semibold text-[#37322F] mb-6">
                Send us a Message
              </h2>
              <ContactForm />
            </div>
          </div>

          {/* Contact Info - 40% width on desktop */}
          <div className="lg:col-span-2">
            <ContactInfo />
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <p className="text-sm text-[#847971]">
            By contacting us, you agree to our{' '}
            <a href="/terms" className="text-[#37322F] hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" className="text-[#37322F] hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
