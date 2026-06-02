# Magic Diary — Plan Wdrożenia v0.1 MVP

**Data:** 28 maja 2026  
**Wersja:** 0.1.0  
**Stack:** Next.js 14 · React 18 · TipTap · Framer Motion · localStorage · PL/EN  
**Czas do MVP:** ~6 tygodni · 4 sprinty · 4 ekrany

---

## Przegląd

| # | Sprint | Zakres | Czas |
|---|--------|--------|------|
| 0 | Fundament projektu | Setup, design system, routing, i18n | ~3 dni |
| 1 | Splash Screen + warstwa danych | Ekran 1, localStorage, typy TS | ~4 dni |
| 2 | Nowy Wpis — edytor | Ekran 2, TipTap, nastrój, zapis | ~6 dni |
| 3 | Lista + Podgląd Wpisu | Ekrany 3 i 4, nawigacja, animacje | ~5 dni |
| 4 | Polish, testy, deploy | a11y, wydajność, PWA, Vercel | ~4 dni |

---

## Sprint 0 — Fundament projektu

> Tydzień 1 · ~3 dni

### Inicjalizacja

- `npx create-next-app@latest magic-diary --typescript --tailwind --app` (App Router, src/, alias @/)
- Instalacja zależności: shadcn/ui, TipTap, Framer Motion, Lucide React, next-intl, nanoid
- ESLint + Prettier + lint-staged + husky

### Design System

- CSS Variables w `globals.css`: kolory (gold `#C9993F`, burgundy `#6B1A2A`, parchment), czcionki, cienie, faktury
- Podłączenie Google Fonts przez `next/font`: **Playfair Display** (nagłówki) + **Lora** (body/edytor)
- Tailwind config: rozszerzone kolory, custom font-families, animacje

### Routing i i18n

- Konfiguracja `next-intl` — routing `[locale]`, pliki `messages/pl.json` i `messages/en.json`
- Szkielet routingu: `/splash` → `/new` → `/entries` → `/entries/[id]`

---

## Sprint 1 — Splash Screen + warstwa danych

> Tydzień 1–2 · ~4 dni

### Splash Screen (Ekran 1)

- Tło: skórzana faktura CSS (noise + deep burgundy/black gradient)
- Logo SVG/PNG + animacja Framer Motion: fade-in + scale `0.8 → 1.0` przez 800ms
  - Użyj dostarczonego logo jako asset
- Złote cząsteczki pyłu — CSS `@keyframes` lub Framer Motion particles (bez heavy libs)
- Auto-redirect po 2.5s z fade-out → zawsze do Edytora Nowego Wpisu
- Brak przycisków i interakcji użytkownika

### Warstwa danych — localStorage

- Interface `Entry` w TypeScript:

```typescript
interface Entry {
  id: string;           // nanoid()
  title: string;        // max 120 znaków
  content: string;      // HTML z TipTap
  mood: 1 | 2 | 3 | 4 | 5 | null;
  date: string;         // ISO 8601: "2026-05-28"
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
  language: "pl" | "en";
}
```

- Hook `useEntries()`: `getAll`, `getById`, `create`, `update`, `delete` — klucz `magic-diary:entries`
- Hook `useSettings()`: language — klucz `magic-diary:settings`

---

## Sprint 2 — Nowy Wpis (Edytor)

> Tydzień 2–3 · ~6 dni

### Sekcja nagłówkowa

- Powitanie kontekstowe wg pory dnia:
  - 6–11 → "Dzień dobry"
  - 12–17 → "Dobrego popołudnia"
  - 18–21 → "Dobry wieczór"
  - 22–5 → "Dobranoc"
- Mini-kalendarz tygodniowy (Pn–Nd): aktywny dzień złoty + podświetlony, klikalny (zmiana daty wpisu)

### Wybór nastroju

- 5 przycisków radio-style: ✨ 🙂 😐 😔 🌑
- Złota obwódka + glow CSS na wybranym
- Pole opcjonalne — może być niezaznaczone

### TipTap — edytor

