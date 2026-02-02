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
        
        <div className="space-y-6 text-[#888] text-sm leading-relaxed">
          <p className="text-[#666] text-xs">Last updated: February 2, 2026</p>
          
          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Your Data, Your Control</h2>
            <p>
              Hansei is built with privacy as a core principle. We collect only what's necessary to provide the service, and we never sell your data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">What We Collect</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Voice recordings:</strong> Processed in real-time and immediately transcribed. Audio is not stored after transcription.</li>
              <li><strong>Tasks and ideas:</strong> Stored securely in your account to provide the service.</li>
              <li><strong>Email address:</strong> Used only for authentication and important service updates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Third-Party Services</h2>
            <p>We use the following services to operate Hansei:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong>Supabase:</strong> Database and authentication (EU-based)</li>
              <li><strong>OpenAI:</strong> Voice transcription (Whisper API)</li>
              <li><strong>Google AI:</strong> Task processing (Gemini)</li>
              <li><strong>Vercel:</strong> Hosting and deployment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Data Deletion</h2>
            <p>
              You can delete your account and all associated data at any time from your settings. We'll process deletion requests within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Contact</h2>
            <p>
              Questions? Reach out at{' '}
              <a href="https://x.com/RamonPrietoX" className="text-[#6b8f71] hover:underline" target="_blank" rel="noopener noreferrer">
                @RamonPrietoX
              </a>
            </p>
          </section>
        </div>
      </article>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-[#181818]">
        <div className="max-w-3xl mx-auto text-center text-xs text-[#444]">
          <Link href="/" className="hover:text-[#666] transition-colors">← Back to home</Link>
        </div>
      </footer>
    </main>
  );
}
