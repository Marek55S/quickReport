# QuickReport – instrukcja dla jury

## Linki

| Co | Adres |
| --- | --- |
| Aplikacja mieszkańca | https://quickreport-875960213491.europe-central2.run.app |
| Panel urzędnika | https://quickreport-875960213491.europe-central2.run.app/admin |
| Hasło do panelu | podane w formularzu zgłoszeniowym (repozytorium jest publiczne) |

Aplikację mieszkańca najlepiej otworzyć na telefonie (aparat i GPS). Na komputerze działa przeciąganie zdjęcia z dysku. Panel urzędnika najlepiej działa na komputerze.

## Scenariusz pokazu (ok. 5 minut)

1. **Zgłoszenie (telefon).** Otwórz aplikację → „Zgłoś problem” → zrób zdjęcie usterki (np. dziury, zniszczonej ławki, śmieci) → zezwól na lokalizację.
2. **Sprawdzenie.** AI proponuje kategorię, tytuł i treść pisma do urzędu. Możesz zmienić kategorię, poprawić tekst, wskazać miejsce na mapie albo dopisać własny opis – treść zaktualizuje się automatycznie.
3. **Wysłanie.** „Dalej” → „Zaloguj przez mObywatel” (symulacja) → „Potwierdź w mObywatel i wyślij”. Ekran końcowy pokazuje numer zgłoszenia.
4. **Łączenie duplikatów.** Zgłoś ten sam problem z tego samego miejsca w innej przeglądarce lub na innym telefonie – zamiast nowego zgłoszenia rośnie liczba zgłaszających i priorytet.
5. **Panel urzędnika (komputer).** Zaloguj się na `/admin`. Zgłoszenia są posortowane według liczby zgłaszających, z oceną zagrożenia AI i mapą. Wypróbuj wyszukiwarkę i filtry, „Otwórz w dużym oknie”, „Podgląd PDF” i „Wyślij pismo do …”, „Przyjmij do realizacji”, „Oznacz jako rozwiązane” ze zdjęciem po naprawie oraz zakładkę „Statystyki”.
6. **Status u mieszkańca (telefon).** „Moje zgłoszenia” → „Pokaż szczegóły”: oś Przyjęte → Wysłane do urzędu → W realizacji → Rozwiązane, pismo, zdjęcia przed i po.

Przełącznik PL / EN / UA jest w nagłówku aplikacji mieszkańca.

## Co jest symulowane w prototypie

- **mObywatel** – logowanie symulowane; dane osobowe są fikcyjne i stałe dla danej przeglądarki („Nie Ty?” zmienia osobę).
- **Doręczenie pisma** – pismo PDF powstaje naprawdę (do pobrania w panelu); wysyłka e-mail działa po skonfigurowaniu SMTP, w wersji pokazowej doręczenie jest symulowane i kończy się numerem potwierdzenia `UPO-…`.
- **Przydział do jednostek miasta** (ZDMK, ZZM, MPO, Wodociągi, Straż Miejska, UMK) – propozycja do potwierdzenia z urzędem.
- **Dane demo** – kilka przykładowych zgłoszeń w centrum Krakowa ze zdjęciami z Wikimedia Commons (zob. [ATTRIBUTION.md](../ATTRIBUTION.md)).

## Uruchomienie lokalne

Wymagania: Node.js 24, pnpm; do AI i bazy – projekt Google Cloud (Vertex AI, Firestore, Cloud Storage).

```bash
pnpm install
cp .env.example .env.local   # uzupełnij; AI_MOCK=1 działa bez Vertex AI
gcloud auth application-default login
pnpm dev                      # http://localhost:3000 i /admin
```

Szczegóły, zmienne środowiskowe i wdrożenie na Cloud Run: [README.md](../../README.md).
