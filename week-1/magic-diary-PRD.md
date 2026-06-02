# Magic Diary — Product Requirements Document (PRD)
**Wersja:** 0.1.0 — MVP / Szkielet aplikacji  
**Data:** 28 maja 2026  
**Autor:** [Twoje imię]  
**Status:** Draft  

---

## Spis treści

1. [Wprowadzenie i cel produktu](#1-wprowadzenie-i-cel-produktu)
2. [Wizja produktu](#2-wizja-produktu)
3. [Użytkownicy i persony](#3-użytkownicy-i-persony)
4. [Zakres MVP (v0.1)](#4-zakres-mvp-v01)
5. [Architektura informacji i nawigacja](#5-architektura-informacji-i-nawigacja)
6. [Szczegółowe wymagania — widoki](#6-szczegółowe-wymagania--widoki)
7. [Design System i wytyczne wizualne](#7-design-system-i-wytyczne-wizualne)
8. [Wymagania techniczne](#8-wymagania-techniczne)
9. [Internacjonalizacja (i18n)](#9-internacjonalizacja-i18n)
10. [Przechowywanie danych](#10-przechowywanie-danych)
11. [Out of Scope — v0.1](#11-out-of-scope--v01)
12. [Roadmapa — przyszłe wersje](#12-roadmapa--przyszłe-wersje)
13. [Otwarte pytania i decyzje do podjęcia](#13-otwarte-pytania-i-decyzje-do-podjęcia)
14. [Słownik pojęć](#14-słownik-pojęć)

---

## 1. Wprowadzenie i cel produktu

**Magic Diary** to responsywna aplikacja webowa (PWA-ready) działająca na urządzeniach mobilnych i desktopowych, służąca jako codzienny dziennik emocji i refleksji. Użytkownik może pisać swobodne notatki, wybierać nastrój, przeglądać historię wpisów i wyszukiwać swoje wspomnienia.

Estetyka aplikacji inspirowana jest uniwersum Harry'ego Pottera — w szczególności Pamiętnikiem Toma Riddle'a i starymi czarodziejskimi księgami. Interfejs ma sprawiać wrażenie pisania na pergaminie, a nie korzystania z typowej aplikacji webowej.

**Cel biznesowy MVP:** Dostarczenie działającego szkieletu czterech kluczowych ekranów, na którym można budować kolejne funkcje (analityka AI, baza danych w chmurze, sklep ze skinami/avatarami).

---

## 2. Wizja produktu

> *"Twoje myśli zasługują na piękniejsze miejsce niż zwykły notatnik."*

Magic Diary ma być pierwszą aplikacją dziennikową, która łączy emocjonalną głębię starego pamiętnika z mocą nowoczesnej technologii. W wersji MVP jest to elegancki, lokalny notatnik. W przyszłości — asystent psychologiczny zasilany AI.

### Kluczowe zasady produktowe

- **Magia w każdym detalu** — każda animacja, każda czcionka i każda ikonka nawiązuje do świata czarodziejów.
- **Mobile-first, desktop-polished** — aplikacja działa perfekcyjnie na telefonie, a na desktopie oferuje rozbudowany widok panelowy.
- **Prywatność jako fundament** — dane użytkownika są domyślnie lokalne; synchronizacja do chmury jest opcją, nie przymusem.
- **Rozszerzalność** — każda decyzja architektoniczna musi umożliwiać dołożenie AI, bazy danych i sklepu bez przepisywania rdzenia.

---

## 3. Użytkownicy i persony

### Persona główna — "Zuzanna, 24 lata"

- Studentka lub młoda profesjonalistka
- Używa telefonu 90% czasu, laptopa do nauki/pracy
- Lubi estetyczne rzeczy, śledzi "journaling" na TikToku
- Chce mieć miejsce do wyrzucenia myśli z głowy, ale zniechęca ją brzydota zwykłych notatników
- Fan serii Harry Potter

### Persona poboczna — "Marek, 32 lata"

- Pracuje w IT, lubi produktywność i samorozwój
- Korzysta głównie z desktopu
- Interesuje się analizą swoich nawyków i nastrojów
- Doceni przyszłą funkcję AI-analizy wpisów

---

## 4. Zakres MVP (v0.1)

Wersja 0.1 zawiera **cztery ekrany** dostępne bez logowania, z lokalnym przechowywaniem danych.

| # | Ekran | Mobile | Desktop |
|---|-------|--------|---------|
| 1 | Splash Screen (ekran ładowania) | ✅ | ✅ |
| 2 | Nowy Wpis (edytor) | ✅ | ✅ (panel prawy) |
| 3 | Lista Wpisów | ✅ | ✅ (panel lewy) |
| 4 | Podgląd Wpisu | ✅ | ✅ (panel prawy) |

Wszystkie cztery ekrany muszą być w pełni responsywne. Desktop to układ dwupanelowy (sidebar lewy + główny obszar prawy). Mobile to układ jednostronicowy z nawigacją dolną.

---

## 5. Architektura informacji i nawigacja

### 5.1 Nawigacja mobilna (Bottom Navigation Bar)

Stały pasek na dole ekranu — widoczny na wszystkich ekranach z wyjątkiem Splash Screen.

| Pozycja | Ikona | Etykieta (PL) | Etykieta (EN) | Akcja |
|---------|-------|---------------|---------------|-------|
| 1 | Pióro / plus | Nowy Wpis | New Entry | Otwiera edytor nowego wpisu |
| 2 | Otwarta księga | Spis Wspomnień | Memories | Otwiera listę wpisów |
| 3 | Hamburger menu | — | — | Otwiera boczne menu (Ustawienia w przyszłości) |

Aktywna zakładka wyróżniona złotym kolorem i subtelną animacją.

### 5.2 Nawigacja desktopowa (Sidebar + Top Bar)

- **Lewy sidebar** (stały, ~280 px): logo Magic Diary u góry, pod nim lista wpisów z wyszukiwarką
- **Górna belka**: tytuł aktualnego ekranu po prawej stronie, ikona menu (hamburger) po prawej
- **Prawy obszar główny**: aktywny widok (nowy wpis / podgląd wpisu)
- Kliknięcie wpisu na liście (sidebar lewy) ładuje podgląd po prawej bez przeładowania strony

### 5.3 Mapa ekranów

```
App Start
  └── Splash Screen (3 sek.)
        └── Edytor Nowego Wpisu (zawsze — niezależnie od tego czy wpisy istnieją)
              └── [Zapisz] → Podgląd Wpisu (nowo zapisanego)
              └── [Spis Wspomnień w nav] → Lista Wpisów
                    └── [klik wpisu] → Podgląd Wpisu
```

---

## 6. Szczegółowe wymagania — widoki

---

### Ekran 1 — Splash Screen

**Cel:** Pierwsze wrażenie, budowanie nastroju marki, ukrycie czasu ładowania aplikacji.

**Czas wyświetlania:** 2,5–3 sekundy, po czym automatyczne przejście do Listy Wpisów.

#### Elementy UI (Mobile i Desktop — identyczny układ)

| Element | Opis |
|---------|------|
| Tło | Ciemna faktura skórzanej okładki (jak na screenie referencyjnym) — głęboka burgundy/czerń |
| Logo — ilustracja | Otwarta księga z piórem i iskierkami (SVG lub image asset) — animacja pojawiania się |
| Nazwa | "MAGIC DIARY" — złoty serif, duże litery, odstęp między literami |
| Tagline (opcjonalnie) | "Twoje czarodziejskie wspomnienia" / "Your magical memories" — zależnie od języka |
| Animacja | Cząsteczki złotego pyłu / iskry opadające w dół (CSS particles lub lottie) |
| Progress | Subtelna złota linia ładowania na dole lub pulsujące logo — bez twardego paska postępu |

#### Zachowanie

- Nie zawiera żadnych przycisków ani interakcji użytkownika
- Animacja wejścia: logo fade-in + scale-up (0.8 → 1.0) przez 800 ms
- Automatyczne przejście z animacją fade-out po 2,5 sek.
- **Zawsze przekierowuje na Edytor Nowego Wpisu** — niezależnie od tego, czy użytkownik ma już zapisane wpisy

---

### Ekran 2 — Nowy Wpis (Edytor)

**Cel:** Umożliwienie użytkownikowi stworzenia nowego wpisu z bogatym edytorem tekstu, wyborem nastroju i datą.

#### Sekcja nagłówkowa (nad edytorem)

| Element | Opis |
|---------|------|
| Powitanie kontekstowe | "Dzień dobry" / "Dobry wieczór" / "Dobranoc" — zależnie od pory dnia (6–11: dzień dobry, 12–17: dobrego popołudnia, 18–21: dobry wieczór, 22–5: dobranoc) |
| Dzień tygodnia | Np. "Czwartek" — font dekoracyjny, złoty |
| Data | Np. "28 maja" — pod dniem tygodnia |
| Mini-kalendarz tygodniowy | 7 komórek (Pn–Nd), aktualny dzień podświetlony; klikalne (zmiana daty wpisu) |

#### Wybór nastroju

5 ikon/przycisków w rzędzie, wzajemnie wykluczające się (radio-style):

| Ikona | Etykieta PL | Etykieta EN | Wartość |
|-------|-------------|-------------|---------|
| ✨ | Świetnie! | Fantastic! | 5 |
| 🙂 | Dobrze | Good | 4 |
| 😐 | Neutralnie | Neutral | 3 |
| 😔 | Źle | Not great | 2 |
| 🌑 | Koszmarnie | Terrible | 1 |

- Ikony w stylu magicznym (candle/sparkle/cloud/moon)
- Wybrany nastrój podświetlony złotą obwódką i delikatnym glow
- Nastrój jest polem opcjonalnym

#### Pole tytułu

- Placeholder: "Tytuł wpisu..." / "Entry title..."
- Styl: duży serif, złoty kolor, bez ramki (inline edit)
- Max 120 znaków

#### Edytor tekstu (TipTap)

Toolbar z ikonkami (bez etykiet tekstowych):

| Ikona | Funkcja |
|-------|---------|
| **B** | Bold |
| *I* | Italic |
| U̲ | Underline |
| ~~S~~ | Strikethrough |
| H1 / H2 | Nagłówek |
| " | Cytat (blockquote) |
| ≡ | Lista punktowa |
| 1. | Lista numerowana |
| 🎙 | Dyktowanie głosowe (zablokowane — ikona z kłódką, tooltip: "Już wkrótce / Coming soon") |
| 🖊 | Odręczne pisanie (zablokowane — ikona z kłódką, tooltip: "Już wkrótce / Coming soon") |
| 🙂 | Emoji picker |

Placeholder pola tekstowego: "Zacznij pisać..." / "Start writing..."  
Czcionka edytora: serif (np. Lora lub Playfair Display) na tle pergaminowej faktury.

#### Przycisk akcji

- Przycisk **"Zapisz wpis"** / **"Save Entry"** — złoty, pełna szerokość (mobile) lub prawy dolny róg (desktop)
- Aktywny tylko gdy pole tekstowe nie jest puste lub wybrany nastrój
- Po zapisaniu: krótka animacja (pióro piszące) i przekierowanie do Podglądu Wpisu

#### Zachowanie na desktopie

- Edytor zajmuje prawy panel
- Toolbar edytora wyświetlony nad polem tekstowym
- Sekcja nagłówkowa (powitanie + kalendarz + nastrój) wyświetlona powyżej edytora

---

### Ekran 3 — Lista Wpisów (Spis Wspomnień)

**Cel:** Przeglądanie wszystkich wcześniejszych wpisów, wyszukiwanie i sortowanie.

#### Nagłówek ekranu (Mobile)

- Tytuł: "Spis Wspomnień" / "Book of Memories" — serif, wyśrodkowany
- Pod tytułem: ozdobna linia (ornament)

#### Wyszukiwarka

- Pole tekstowe z ikoną lupy
- Przeszukuje tytuły i treść wpisów w czasie rzeczywistym
- Placeholder: "Szukaj wspomnień..." / "Search memories..."
- Na mobile: domyślnie zwinięta (ikona lupy w headerze); rozwijana po tapnięciu

#### Sortowanie

- Dropdown lub toggleable pill-tabs: "Najnowsze" / "Najstarsze" / "Nastrój"
- Domyślnie: Najnowsze

#### Lista wpisów

Każdy element listy (Entry Card):

| Element | Opis |
|---------|------|
| Data | Dzień i miesiąc, rok — małe, blade |
| Tytuł wpisu | Bold, serif, jeden wiersz (skrócony jeśli za długi — ellipsis) |
| Fragment tekstu | Max 2 linijki, przyciemniony, bez formatowania |
| Ikona nastroju | Mała ikona nastroju po prawej stronie |
| Menu kontekstowe (•••) | Po tapnięciu: opcje "Edytuj" / "Usuń" z potwierdzeniem |

Kliknięcie karty → Podgląd Wpisu.

#### Stan pusty (brak wpisów)

- Ilustracja pustej księgi lub latającego pióra
- Tekst: "Twoja księga jest pusta. Czas na pierwszy wpis!" / "Your book is empty. Time for your first entry!"
- Przycisk CTA → Edytor Nowego Wpisu

#### Zachowanie na desktopie

- Lista zajmuje lewy sidebar (~320 px) z wbudowaną wyszukiwarką u góry
- Kliknięcie wpisu ładuje podgląd po prawej (bez przeładowania strony — router)
- Aktywny wpis podświetlony po lewej

---

### Ekran 4 — Podgląd Wpisu

**Cel:** Wyświetlenie pełnego zapisanego wpisu w czytelnej, elegackiej formie.

#### Elementy UI

| Element | Opis |
|---------|------|
| Nawigacja wstecz (mobile) | Strzałka "<" w lewym górnym rogu → powrót do Listy Wpisów |
| Data | Dzień tygodnia + data + rok, wyśrodkowane, małe, złoto-blade |
| Tytuł | Duży serif, wyśrodkowany, złoty |
| Ikona nastroju | Mała ikona z etykietą pod tytułem (opcjonalna jeśli nastrój nie był wybrany) |
| Treść wpisu | Sformatowany HTML z TipTap — pełna treść, przewijana |
| Ozdobnik | Subtelna ilustracja pióra w dolnej części strony (watermark-style, niska opacity) |
| Przycisk Edytuj | W prawym górnym rogu (ikona pióra) lub w top barze → otwiera edytor z załadowanym wpisem |
| Przycisk Usuń | W menu "•••" z potwierdzeniem dialogowym |

#### Zachowanie na desktopie

- Podgląd zajmuje prawy panel
- Kliknięcie "Edytuj" ładuje edytor w tym samym panelu
- Sidebar lewy pozostaje widoczny

---

## 7. Design System i wytyczne wizualne

### 7.1 Paleta kolorów

| Token | Wartość HEX | Użycie |
|-------|-------------|--------|
| `--color-bg-dark` | `#1A0A06` | Tło aplikacji (ciemny), Splash Screen |
| `--color-bg-parchment` | `#F5EDD8` | Tło kart, edytora, podglądu (pergamin) |
| `--color-bg-parchment-dark` | `#E8DCC0` | Tło sekcji w trybie jasnym |
| `--color-accent-gold` | `#C9993F` | Akcenty, ikony, przyciski, podświetlenia |
| `--color-accent-gold-light` | `#F0C96A` | Hover, glow efekty |
| `--color-sidebar-bg` | `#2C0F0A` | Tło sidebara (desktop), listy (mobile header) |
| `--color-text-primary` | `#2B1A0F` | Tekst główny na pergaminie |
| `--color-text-secondary` | `#7A5C42` | Daty, metadane, placeholdery |
| `--color-text-gold` | `#C9993F` | Tytuły, nagłówki dekoracyjne |
| `--color-border` | `#C9A96E33` | Ramki, linie, separatory |
| `--color-danger` | `#8B1A1A` | Akcje destrukcyjne (usuń) |

### 7.2 Typografia

| Rola | Krój | Rozmiar | Styl |
|------|------|---------|------|
| Tytuł aplikacji (Logo) | IM Fell English SC | 28–36 px | Bold, letter-spacing: 0.1em |
| Nagłówki ekranów | Playfair Display | 22–28 px | Regular / Italic |
| Tytuły wpisów | Playfair Display | 20–24 px | SemiBold |
| Tekst edytora / podglądu | Lora | 16–17 px | Regular |
| Metadane, daty | IM Fell English | 12–14 px | Regular, opacity 0.7 |
| UI (labele, przyciski) | Cinzel | 12–14 px | Regular, uppercase |

Czcionki dostępne przez Google Fonts.

### 7.3 Faktury i efekty

- **Tło kart/edytora:** CSS background-image z subtelną fakturą pergaminu (noise + sepia gradient)
- **Cień kart:** `box-shadow: 0 4px 20px rgba(0,0,0,0.3), inset 0 0 40px rgba(201,153,63,0.05)`
- **Złote ramki:** border gradient z efektem metalicznym
- **Animacje przejść:** fade + slide (300 ms ease-out) między ekranami
- **Hover na kartach wpisów:** subtelny wzrost brightness + złota lewa ramka (border-left: 3px solid gold)

### 7.4 Ikonografia

- Styl: cienkie linie (stroke-based), złoty kolor, zaokrąglenia
- Zestaw bazowy: Heroicons lub Lucide React (dostosowane kolorystycznie)
- Ikony specjalne (pióro, księga, magiczne elementy): własne SVG inspirowane screenshotem referencyjnym
- Ikony zablokowanych funkcji: z nałożoną ikoną kłódki i zmniejszoną opacity (0.5)

### 7.5 Komponenty UI — kluczowe stany

Każdy komponent musi mieć zdefiniowane stany: default, hover, active/selected, disabled, loading.

---

## 8. Wymagania techniczne

### 8.1 Stack technologiczny

| Warstwa | Technologia | Wersja |
|---------|-------------|--------|
| Framework | Next.js (App Router) | 14+ |
| UI Library | React | 18+ |
| Styling | Tailwind CSS | 3+ |
| Komponenty UI | shadcn/ui | latest |
| Edytor tekstu | TipTap | 2+ |
| Animacje | Framer Motion | 10+ |
| Ikony | Lucide React | latest |
| Autentykacja (przyszłość) | Better Auth | latest |
| Baza danych (przyszłość) | Supabase | — |
| Deployment | Vercel | — |
| Język | TypeScript | 5+ |

### 8.2 Przeglądarki i urządzenia

| Platforma | Minimalne wymaganie |
|-----------|---------------------|
| iOS Safari | 15+ |
| Android Chrome | 90+ |
| Desktop Chrome | 90+ |
| Desktop Firefox | 90+ |
| Desktop Safari | 15+ |
| Rozdzielczość mobile | 375 px – 430 px szerokości |
| Rozdzielczość desktop | 1024 px+ |
| Breakpoint mobile/desktop | 768 px (md w Tailwind) |

### 8.3 Wydajność

- Lighthouse Performance Score: ≥ 85 (mobile), ≥ 90 (desktop)
- First Contentful Paint: < 1,5 s
- Splash Screen nie może opóźniać inicjalizacji aplikacji (preload kluczowych zasobów)

### 8.4 Dostępność (a11y)

- Kontrast kolorów: minimum WCAG AA (4.5:1 dla tekstu, 3:1 dla UI)
- Nawigacja klawiaturą: wszystkie interaktywne elementy dostępne przez Tab
- ARIA labels na ikonkach bez etykiet tekstowych
- Focus ring widoczny na wszystkich elementach interaktywnych

---

## 9. Internacjonalizacja (i18n)

### Strategia

- Używamy **next-intl** do obsługi tłumaczeń
- Dwa języki od startu: polski (domyślny) i angielski
- Pliki tłumaczeń: `messages/pl.json` i `messages/en.json`
- Automatyczna detekcja języka przeglądarki przy pierwszym uruchomieniu
- Przełącznik języka dostępny w hamburger menu

### Klucze tłumaczeń (przykłady)

```json
{
  "splash.tagline": "Twoje czarodziejskie wspomnienia",
  "nav.new_entry": "Nowy Wpis",
  "nav.memories": "Spis Wspomnień",
  "greeting.morning": "Dzień dobry",
  "greeting.afternoon": "Dobrego popołudnia",
  "greeting.evening": "Dobry wieczór",
  "greeting.night": "Dobranoc",
  "mood.fantastic": "Świetnie!",
  "mood.good": "Dobrze",
  "mood.neutral": "Neutralnie",
  "mood.notgreat": "Źle",
  "mood.terrible": "Koszmarnie",
  "entry.save": "Zapisz wpis",
  "entry.placeholder_title": "Tytuł wpisu...",
  "entry.placeholder_body": "Zacznij pisać...",
  "list.title": "Spis Wspomnień",
  "list.search_placeholder": "Szukaj wspomnień...",
  "list.sort.newest": "Najnowsze",
  "list.sort.oldest": "Najstarsze",
  "list.sort.mood": "Nastrój",
  "list.empty": "Twoja księga jest pusta. Czas na pierwszy wpis!",
  "coming_soon": "Już wkrótce"
}
```

---

## 10. Przechowywanie danych

### Faza MVP (v0.1) — localStorage

Wszystkie wpisy przechowywane lokalnie w przeglądarce.

#### Schemat wpisu (Entry)

```typescript
interface Entry {
  id: string;           // nanoid() — unikalny identyfikator
  title: string;        // Tytuł wpisu (max 120 znaków)
  content: string;      // HTML z TipTap
  mood: 1 | 2 | 3 | 4 | 5 | null;  // Nastrój (null jeśli nie wybrano)
  date: string;         // ISO 8601: "2026-05-28"
  createdAt: string;    // ISO 8601 timestamp
  updatedAt: string;    // ISO 8601 timestamp
  language: "pl" | "en"; // Język wpisu
}
```

#### Klucz w localStorage

```
magic-diary:entries  → Entry[] (JSON stringified)
magic-diary:settings → { language: "pl" | "en" }
```

### Faza 2 (v0.2+) — Supabase + Vercel

- Migracja danych z localStorage do Supabase przy pierwszym logowaniu
- Schemat bazy danych identyczny ze schematem TypeScript powyżej
- Autentykacja: Better Auth (email/password, Google OAuth)
- Synchronizacja w czasie rzeczywistym (Supabase Realtime)
- Row-Level Security (RLS) — każdy użytkownik widzi tylko swoje wpisy

---

## 11. Out of Scope — v0.1

Następujące funkcje są **celowo wykluczone** z wersji MVP i opisane w Roadmapie:

- Logowanie i konta użytkowników
- Synchronizacja z chmurą (Supabase)
- Analiza AI nastrojów i wpisów
- Dyktowanie głosowe (ikona widoczna ale zablokowana)
- Odręczne pisanie (ikona widoczna ale zablokowana)
- Sklep z avatarami i skinami
- Powiadomienia push / przypomnienia
- Eksport wpisów (PDF, TXT)
- Tryb ciemny / jasny (aplikacja startuje z domyślnym motywem pergaminowym)
- Statystyki nastrojów i wykresy
- Udostępnianie wpisów

---

## 12. Roadmapa — przyszłe wersje

| Wersja | Funkcje |
|--------|---------|
| **v0.2** | Supabase + Better Auth, migracja danych, synchronizacja między urządzeniami |
| **v0.3** | Dyktowanie głosowe (Web Speech API), transkrypcja wpisów |
| **v0.4** | Analityka AI — podsumowania tygodniowe, wykrywanie wzorców nastroju |
| **v0.5** | Statystyki i wizualizacje nastrojów (wykresy, heat-mapy) |
| **v1.0** | Sklep — skiny okładki, customizacja avatara czarodzieja, motywy kolorystyczne |
| **v1.1** | Asystent AI (psycholog/mentor) — rozmowy na bazie wpisów |
| **v1.2** | Export PDF, udostępnianie wpisów, powiadomienia |

---

## 13. Otwarte pytania i decyzje do podjęcia

| # | Pytanie | Priorytet | Status |
|---|---------|-----------|--------|
| 1 | Czy Splash Screen powinien mieć opcję "pomiń" po 1 sekundzie? | Niski | Otwarte |
| 2 | Jaki ma być domyślny język przy starcie — PL czy detekcja z przeglądarki? | Średni | Otwarte |
| 3 | Czy mini-kalendarz w edytorze umożliwia zmianę daty wstecznej wpisu? | Średni | Otwarte |
| 4 | Czy usunięcie wpisu jest trwałe (brak kosza) czy przenosi do "Archiwum"? | Wysoki | Otwarte |
| 5 | Jaka jest maksymalna długość wpisu? (TipTap nie ma domyślnego limitu) | Niski | Otwarte |
| 6 | Czy aplikacja ma być PWA (instalowalna na telefonie) od v0.1? | Średni | Otwarte |

---

## 14. Słownik pojęć

| Termin | Definicja |
|--------|-----------|
| **Wpis** | Pojedynczy zapis w dzienniku zawierający tytuł, treść, datę i opcjonalny nastrój |
| **Spis Wspomnień** | Nazwa ekranu z listą wszystkich wpisów (PL branding) |
| **Nastrój** | Emocjonalna ocena dnia na skali 1–5, wybierana przez użytkownika |
| **Pergaminowe tło** | Stylizacja tła edytora i podglądu imitująca stary papier/pergamin |
| **Splash Screen** | Ekran startowy aplikacji wyświetlany przez ~3 sekundy przy uruchomieniu |
| **Mini-kalendarz** | Widok 7 dni bieżącego tygodnia nad edytorem wpisu |
| **Toolbar** | Pasek narzędzi edytora TipTap z przyciskami formatowania |
| **Panel dwukolumnowy** | Układ desktopu: lewa kolumna = lista, prawa = aktywny widok |
| **Entry Card** | Karta pojedynczego wpisu na liście Spisu Wspomnień |

---

*Dokument przygotowany jako PRD dla projektu Magic Diary v0.1 — MVP.*  
*Kolejna wersja tego dokumentu (v0.2) powinna być zaktualizowana po wdrożeniu Supabase i systemu autentykacji.*
