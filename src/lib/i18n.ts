export type Locale = 'en' | 'es';

const translations = {
  en: {
    onboarding: {
      welcome_title: "Hi! I'm Kai",
      welcome_subtitle: "Your companion to capture and execute ideas",
      name_title: "What's your name?",
      name_placeholder: "Type your name...",
      what_capture_title: "What do you usually capture?",
      what_capture_options: ['Ideas', 'Tasks', 'Notes', 'Lists', 'Thoughts', 'Dreams'],
      when_ideas_title: "When do ideas come to you?",
      when_ideas_options: ['Walking', 'Shower', 'Bed', 'Morning', 'Exercise', 'Random'],
      complete_title: "All set",
      complete_title_name: "All set, {name}!",
      start_button: "Get started",
      next_button: "Next",
      listening: "Listening",
      speak_naturally: "Speak naturally, like you're telling a friend",
      write_here: "Or type it here...",
      language_title: "Choose your language",
      language_subtitle: "You can change this later",
    },
    kai_guide: {
      title: "Here's how to start",
      message: "Hold the mic and tell me what's on your mind today. Tasks, ideas, dreams — I'll organize everything for you.",
      cta: "Try it now"
    }
  },
  es: {
    onboarding: {
      welcome_title: "¡Hola! Soy Kai",
      welcome_subtitle: "Tu compañero para capturar y ejecutar ideas",
      name_title: "¿Y tú, cómo te llamas?",
      name_placeholder: "Escribe tu nombre...",
      what_capture_title: "¿Qué sueles capturar?",
      what_capture_options: ['Ideas', 'Tareas', 'Notas', 'Listas', 'Pensamientos', 'Sueños'],
      when_ideas_title: "¿Cuándo te vienen ideas?",
      when_ideas_options: ['Caminando', 'Ducha', 'Cama', 'Mañana', 'Ejercicio', 'Random'],
      complete_title: "¡Listo!",
      complete_title_name: "¡Listo, {name}!",
      start_button: "Empezar",
      next_button: "Siguiente",
      listening: "Escuchando",
      speak_naturally: "Habla naturalmente, como si le contaras a un amigo",
      write_here: "O escríbelo aquí...",
      language_title: "Elige tu idioma",
      language_subtitle: "Puedes cambiarlo después",
    },
    kai_guide: {
      title: "Así empezamos",
      message: "Mantén pulsado el micro y cuéntame qué tienes en mente hoy. Tareas, ideas, sueños — yo lo organizo todo.",
      cta: "Pruébalo ahora"
    }
  }
} as const;

export function getTranslations(locale: Locale) {
  return translations[locale];
}

export function getLocale(): Locale {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('hansei-locale') as Locale) || 'en';
  }
  return 'en';
}

export function setLocale(locale: Locale) {
  localStorage.setItem('hansei-locale', locale);
}
