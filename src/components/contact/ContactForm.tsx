'use client';

import { useState, useCallback } from 'react';

/**
 * Contact form data interface
 */
interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Props for ContactForm component
 */
interface ContactFormProps {
  /** Callback when form is submitted successfully */
  onSubmitSuccess?: () => void;
  /** Callback when form submission fails */
  onSubmitError?: (error: Error) => void;
}

/**
 * Initial form state
 */
const initialFormData: ContactFormData = {
  name: '',
  email: '',
  subject: '',
  message: '',
};

/**
 * ContactForm Component
 * 
 * Contact form matching the design system from frontend-sample.
 * Features:
 * - Form fields: name, email, subject, message
 * - Input styling matching design system
 * - Form validation
 * - Submit handler
 * 
 * Requirements: 7.1
 */
export function ContactForm({ onSubmitSuccess, onSubmitError }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<ContactFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Validate form fields
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<ContactFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  /**
   * Handle form submission
   * Requirements: 7.1, 7.4
   */
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Simulate API call - in production, this would send to a backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just log the form data
      console.log('Contact form submitted:', formData);
      
      setSubmitSuccess(true);
      setFormData(initialFormData);
      onSubmitSuccess?.();

      // Reset success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to send message');
      onSubmitError?.(error);
      setErrors({ message: 'Failed to send message. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, onSubmitSuccess, onSubmitError]);

  /**
   * Handle input change
   */
  const handleChange = useCallback((
    field: keyof ContactFormData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  return (
    <div className="w-full">
      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800 font-medium">
            Thank you for your message! We&apos;ll get back to you soon.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="name" className="block text-sm font-medium text-[#37322F]">
            Name *
          </label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className={`
              w-full px-4 py-3 text-sm border rounded-lg 
              focus:outline-none transition-colors
              ${errors.name 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-[#E0DEDB] focus:border-[#37322F]'
              }
            `}
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-[#37322F]">
            Email *
          </label>
          <input
            id="email"
            type="email"
            placeholder="your.email@example.com"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`
              w-full px-4 py-3 text-sm border rounded-lg 
              focus:outline-none transition-colors
              ${errors.email 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-[#E0DEDB] focus:border-[#37322F]'
              }
            `}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <label htmlFor="subject" className="block text-sm font-medium text-[#37322F]">
            Subject *
          </label>
          <input
            id="subject"
            type="text"
            placeholder="What is this about?"
            value={formData.subject}
            onChange={(e) => handleChange('subject', e.target.value)}
            className={`
              w-full px-4 py-3 text-sm border rounded-lg 
              focus:outline-none transition-colors
              ${errors.subject 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-[#E0DEDB] focus:border-[#37322F]'
              }
            `}
          />
          {errors.subject && (
            <p className="text-sm text-red-600">{errors.subject}</p>
          )}
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label htmlFor="message" className="block text-sm font-medium text-[#37322F]">
            Message *
          </label>
          <textarea
            id="message"
            placeholder="Tell us more about your inquiry..."
            value={formData.message}
            onChange={(e) => handleChange('message', e.target.value)}
            rows={6}
            className={`
              w-full px-4 py-3 text-sm border rounded-lg 
              focus:outline-none transition-colors resize-none
              ${errors.message 
                ? 'border-red-500 focus:border-red-500' 
                : 'border-[#E0DEDB] focus:border-[#37322F]'
              }
            `}
          />
          {errors.message && (
            <p className="text-sm text-red-600">{errors.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 text-sm font-medium text-white bg-[#37322F] rounded-full hover:bg-[#49423D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0px_0px_0px_2.5px_rgba(255,255,255,0.08)_inset]"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}
