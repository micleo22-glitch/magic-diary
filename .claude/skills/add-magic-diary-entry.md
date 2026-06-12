---
name: add-magic-diary-entry
description: Dodaje nowy wpis do Magic Diary na wskazany dzień (domyślnie dziś). Claude wnioskuje nastrój (1-5) z treści wpisu i weryfikuje zapis w Supabase.
---

# Skill: Dodaj wpis do dziennika

## Twoja rola

Działasz jako asystent do prowadzenia dziennika Magic Diary. Gdy użytkownik poda treść wpisu (i opcjonalnie datę), wykonujesz poniższe kroki **po kolei** — nie pomijaj żadnego.

Supabase project ID: `your-project-ref`

---

## Krok 1 — Ustal datę wpisu

- Jeśli użytkownik podał datę → użyj jej w formacie `YYYY-MM-DD`
- Jeśli nie podał → użyj **dzisiejszej daty** (odczytaj z kontekstu systemowego `currentDate` lub wywołaj Bash: `Get-Date -Format "yyyy-MM-dd"`)

---

## Krok 2 — Wywnioskuj nastrój (1–5)

Przeanalizuj **cały tekst wpisu** i oceń nastrój na skali 1–5:

| Wartość | Znaczenie | Sygnały w tekście |
|---------|-----------|-------------------|
| 5 — Świetnie ✨ | Euforia, radość, sukces, spełnienie | „cudowny dzień", „super", „udało się", „szczęśliwy/a", wykrzykniki pozytywne |
| 4 — Dobrze 🙂 | Pozytywny nastrój, zadowolenie, spokój | „dobry dzień", „miło", „udany", „przyjemnie", lekki optymizm |
| 3 — Neutralnie 😐 | Rutyna, bez skrajności, mieszane uczucia | „normalny dzień", „nic szczególnego", brak wyraźnych emocji |
| 2 — Źle 😔 | Smutek, zmęczenie, frustracja, rozczarowanie | „zmęczony/a", „smutno", „nie wyszło", „frustrujące", „trudny dzień" |
| 1 — Koszmarnie 🌑 | Kryzys, ból, desperacja | „okropny", „koszmar", „nie mogę", płacz, bardzo intensywne negatywy |

**Zasady:**
- Wybierz **jedną** wartość całkowitą (1, 2, 3, 4 lub 5)
- Jeśli tekst jest krótki lub niejednoznaczny → przyjmij 3
- Nie pytaj użytkownika o nastrój — wnioskuj samodzielnie

---

## Krok 3 — Wygeneruj tytuł

- Wyodrębnij tytuł (max 60 znaków) z pierwszego zdania lub głównego tematu wpisu
- Nie używaj cudzysłowów ani znaków specjalnych w tytule
- Przykłady: `Spotkanie z przyjaciółmi`, `Trudny poranek`, `Udany projekt w pracy`

---

## Krok 4 — Przygotuj content w formacie HTML

Tekst wpisu musi być owinięty w HTML (format TipTap). Zamień każdy akapit na `<p>...</p>`. Puste linie między akapitami → `<p></p>`.

Przykład — jeden akapit:
```
<p>Dziś było super. Spotkałem starych znajomych.</p>
```

Przykład — wiele akapitów:
```
<p>Akapit pierwszy.</p><p>Akapit drugi.</p>
```

**Ważne:** Apostrofy (`'`) i cudzysłowy wewnątrz treści muszą być escaped w SQL (zdubluj apostrof: `''`).

---

## Krok 5 — Pobierz user_id z Supabase

Użyj narzędzia Supabase MCP (`execute_sql`) z tym zapytaniem:

```sql
SELECT id FROM auth.users WHERE email = 'owner@example.com' LIMIT 1;
```

Zapisz zwrócone `id` (UUID) jako `USER_ID`.

Jeśli zapytanie zwraca 0 wierszy → zatrzymaj się i poinformuj: „Nie znaleziono użytkownika owner@example.com w Supabase Auth."

---

## Krok 6 — Wstaw wpis i pobierz przydzielone ID

Użyj `execute_sql` z poniższym zapytaniem. ID jest generowane przez Postgres (`gen_random_bytes`) — nie musisz go tworzyć ręcznie.

```sql
INSERT INTO entries (id, title, content, mood, date, created_at, updated_at, user_id)
VALUES (
  encode(gen_random_bytes(10), 'hex'),
  '<TYTUŁ>',
  '<CONTENT_HTML>',
  <NASTRÓJ_1_5>,
  '<DATA_YYYY-MM-DD>',
  NOW(),
  NOW(),
  '<USER_ID>'
)
RETURNING id, title, mood, date, created_at;
```

Zapisz zwrócone `id` jako `ENTRY_ID`.

Jeśli INSERT zwróci błąd → pokaż komunikat SQL i zatrzymaj się.

---

## Krok 7 — Weryfikacja zapisu

Natychmiast po insercie wykonaj zapytanie weryfikujące:

```sql
SELECT id, title, mood, date, created_at
FROM entries
WHERE id = '<ENTRY_ID>';
```

**Kryteria sukcesu:**
- Zwrócony jest dokładnie 1 wiersz
- `id` zgadza się z `ENTRY_ID`
- `mood` = wywnioskowana wartość
- `date` = ustawiona data

Jeśli weryfikacja zwraca 0 wierszy → poinformuj: „Wpis mógł nie zostać zapisany — weryfikacja nie zwróciła rekordu." i nie raportuj sukcesu.

---

## Krok 8 — Podsumowanie dla użytkownika

Po pomyślnej weryfikacji wyświetl:

```
✅ Wpis zapisany pomyślnie!

📅 Data: <DATA>
📝 Tytuł: <TYTUŁ>
😊 Nastrój: <WARTOŚĆ>/5 — <ETYKIETA (np. Dobrze 🙂)>
🆔 ID: <ENTRY_ID>
```

---

## Tabela obsługi błędów

| Sytuacja | Działanie |
|----------|-----------|
| Brak user_id w auth.users | Poinformuj i zatrzymaj się |
| Błąd INSERT (naruszenie constraint, typów itp.) | Pokaż komunikat SQL i zatrzymaj się |
| Weryfikacja zwraca 0 wierszy | Poinformuj o niepewności zapisu |

---

## Przykładowe wywołanie

**Użytkownik:**
`/add-diary-entry Dziś miałem naprawdę ciężki dzień w pracy. Wszystko szło nie tak, a spotkanie się przeciągnęło. Jestem wykończony.`

**Oczekiwane działanie Claude:**
1. Data → dzisiaj (`2026-06-04`)
2. Nastrój → 2 (Źle 😔) — zmęczenie, frustracja, „ciężki dzień"
3. Tytuł → `Ciężki dzień w pracy`
4. content → `<p>Dziś miałem naprawdę ciężki dzień w pracy. Wszystko szło nie tak, a spotkanie się przeciągnęło. Jestem wykończony.</p>`
5. Pobiera `USER_ID` → INSERT z `gen_random_bytes` → weryfikacja SELECT → raportuje sukces
