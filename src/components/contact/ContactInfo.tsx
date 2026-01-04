'use client';

/**
 * Contact method interface
 */
interface ContactMethod {
  type: 'email' | 'twitter' | 'discord' | 'github';
  label: string;
  value: string;
  href: string;
}

/**
 * Contact methods data
 */
const contactMethods: ContactMethod[] = [
  {
    type: 'email',
    label: 'Email',
    value: 'support@unlock.example',
    href: 'mailto:support@unlock.example',
  },
  {
    type: 'twitter',
    label: 'Twitter',
    value: '@unlock_platform',
    href: 'https://twitter.com/unlock_platform',
  },
  {
    type: 'discord',
    label: 'Discord',
    value: 'Join our community',
    href: 'https://discord.gg/unlock',
  },
  {
    type: 'github',
    label: 'GitHub',
    value: 'View our code',
    href: 'https://github.com/unlock-platform',
  },
];

/**
 * ContactInfo Component
 * 
 * Displays alternative contact methods and support information.
 * Features:
 * - Alternative contact methods
 * - Social links
 * - Support description
 * 
 * Requirements: 7.2, 7.5
 */
export function ContactInfo() {
  return (
    <div className="space-y-6">
      {/* Support Description */}
      <div className="bg-white border border-[#E0DEDB] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#37322F] mb-3">
          Get in Touch
        </h3>
        <p className="text-sm text-[#605A57] leading-relaxed mb-4">
          Have questions about the platform? Need help with your content? 
          We&apos;re here to help! Our support team typically responds within 24 hours.
        </p>
        <p className="text-sm text-[#605A57] leading-relaxed">
          For urgent issues, please reach out via Discord where our community 
          and team members are most active.
        </p>
      </div>

      {/* Contact Methods */}
      <div className="bg-white border border-[#E0DEDB] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#37322F] mb-4">
          Other Ways to Reach Us
        </h3>
        <div className="space-y-4">
          {contactMethods.map((method) => (
            <a
              key={method.type}
              href={method.href}
              target={method.type !== 'email' ? '_blank' : undefined}
              rel={method.type !== 'email' ? 'noopener noreferrer' : undefined}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#F7F5F3] transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 bg-[#F7F5F3] rounded-full flex items-center justify-center group-hover:bg-[#E0DEDB] transition-colors">
                {method.type === 'email' && (
                  <svg className="w-5 h-5 text-[#37322F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                )}
                {method.type === 'twitter' && (
                  <svg className="w-5 h-5 text-[#37322F]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                )}
                {method.type === 'discord' && (
                  <svg className="w-5 h-5 text-[#37322F]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                )}
                {method.type === 'github' && (
                  <svg className="w-5 h-5 text-[#37322F]" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#37322F] mb-1">
                  {method.label}
                </p>
                <p className="text-sm text-[#605A57] group-hover:text-[#37322F] transition-colors">
                  {method.value}
                </p>
              </div>
              <svg className="w-5 h-5 text-[#847971] group-hover:text-[#37322F] transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Support Hours */}
      <div className="bg-[#F7F5F3] border border-[#E0DEDB] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#37322F] mb-3">
          Support Hours
        </h3>
        <div className="space-y-2 text-sm text-[#605A57]">
          <div className="flex justify-between">
            <span>Monday - Friday</span>
            <span className="font-medium text-[#37322F]">9:00 AM - 6:00 PM EST</span>
          </div>
          <div className="flex justify-between">
            <span>Saturday - Sunday</span>
            <span className="font-medium text-[#37322F]">Limited Support</span>
          </div>
        </div>
        <p className="text-xs text-[#847971] mt-4">
          Response times may vary during weekends and holidays
        </p>
      </div>
    </div>
  );
}