- Instalacja TipTap 2 + extensje: Bold, Italic, Underline, Strike, Heading (H1/H2), Blockquote, BulletList, OrderedList, Emoji
- Toolbar z ikonami Lucide — ikony disabled (dyktowanie 🎙, odręczne 🖊) z kłódką + tooltip "Już wkrótce"
- Pergaminowe tło edytora: CSS noise texture + sepia gradient, czcionka Lora
- Pole tytułu: duży serif, złoty, inline edit, max 120 znaków
- Placeholder: "Zacznij pisać..." / "Start writing..."
- Przycisk "Zapisz wpis" → nanoid ID, zapis do localStorage → redirect do podglądu

### Layout desktop

- Dwupanelowy układ (breakpoint `md` / 768px+): sidebar 280px lewy (lista) + główny obszar prawy (edytor/podgląd)

---

## Sprint 3 — Lista + Podgląd Wpisu

> Tydzień 3–4 · ~5 dni

### Spis Wspomnień (Ekran 3)

- Lista Entry Cards: data, tytuł, snippet treści (max 100 znaków), ikona nastroju
- Wyszukiwarka: filtr w pamięci (full-text po tytule i treści), bez backendu
- Sortowanie: Najnowsze / Najstarsze / Nastrój
- Menu kontekstowe na karcie (`...`): Edytuj / Usuń z potwierdzeniem modal
- Hover: subtelny wzrost brightness + złota lewa ramka (`border-left: 3px solid gold`)
- Empty state: "Twoja księga jest pusta. Czas na pierwszy wpis!" z CTA

### Podgląd Wpisu (Ekran 4)

- Widok read-only: data, tytuł Playfair Display, treść HTML z TipTap, ikona nastroju
- Przycisk "Edytuj wpis" → powrót do edytora z załadowaną treścią
- Przycisk "Wstecz" (mobile) + nawigacja klawiszem ← (desktop)

### Nawigacja

- **Mobile** — Bottom Navigation Bar: Nowy Wpis / Spis Wspomnień / Menu
  - Aktywna zakładka: złoty kolor + subtelna animacja
- **Desktop** — Sidebar 280px + górna belka z tytułem ekranu + hamburger
- Hamburger menu: przełącznik języka PL/EN
- Animacje przejść Framer Motion: fade + slide 300ms ease-out między ekranami

---

## Sprint 4 — Polish, testy, deploy

> Tydzień 5–6 · ~4 dni

### Dostępność (a11y)

- ARIA labels na ikonkach bez etykiet tekstowych
- Focus ring widoczny na wszystkich elementach interaktywnych
- Kontrast WCAG AA: 4.5:1 dla tekstu, 3:1 dla UI
- Nawigacja Tab przez wszystkie interaktywne elementy

### Wydajność

- Lighthouse ≥ 85 mobile / ≥ 90 desktop
- FCP < 1.5s — Splash preloaduje zasoby w tle, nie blokuje inicjalizacji
- Optymalizacja: `next/image`, preload fontów, lazy loading komponentów

### PWA

- `next-pwa`: `manifest.json`, service worker, ikony (logo jako PWA icon)
- Umożliwia "Dodaj do ekranu głównego" na mobile
- *Decyzja: patrz Q6 poniżej*

### Deploy

- Połączenie repo GitHub z Vercel — preview deployments na każdym PR
- Checklist przed launchem: iOS Safari, Android Chrome, Desktop Chrome / Firefox / Safari

---

## Stack technologiczny

| Warstwa | Technologia | Wersja | Uwagi |
|---------|-------------|--------|-------|
| Framework | Next.js | 14+ App Router | SSG/SSR gotowy na v0.2 z auth |
| UI Library | React | 18+ | Server Components |
| Styling | Tailwind CSS | 3+ | + CSS Variables (gold, burgundy, parchment) |
| Komponenty UI | shadcn/ui | latest | Dialog, Tooltip, DropdownMenu |
| Edytor tekstu | TipTap | 2+ | Headless, Bold/Italic/Heading/Lists/Emoji |
| Animacje | Framer Motion | 10+ | AnimatePresence, page transitions |
| Ikony | Lucide React | latest | |
| i18n | next-intl | latest | Auto-detect z przeglądarki, fallback PL |
| ID | nanoid | latest | Lekki, bez zależności |
| Czcionki | Playfair Display + Lora | — | Google Fonts via next/font |
| Deploy | Vercel | — | Preview + Production |
| Język | TypeScript | 5+ | strict mode |

