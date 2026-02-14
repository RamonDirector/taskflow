'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useLocale } from '@/lib/i18n';

// Translations for feedback-specific content (not in global i18n to keep it lean)
const feedbackContent = {
  en: {
    subtitle: '2 minutes · Your opinion is gold to us',
    freq_label: 'How many times did you use Hansei this week?',
    freq_opts: [
      { value: '0', label: "Didn't use it" },
      { value: '1-2', label: '1-2 times' },
      { value: '3-5', label: '3-5 times' },
      { value: '6-10', label: '6-10 times' },
      { value: '10+', label: 'More than 10' },
    ],
    ease_label: 'How easy was it to record your first idea?',
    ease_low: 'Very hard',
    ease_high: 'Very easy',
    class_label: 'Was the automatic classification correct?',
    class_opts: [
      { value: 'always', label: 'Always or almost always' },
      { value: 'sometimes', label: 'Sometimes yes, sometimes no' },
      { value: 'rarely', label: 'Almost never' },
      { value: 'didnt_notice', label: "Didn't notice" },
    ],
    frust_label: 'What was the MOST frustrating or confusing?',
    liked_label: 'What did you like MOST?',
    missing_label: 'What feature would make you use it every day?',
    nps_label: 'Would you recommend Hansei to a friend?',
    nps_low: 'Never',
    nps_high: 'Definitely',
    comments_label: 'Anything else you want to tell us?',
    next: 'Next',
    back: 'Back',
    thank_desc: 'Your opinion helps us build a better product.',
    back_to_app: 'Back to the app',
  },
  es: {
    subtitle: '2 minutos · Tu opinión es oro para nosotros',
    freq_label: '¿Cuántas veces usaste Hansei esta semana?',
    freq_opts: [
      { value: '0', label: 'No la usé' },
      { value: '1-2', label: '1-2 veces' },
      { value: '3-5', label: '3-5 veces' },
      { value: '6-10', label: '6-10 veces' },
      { value: '10+', label: 'Más de 10' },
    ],
    ease_label: '¿Qué tan fácil fue grabar tu primera idea?',
    ease_low: 'Muy difícil',
    ease_high: 'Muy fácil',
    class_label: '¿La clasificación automática fue correcta?',
    class_opts: [
      { value: 'always', label: 'Siempre o casi siempre' },
      { value: 'sometimes', label: 'A veces sí, a veces no' },
      { value: 'rarely', label: 'Casi nunca' },
      { value: 'didnt_notice', label: 'No me fijé' },
    ],
    frust_label: '¿Qué fue lo MÁS frustrante o confuso?',
    liked_label: '¿Qué fue lo que MÁS te gustó?',
    missing_label: '¿Qué feature te falta para usarla todos los días?',
    nps_label: '¿Recomendarías Hansei a un amigo?',
    nps_low: 'Nunca',
    nps_high: 'Seguro que sí',
    comments_label: '¿Algo más que quieras decirnos?',
    next: 'Siguiente',
    back: 'Atrás',
    thank_desc: 'Tu opinión nos ayuda a construir un mejor producto.',
    back_to_app: 'Volver a la app',
  },
};

export default function FeedbackPage() {
  const { locale, t } = useLocale();
  const fc = feedbackContent[locale];
  const ft = t.feedback;

  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    usage_frequency: '',
    ease_of_capture: 0,
    classification_accuracy: '',
    most_frustrating: '',
    most_liked: '',
    missing_feature: '',
    nps: 0,
    additional_comments: '',
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('beta_feedback').insert({
        user_id: user?.id,
        email: user?.email,
        ...form,
      });
      
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#f8faf8] via-white to-[#f0f5f0] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[#6b8f71]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#6b8f71]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{ft.thank_you}</h1>
          <p className="text-gray-500 mb-6">{fc.thank_desc}</p>
          <a href="/app" className="inline-flex items-center gap-2 px-6 py-3 bg-[#6b8f71] hover:bg-[#5a7d60] text-white font-medium rounded-xl transition-all">
            {fc.back_to_app}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#f8faf8] via-white to-[#f0f5f0] py-12 px-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Image
            src="/icon-192-transparent.png"
            alt="Hansei"
            width={48}
            height={48}
            className="rounded-xl mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{ft.title}</h1>
          <p className="text-gray-500">{fc.subtitle}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-1 flex-1 rounded-full transition-all ${step >= s ? 'bg-[#6b8f71]' : 'bg-gray-200'}`} 
            />
          ))}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {fc.freq_label}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {fc.freq_opts.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, usage_frequency: opt.value })}
                    className={`p-3 rounded-xl border text-sm transition-all ${
                      form.usage_frequency === opt.value
                        ? 'border-[#6b8f71] bg-[#6b8f71]/5 text-[#6b8f71]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {fc.ease_label}
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setForm({ ...form, ease_of_capture: n })}
                    className={`flex-1 p-3 rounded-xl border text-sm transition-all ${
                      form.ease_of_capture === n
                        ? 'border-[#6b8f71] bg-[#6b8f71]/5 text-[#6b8f71]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>{fc.ease_low}</span>
                <span>{fc.ease_high}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {fc.class_label}
              </label>
              <div className="space-y-2">
                {fc.class_opts.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, classification_accuracy: opt.value })}
                    className={`w-full p-3 rounded-xl border text-sm text-left transition-all ${
                      form.classification_accuracy === opt.value
                        ? 'border-[#6b8f71] bg-[#6b8f71]/5 text-[#6b8f71]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.usage_frequency || !form.ease_of_capture || !form.classification_accuracy}
              className="w-full py-4 bg-[#6b8f71] hover:bg-[#5a7d60] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
            >
              {fc.next}
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fc.frust_label}
              </label>
              <textarea
                value={form.most_frustrating}
                onChange={(e) => setForm({ ...form, most_frustrating: e.target.value })}
                placeholder={ft.experience_placeholder}
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fc.liked_label}
              </label>
              <textarea
                value={form.most_liked}
                onChange={(e) => setForm({ ...form, most_liked: e.target.value })}
                placeholder={ft.best_placeholder}
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fc.missing_label}
              </label>
              <textarea
                value={form.missing_feature}
                onChange={(e) => setForm({ ...form, missing_feature: e.target.value })}
                placeholder={ft.improve_placeholder}
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-gray-200 text-gray-600 font-medium rounded-xl transition-all hover:bg-gray-50"
              >
                {fc.back}
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-[#6b8f71] hover:bg-[#5a7d60] text-white font-medium rounded-xl transition-all"
              >
                {fc.next}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {fc.nps_label}
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setForm({ ...form, nps: n })}
                    className={`flex-1 py-3 rounded-lg border text-sm transition-all ${
                      form.nps === n
                        ? 'border-[#6b8f71] bg-[#6b8f71] text-white'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
                <span>{fc.nps_low}</span>
                <span>{fc.nps_high}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {fc.comments_label}
              </label>
              <textarea
                value={form.additional_comments}
                onChange={(e) => setForm({ ...form, additional_comments: e.target.value })}
                placeholder={ft.email_placeholder}
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 border border-gray-200 text-gray-600 font-medium rounded-xl transition-all hover:bg-gray-50"
              >
                {fc.back}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.nps || loading}
                className="flex-1 py-4 bg-[#6b8f71] hover:bg-[#5a7d60] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
              >
                {loading ? ft.submitting : ft.submit}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
