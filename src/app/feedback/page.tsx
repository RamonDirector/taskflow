'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

export default function FeedbackPage() {
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">¡Gracias por tu feedback!</h1>
          <p className="text-gray-500 mb-6">Tu opinión nos ayuda a construir un mejor producto.</p>
          <a href="/app" className="inline-flex items-center gap-2 px-6 py-3 bg-[#6b8f71] hover:bg-[#5a7d60] text-white font-medium rounded-xl transition-all">
            Volver a la app
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Feedback Beta Tester</h1>
          <p className="text-gray-500">2 minutos · Tu opinión es oro para nosotros</p>
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
            {/* Frecuencia */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ¿Cuántas veces usaste Hansei esta semana?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: '0', label: 'No la usé' },
                  { value: '1-2', label: '1-2 veces' },
                  { value: '3-5', label: '3-5 veces' },
                  { value: '6-10', label: '6-10 veces' },
                  { value: '10+', label: 'Más de 10' },
                ].map((opt) => (
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

            {/* Facilidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ¿Qué tan fácil fue grabar tu primera idea?
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
                <span>Muy difícil</span>
                <span>Muy fácil</span>
              </div>
            </div>

            {/* Clasificación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ¿La clasificación automática fue correcta?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'always', label: 'Siempre o casi siempre' },
                  { value: 'sometimes', label: 'A veces sí, a veces no' },
                  { value: 'rarely', label: 'Casi nunca' },
                  { value: 'didnt_notice', label: 'No me fijé' },
                ].map((opt) => (
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
              Siguiente
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué fue lo MÁS frustrante o confuso?
              </label>
              <textarea
                value={form.most_frustrating}
                onChange={(e) => setForm({ ...form, most_frustrating: e.target.value })}
                placeholder="Cuéntanos tu experiencia..."
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué fue lo que MÁS te gustó?
              </label>
              <textarea
                value={form.most_liked}
                onChange={(e) => setForm({ ...form, most_liked: e.target.value })}
                placeholder="Lo mejor de la app..."
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Qué feature te falta para usarla todos los días?
              </label>
              <textarea
                value={form.missing_feature}
                onChange={(e) => setForm({ ...form, missing_feature: e.target.value })}
                placeholder="Esa cosa que haría todo mejor..."
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-gray-200 text-gray-600 font-medium rounded-xl transition-all hover:bg-gray-50"
              >
                Atrás
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-[#6b8f71] hover:bg-[#5a7d60] text-white font-medium rounded-xl transition-all"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="space-y-6">
            {/* NPS */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                ¿Recomendarías Hansei a un amigo?
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
                <span>Nunca</span>
                <span>Seguro que sí</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Algo más que quieras decirnos?
              </label>
              <textarea
                value={form.additional_comments}
                onChange={(e) => setForm({ ...form, additional_comments: e.target.value })}
                placeholder="Opcional..."
                className="w-full p-4 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#6b8f71]/20 focus:border-[#6b8f71]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 border border-gray-200 text-gray-600 font-medium rounded-xl transition-all hover:bg-gray-50"
              >
                Atrás
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.nps || loading}
                className="flex-1 py-4 bg-[#6b8f71] hover:bg-[#5a7d60] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all"
              >
                {loading ? 'Enviando...' : 'Enviar feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
