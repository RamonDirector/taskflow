# Migración PWA → React Native/Expo

> Documentación para cuando llegue el momento de migrar Hansei a nativo.

## Cuándo migrar

**Triggers recomendados:**
- [ ] Widgets son críticos para el producto
- [ ] Push notifications necesarias para retención
- [ ] Quieres presencia en App Store / Play Store
- [ ] Tienes tracción validada (usuarios activos recurrentes)

---

## Lo que se reutiliza ✅

| Componente | Reusable | Notas |
|------------|----------|-------|
| Backend (API routes) | 100% | Mover a servidor separado o mantener en Next.js como API |
| Lógica de negocio | 90% | TypeScript se reutiliza casi igual |
| Supabase (auth + DB) | 100% | Mismo cliente, misma base de datos |
| Prompts de AI | 100% | Son strings, copiar y pegar |
| Diseño/UX conceptual | 80% | Los flujos se mantienen |

---

## Lo que hay que reescribir ❌

| Componente | Esfuerzo | Cambio |
|------------|----------|--------|
| UI Components | Alto | `<div>` → `<View>`, `<p>` → `<Text>`, etc. |
| Estilos (Tailwind) | Alto | React Native usa `StyleSheet`, no CSS. Considerar NativeWind o Tamagui |
| Animaciones (Framer Motion) | Medio | Reemplazar con `react-native-reanimated` |
| Routing (Next.js) | Medio | Usar Expo Router (similar a Next.js) o React Navigation |
| Audio recording | Bajo | `expo-av` tiene API similar |

---

## Esfuerzo estimado

**Total: 2-3 semanas** para un desarrollador

| Tarea | Días |
|-------|------|
| Setup Expo + estructura proyecto | 1-2 |
| Migrar UI components | 5-7 |
| Integrar Supabase auth | 1-2 |
| Audio/voice input con expo-av | 2-3 |
| Animaciones con Reanimated | 2-3 |
| Testing + pulido | 3-4 |

---

## Stack recomendado para nativo

```
Framework:     Expo (SDK 50+)
UI:            React Native + NativeWind (Tailwind para RN)
Navegación:    Expo Router
Animaciones:   react-native-reanimated
Estado:        Zustand o React Context (lo que uses ahora)
Backend:       Mantener Next.js API routes o migrar a Supabase Edge Functions
Auth:          @supabase/supabase-js (mismo cliente)
Audio:         expo-av
Push:          expo-notifications + backend service
Widgets:       react-native-widget-extension (iOS) / Android nativo
```

---

## Preparación desde ahora

Para facilitar la migración futura:

### 1. Separar lógica de UI
```
src/
  lib/
    hooks/           ← Lógica reutilizable
    utils/           ← Funciones puras
    api/             ← Llamadas a backend
  components/        ← UI (esto se reescribe)
```

### 2. Extraer API routes
Considerar mover de Next.js API routes a:
- **Supabase Edge Functions** — Serverless, mismo ecosistema
- **Hono on Cloudflare** — Ultra rápido, edge
- **Express/Fastify standalone** — Más control

Ventaja: El móvil nativo consumirá la misma API.

### 3. Documentar flows de AI
Mantener los prompts y lógica de AI bien documentados — se copian directamente.

---

## Features nativas que ganarás

| Feature | Beneficio |
|---------|-----------|
| **Widgets** | Usuario ve tareas/affirmations sin abrir app |
| **Push notifications** | Engagement proactivo, recordatorios |
| **App Store presence** | Descubrimiento orgánico |
| **Siri Shortcuts** | "Hey Siri, añade tarea a Hansei" |
| **Apple Watch** | Quick capture desde muñeca |
| **Haptic feedback** | UX más premium |
| **Background refresh** | Datos frescos al abrir |

---

## Costes

| Item | Coste |
|------|-------|
| Apple Developer Program | $99/año |
| Google Play Console | $25 (único) |
| Expo EAS Build (si necesitas más builds) | $0-29/mes |

---

## Recursos

- [Expo Docs](https://docs.expo.dev/)
- [Expo Router](https://expo.github.io/router/docs/)
- [NativeWind](https://www.nativewind.dev/)
- [Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [Supabase + Expo](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)

---

*Última actualización: 2025-02-07*
