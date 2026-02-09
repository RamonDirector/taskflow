# Kai 🐼 — Mascota de Hansei

## Identidad
- **Nombre:** Kai (改) — significa "cambio" o "transformación" en japonés
- **Especie:** Panda
- **Personalidad:** Amigable, motivador, sabio pero cercano
- **Rol:** Guía y compañero del usuario en su journey de productividad

## Assets actuales
```
/public/panda/
├── new-wave.png        # Saludo, bienvenida
├── new-neutral.png     # Estado por defecto
├── new-thinking.png    # Procesando, escuchando
├── new-celebrate.png   # Logro, éxito

/public/images/
├── panda-laptop.png    # Empty state: Tasks
├── panda-idea.png      # Empty state: Ideas  
├── panda-sleeping.png  # Empty state: Dreams
```

## Dónde integrar el nombre "Kai"

### 1. Onboarding (`src/app/onboarding/page.tsx`)
- [ ] Paso de bienvenida: "Soy Kai, tu compañero de ideas"
- [ ] Presentación con nombre

### 2. Home (`src/app/app/page.tsx`)
- [ ] Mensajes del panda con nombre: "Kai dice: ¡Buena idea!"
- [ ] Greeting personalizado: "Kai está listo para escucharte"

### 3. Empty states
- [ ] Tasks (`src/app/app/tasks/page.tsx`): "Kai está esperando tus tareas"
- [ ] Ideas (`src/app/app/ideas/page.tsx`): "Cuéntale a Kai tu próxima idea"
- [ ] Dreams (`src/app/app/dreams/page.tsx`): "Kai guarda tus sueños"

### 4. Feedback/Celebraciones
- [ ] Cuando completa tarea: "¡Kai celebra contigo!"
- [ ] Streak/logros: Kai aparece celebrando

### 5. Landing page
- [ ] Sección "Conoce a Kai" (opcional)
- [ ] O mencionar sutilmente en features

### 6. Notificaciones (futuro)
- [ ] "Kai te recuerda: tienes 3 tareas pendientes"

### 7. Emails/Comunicación (futuro)
- [ ] "Kai y el equipo de Hansei"

## Tono de voz de Kai
- Cercano, usa "tú"
- Motivador sin ser pesado
- Breve (1-2 frases max)
- Puede usar emojis con moderación

## Ejemplos de mensajes
- "¡Capturado! 💡"
- "Buena idea, la guardé en Ideas"
- "¡Otra tarea completada! Vas bien 🎯"
- "¿Qué tienes en mente?"
- "Listo para escucharte"
