import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8]">
      {/* Nav */}
      <nav className="px-8 py-6 flex items-center justify-between max-w-3xl mx-auto w-full">
        <Link href="/" className="text-lg font-medium tracking-wide text-[#c8c8c8] hover:text-[#e8e8e8] transition-colors">
          hansei
        </Link>
      </nav>

      {/* Content */}
      <article className="px-8 py-12 max-w-3xl mx-auto">
        <h1 className="text-3xl font-light mb-8 text-[#f0f0f0]">Privacy Policy</h1>
        
        <div className="space-y-8 text-[#888] text-sm leading-relaxed">
          <p className="text-[#666] text-xs">Last updated: February 7, 2026</p>
          
          <p className="text-[#aaa]">
            Hansei (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our application.
          </p>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">1. Information We Collect</h2>
            
            <h3 className="text-sm font-medium text-[#999] mt-4 mb-2">Voice Recordings</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>We temporarily process voice recordings to convert speech to text</li>
              <li>Audio is processed in real-time and <strong>not permanently stored</strong> on our servers</li>
              <li>Transcriptions are stored locally on your device and in your private account</li>
            </ul>
            
            <h3 className="text-sm font-medium text-[#999] mt-4 mb-2">Account Information</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Email address (for authentication)</li>
              <li>Display name (optional)</li>
              <li>Preferences and settings</li>
            </ul>
            
            <h3 className="text-sm font-medium text-[#999] mt-4 mb-2">Content You Create</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Tasks, ideas, and dreams you capture</li>
              <li>Categories and tags you assign</li>
              <li>Due dates and priorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">2. How We Use Your Information</h2>
            <p className="mb-3">We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide and improve the Hansei service</li>
              <li>Convert your voice recordings to text</li>
              <li>Classify and organize your captured content using AI</li>
              <li>Sync your data across devices</li>
            </ul>
            <p className="mt-4 text-[#6b8f71]">
              <strong>We do NOT</strong> sell your personal data, use your content for advertising, or share your tasks/ideas with anyone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">3. Third-Party Services</h2>
            <p className="mb-3">We use the following services to operate Hansei:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#222]">
                    <th className="py-2 pr-4 text-[#999]">Service</th>
                    <th className="py-2 pr-4 text-[#999]">Purpose</th>
                    <th className="py-2 text-[#999]">Data Shared</th>
                  </tr>
                </thead>
                <tbody className="text-[#666]">
                  <tr className="border-b border-[#181818]">
                    <td className="py-2 pr-4">OpenAI Whisper</td>
                    <td className="py-2 pr-4">Speech-to-text</td>
                    <td className="py-2">Audio (temporarily)</td>
                  </tr>
                  <tr className="border-b border-[#181818]">
                    <td className="py-2 pr-4">OpenAI GPT</td>
                    <td className="py-2 pr-4">Content classification</td>
                    <td className="py-2">Text content</td>
                  </tr>
                  <tr className="border-b border-[#181818]">
                    <td className="py-2 pr-4">Supabase</td>
                    <td className="py-2 pr-4">Auth & database</td>
                    <td className="py-2">Account data, content</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Vercel</td>
                    <td className="py-2 pr-4">Hosting</td>
                    <td className="py-2">Anonymized analytics</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-[#555]">
              All third-party providers are GDPR-compliant.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">4. Data Storage & Security</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Your data is encrypted in transit (TLS 1.3) and at rest (AES-256)</li>
              <li>We use industry-standard security practices</li>
              <li>Access to production systems is strictly limited</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">5. Your Rights (GDPR & CCPA)</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Access</strong> — Request a copy of your data</li>
              <li><strong>Rectification</strong> — Correct inaccurate data</li>
              <li><strong>Erasure</strong> — Delete your account and all associated data</li>
              <li><strong>Portability</strong> — Export your data in a standard format</li>
              <li><strong>Withdraw consent</strong> — Stop using the service at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">6. Data Retention</h2>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Active account data: Retained while your account is active</li>
              <li>Deleted accounts: Data permanently removed within 30 days</li>
              <li>Voice recordings: Processed in real-time, never stored</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">7. Children&apos;s Privacy</h2>
            <p>
              Hansei is not intended for children under 13. We do not knowingly collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any significant changes via email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">9. Contact Us</h2>
            <p>
              Questions about this Privacy Policy? Contact us at{' '}
              <a href="mailto:privacy@hansei.app" className="text-[#6b8f71] hover:underline">
                privacy@hansei.app
              </a>
              {' '}or{' '}
              <a href="https://x.com/RamonPrietoX" className="text-[#6b8f71] hover:underline" target="_blank" rel="noopener noreferrer">
                @RamonPrietoX
              </a>
            </p>
          </section>
        </div>
      </article>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-[#181818]">
        <div className="max-w-3xl mx-auto flex justify-between items-center text-xs text-[#444]">
          <Link href="/" className="hover:text-[#666] transition-colors">← Back to home</Link>
          <Link href="/terms" className="hover:text-[#666] transition-colors">Terms of Service</Link>
        </div>
      </footer>
    </main>
  );
}