### Przyszłe wersje (out of scope v0.1)

| Wersja | Technologia | Cel |
|--------|-------------|-----|
| v0.2 | Better Auth + Supabase | Logowanie, synchronizacja, migracja z localStorage |
| v0.4 | Claude API | Analityka nastrojów, podsumowania AI |
| v1.0 | Supabase Storage | Sklep — skiny, avatary, motywy |

---

## Struktura plików

```
magic-diary/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       ├── splash/page.tsx         # Ekran 1
│   │       ├── new/page.tsx            # Ekran 2 — nowy wpis
│   │       ├── entries/page.tsx        # Ekran 3 — lista
│   │       ├── entries/[id]/page.tsx   # Ekran 4 — podgląd
│   │       └── layout.tsx
│   ├── components/
│   │   ├── splash/
│   │   │   ├── SplashScreen.tsx
│   │   │   └── GoldenParticles.tsx
│   │   ├── editor/
│   │   │   ├── EntryEditor.tsx
│   │   │   ├── EditorToolbar.tsx
│   │   │   ├── MoodPicker.tsx
│   │   │   ├── WeekCalendar.tsx
│   │   │   └── GreetingHeader.tsx
│   │   ├── entries/
│   │   │   ├── EntriesList.tsx
│   │   │   ├── EntryCard.tsx
│   │   │   ├── EntryView.tsx
│   │   │   └── SearchBar.tsx
│   │   ├── layout/
│   │   │   ├── BottomNav.tsx           # Mobile
│   │   │   ├── Sidebar.tsx             # Desktop
│   │   │   └── HamburgerMenu.tsx
│   │   └── ui/                         # shadcn/ui + custom
│   ├── hooks/
│   │   ├── useEntries.ts               # CRUD localStorage
│   │   ├── useSettings.ts
│   │   └── useGreeting.ts              # Powitanie wg pory dnia
│   ├── types/
│   │   └── entry.ts                    # Interface Entry
│   └── lib/
│       └── storage.ts                  # Abstrakcja localStorage
├── messages/
│   ├── pl.json
│   └── en.json
├── public/
│   ├── logo.png                        # Dostarczone logo
│   └── logo.svg
└── tailwind.config.ts
```

---

## Decyzje do podjęcia

| # | Pytanie | Priorytet | Rekomendacja |
|---|---------|-----------|--------------|
| Q1 | Splash Screen — opcja "pomiń"? | Niski | Nie w v0.1. Tap-to-skip opcjonalnie po feedbacku |
| Q2 | Domyślny język — PL czy auto-detect? | Średni | Auto-detect z fallback PL (next-intl robi to out of the box) |
| Q3 | Mini-kalendarz — zmiana daty wstecznej? | Średni | Tak, ale tylko aktualny tydzień (7 dni) |
| Q4 | Usunięcie wpisu — trwałe czy archiwum? | **Wysoki** | Trwałe z potwierdzeniem modal. Kosz w v0.2 przy Supabase |
| Q5 | Maksymalna długość wpisu? | Niski | Brak limitu w v0.1. Dodać po zebraniu danych z użytkowników |
| Q6 | PWA od v0.1? | Średni | Tak — next-pwa to prosta zależność, daje "Dodaj do ekranu głównego" za darmo |

---

## Roadmapa po MVP

| Wersja | Funkcje |
|--------|---------|
| **v0.2** | Supabase + Better Auth, migracja danych z localStorage, synchronizacja między urządzeniami |
| **v0.3** | Dyktowanie głosowe (Web Speech API), transkrypcja wpisów |
| **v0.4** | Analityka AI — podsumowania tygodniowe, wykrywanie wzorców nastroju |
| **v0.5** | Statystyki i wizualizacje nastrojów (wykresy, heat-mapy) |
| **v1.0** | Sklep — skiny okładki, customizacja avatara czarodzieja, motywy kolorystyczne |
| **v1.1** | Asystent AI (psycholog/mentor) — rozmowy na bazie wpisów |
| **v1.2** | Export PDF, udostępnianie wpisów, powiadomienia push |

---

*Magic Diary v0.1 — MVP Implementation Plan*  
*Następna aktualizacja: po wdrożeniu Supabase i auth (v0.2)*
