'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
};

// Animated Section Component
function AnimatedSection({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={fadeInUp}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null);
  
  // Parallax for hero
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Fetch real waitlist count on mount
  useEffect(() => {
    fetch('/api/waitlist')
      .then(res => res.json())
      .then(data => {
        if (data.count && data.count > 0) {
          setWaitlistCount(data.count);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.count) {
        setWaitlistCount(data.count);
      }
      setSubmitted(true);
    } catch {
      // Handle error silently
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8e8e8] selection:bg-[#3d5a45]/40 overflow-x-hidden">
      
      {/* Gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-[#1a2f1c]/30 via-transparent to-transparent blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-gradient-radial from-[#1c2a1e]/20 via-transparent to-transparent blur-3xl" />
      </div>
      
      {/* Subtle grain texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02]" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")'}} />

      {/* Nav */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 px-8 py-6 flex items-center justify-between max-w-5xl mx-auto w-full"
      >
        <span className="text-lg font-medium tracking-wide text-[#c8c8c8]">
          hansei
        </span>
        <Link 
          href="/login"
          className="text-sm text-[#888] hover:text-[#c8c8c8] transition-colors duration-300"
        >
          Sign in
        </Link>
      </motion.nav>

      {/* Hero */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative z-10 flex flex-col items-center justify-center px-8 pt-20 pb-32 text-center"
      >
        <div className="max-w-3xl mx-auto">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#2a2a2a] bg-[#111]/50 backdrop-blur-sm mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-[#6b8f71] animate-pulse" />
            <span className="text-xs text-[#888]">Now in private beta</span>
          </motion.div>
          
          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-[3rem] sm:text-[4rem] md:text-[5rem] font-light leading-[1.05] mb-6 tracking-[-0.03em] text-[#f0f0f0]"
          >
            Think it.
            <br />
            <span className="bg-gradient-to-r from-[#6b8f71] via-[#8fb396] to-[#6b8f71] bg-clip-text text-transparent">Say it.</span>
            <br />
            Do it.
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-lg sm:text-xl text-[#777] mb-12 max-w-lg mx-auto leading-relaxed font-light"
          >
            Capture your thoughts in 2 seconds. AI turns them into action plans you'll actually complete.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            {!submitted ? (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-5 py-4 rounded-xl border border-[#2a2a2a] bg-[#111]/80 backdrop-blur-sm text-[#e8e8e8] placeholder-[#555] focus:border-[#3d5a45] focus:outline-none focus:ring-2 focus:ring-[#3d5a45]/20 transition-all duration-300 text-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#3d5a45] to-[#4a6b52] hover:from-[#4a6b52] hover:to-[#5a7d62] text-[#e8e8e8] text-sm font-medium transition-all duration-300 disabled:opacity-50 whitespace-nowrap shadow-lg shadow-[#3d5a45]/20 hover:shadow-xl hover:shadow-[#3d5a45]/30 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  ) : waitlistCount ? `Join ${waitlistCount} others` : 'Get early access'}
                </button>
              </form>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 px-6 py-4 rounded-xl border border-[#3d5a45]/30 bg-[#3d5a45]/10 text-[#6b8f71] text-sm inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                You're on the list. We'll be in touch soon.
              </motion.div>
            )}
          </motion.div>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="text-xs text-[#555]"
          >
            Beta spots limited · No credit card required
          </motion.p>
        </div>
      </motion.section>

      {/* App Preview / Demo */}
      <AnimatedSection className="relative z-10 px-8 pb-32">
        <div className="max-w-2xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden border border-[#1a1a1a] bg-gradient-to-b from-[#111] to-[#0a0a0a] shadow-2xl shadow-black/50">
            {/* Phone mockup frame */}
            <div className="aspect-[9/16] sm:aspect-video relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#3d5a45] to-[#2a3d2e] flex items-center justify-center shadow-lg shadow-[#3d5a45]/30">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                    </svg>
                  </div>
                  <p className="text-[#666] text-sm">Demo video coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* Features */}
      <section className="relative z-10 px-8 py-32">
        <div className="max-w-5xl mx-auto">
          <AnimatedSection className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.3em] text-[#555] mb-4">Features</p>
            <h2 className="text-3xl sm:text-4xl font-light text-[#e8e8e8]">
              From chaos to clarity
            </h2>
          </AnimatedSection>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                ),
                title: "2-Second Capture",
                description: "One tap. Speak your mind. Done. No typing, no friction, no lost thoughts."
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: "AI-Powered Plans",
                description: "Your rambling becomes structured action plans. Ideas become tasks with clear next steps."
              },
              {
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                ),
                title: "Actually Get Done",
                description: "Stop collecting ideas. Start completing them. Built for action, not accumulation."
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="group p-8 rounded-2xl border border-[#1a1a1a] bg-gradient-to-b from-[#111]/50 to-transparent hover:border-[#2a2a2a] hover:bg-[#111]/80 transition-all duration-500"
              >
                <div className="w-12 h-12 mb-6 rounded-xl bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#2a2a2a] flex items-center justify-center text-[#6b8f71] group-hover:border-[#3d5a45]/50 group-hover:shadow-lg group-hover:shadow-[#3d5a45]/10 transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-medium mb-3 text-[#e8e8e8]">{feature.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* How it works */}
      <section className="relative z-10 px-8 py-32">
        <div className="max-w-4xl mx-auto">
          <AnimatedSection className="text-center mb-20">
            <p className="text-xs uppercase tracking-[0.3em] text-[#555] mb-4">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-light text-[#e8e8e8]">
              Three steps to clarity
            </h2>
          </AnimatedSection>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-12 md:gap-8"
          >
            {[
              { num: "01", title: "Capture", desc: "Tap the mic, brain dump everything on your mind. No structure needed." },
              { num: "02", title: "Process", desc: "AI separates tasks from ideas, creates your personalized action plan." },
              { num: "03", title: "Execute", desc: "Clear next steps. No more wondering what to do first." }
            ].map((step, i) => (
              <motion.div 
                key={i} 
                variants={fadeInUp}
                className="text-center relative"
              >
                {/* Connecting line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-6 left-[60%] w-[80%] h-px bg-gradient-to-r from-[#2a2a2a] to-transparent" />
                )}
                <div className="w-12 h-12 mx-auto mb-6 rounded-full border border-[#2a2a2a] bg-[#111] flex items-center justify-center relative z-10">
                  <span className="text-[#6b8f71] text-sm font-light">{step.num}</span>
                </div>
                <h3 className="text-lg font-medium mb-3 text-[#c8c8c8]">{step.title}</h3>
                <p className="text-[#666] text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* Problem / Quote */}
      <section className="relative z-10 px-8 py-32">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <p className="text-2xl sm:text-3xl font-light text-[#888] leading-relaxed mb-8">
            "Ideas hit you at the worst moments — walking, showering, half asleep. 
            <span className="text-[#c8c8c8]"> By the time you find an app, they're gone.</span>"
          </p>
          <div className="flex items-center justify-center gap-4 text-sm text-[#555]">
            <div className="h-px w-12 bg-[#333]" />
            <span>Average capture time: <span className="text-[#6b8f71] font-medium">2 seconds</span></span>
            <div className="h-px w-12 bg-[#333]" />
          </div>
        </AnimatedSection>
      </section>

      {/* Visual divider */}
      <div className="max-w-5xl mx-auto px-8">
        <div className="h-px bg-gradient-to-r from-transparent via-[#222] to-transparent" />
      </div>

      {/* Audience */}
      <section className="relative z-10 px-8 py-20">
        <AnimatedSection className="max-w-3xl mx-auto">
          <p className="text-center text-xs uppercase tracking-[0.3em] text-[#555] mb-8">Built for</p>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-[#444]">
            {['Founders', 'Creators', 'Overthinkers', 'ADHD minds', 'Busy parents', 'Side hustlers'].map((audience, i) => (
              <motion.span 
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="hover:text-[#6b8f71] transition-colors duration-300 cursor-default"
              >
                {audience}
              </motion.span>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 px-8 py-32">
        <AnimatedSection className="max-w-md mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-light mb-4 text-[#e8e8e8]">
            Stop losing ideas.
          </h2>
          <p className="text-xl text-[#6b8f71] mb-10">Start executing them.</p>
          
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 rounded-xl border border-[#2a2a2a] bg-[#111]/80 backdrop-blur-sm text-[#e8e8e8] placeholder-[#555] focus:border-[#3d5a45] focus:outline-none focus:ring-2 focus:ring-[#3d5a45]/20 transition-all duration-300 text-sm text-center"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-[#3d5a45] to-[#4a6b52] hover:from-[#4a6b52] hover:to-[#5a7d62] text-[#e8e8e8] text-sm font-medium transition-all duration-300 disabled:opacity-50 shadow-lg shadow-[#3d5a45]/20 hover:shadow-xl hover:shadow-[#3d5a45]/30"
              >
                {loading ? '...' : 'Get early access →'}
              </button>
            </form>
          ) : (
            <div className="px-6 py-4 rounded-xl border border-[#3d5a45]/30 bg-[#3d5a45]/10 text-[#6b8f71] text-sm inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              You're in.
            </div>
          )}
        </AnimatedSection>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-8 py-8 border-t border-[#181818]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#444]">
          <span>© 2026 hansei</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#666] transition-colors duration-300">Privacy</Link>
            <Link href="/terms" className="hover:text-[#666] transition-colors duration-300">Terms</Link>
            <a href="https://x.com/RamonPrietoX" target="_blank" rel="noopener noreferrer" className="hover:text-[#666] transition-colors duration-300">Twitter</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
