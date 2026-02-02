import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-3xl font-light mb-8 text-[#f0f0f0]">Terms of Service</h1>
        
        <div className="space-y-6 text-[#888] text-sm leading-relaxed">
          <p className="text-[#666] text-xs">Last updated: February 2, 2026</p>
          
          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">The Basics</h2>
            <p>
              By using Hansei, you agree to these terms. If you don't agree, please don't use the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">What You Can Do</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Use Hansei for personal productivity and task management</li>
              <li>Capture voice notes and ideas</li>
              <li>Create, edit, and manage your tasks</li>
              <li>Export your data at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">What You Can't Do</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Use the service for illegal activities</li>
              <li>Attempt to hack, reverse engineer, or disrupt the service</li>
              <li>Share your account with others</li>
              <li>Resell or redistribute the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Your Content</h2>
            <p>
              Your tasks, ideas, and voice recordings belong to you. We don't claim ownership of your content. We only use it to provide and improve the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Service Availability</h2>
            <p>
              We strive for 99.9% uptime, but we can't guarantee the service will always be available. We may also modify or discontinue features with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Beta Status</h2>
            <p>
              Hansei is currently in beta. This means features may change, and there might be bugs. We appreciate your patience and feedback as we improve.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-[#c8c8c8] mb-3">Changes to Terms</h2>
            <p>
              We may update these terms. We'll notify you of significant changes via email or in-app notification.
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
