"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { Category, LocationSource } from "@/lib/types";

// Resident UI languages. The letter to the city office stays in Polish (the office's language).
export const LANGS = ["pl", "en", "uk"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = { pl: "PL", en: "EN", uk: "UA" };

const STORAGE_KEY = "quickreport.lang";
const EVENT = "quickreport:lang";

function readLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return LANGS.includes(stored as Lang) ? (stored as Lang) : "pl";
  } catch {
    return "pl";
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Storage unavailable (private mode): the choice lasts for this page only.
  }
  document.documentElement.lang = lang;
  window.dispatchEvent(new Event(EVENT));
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (onChange) => {
      window.addEventListener(EVENT, onChange);
      window.addEventListener("storage", onChange);
      return () => {
        window.removeEventListener(EVENT, onChange);
        window.removeEventListener("storage", onChange);
      };
    },
    readLang,
    () => "pl",
  );
}

export function useT() {
  const lang = useLang();
  // Keep <html lang> in sync for screen readers and hyphenation.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return DICT[lang];
}

type Dict = {
  mapLoading: string;
  errAnalyze: string;
  errSubmit: string;
  errGeneric: string;
  analyzingBar: string;
  analyzingTitle: string;
  analyzingBody: string;
  errorTitle: string;
  retry: string;
  myReports: string;
  heroA: string;
  heroB: string;
  heroSub: string;
  steps: [string, string, string];
  reportCta: string;
  gallery: string;
  clusterNote: string;
  dropTitle: string;
  dropBody: string;
  dropButton: string;
  reviewTitle: string;
  aiBadge: string;
  demoBadge: string;
  notDetectedTitle: string;
  notDetectedBody: string;
  category: string;
  change: string;
  collapse: string;
  title: string;
  letter: string;
  letterHint: string;
  letterPolish: string | null;
  needNotes: string;
  next: string;
  location: string;
  locDemo: string;
  locDevice: string;
  locPhoto: string;
  locMap: string;
  tapMap: string;
  noLocation: string;
  approx: string;
  notesRequired: string;
  notesOptional: string;
  notesPlaceholder: string;
  generating: string;
  useNotes: string;
  notesUpdated: string;
  notesIgnored: string;
  notesFailed: string;
  authTitle: string;
  authEyebrow: string;
  authHeading: string;
  authBody: string;
  authLoginTitle: string;
  authLoginBody: string;
  authLoginButton: string;
  authConnecting: string;
  authNotYou: string;
  authDevice: string;
  authCamera: string;
  authFictional: string;
  authUnavailable: string;
  fullName: string;
  sending: string;
  confirm: string;
  sent: string;
  ticketNo: string;
  reportedBy: string;
  merged: (n: number) => string;
  mergedBody: string;
  firstTitle: string;
  firstBody: string;
  track: string;
  another: string;
  back: string;
  step: (n: number) => string;
  photoAlt: string;
  refresh: string;
  loading: string;
  myError: string;
  emptyTitle: string;
  emptyBody: string;
  stages: [string, string, string, string];
  sentTo: (unit: string) => string;
  deviceOnly: string;
  signIn: string;
  signedInAs: (name: string) => string;
  signOut: string;
  signInFailed: string;
  stageOf: (n: number, label: string) => string;
  reportsCount: (n: number) => string;
  before: string;
  after: string;
  showDetails: string;
  hideDetails: string;
  dText: string;
  dPlace: string;
  dOpenMap: string;
  dReportedAt: string;
  dReporters: string;
  dLetter: string;
  dLetterNotSent: string;
  dOfficeNote: string;
  dPhotos: string;
  language: string;
  enlarge: string;
  viewer: { close: string; previous: string; next: string; of: (i: number, n: number) => string };
  categories: Record<Category, string>;
  locationSources: Record<LocationSource, string>;
};

const pl: Dict = {
  mapLoading: "Ładowanie mapy…",
  errAnalyze: "Nie udało się przeanalizować zdjęcia.",
  errSubmit: "Nie udało się wysłać zgłoszenia.",
  errGeneric: "Coś poszło nie tak.",
  analyzingBar: "Analiza zdjęcia",
  analyzingTitle: "Analizuję zdjęcie…",
  analyzingBody: "AI rozpoznaje problem i przygotowuje pismo do urzędu. To zwykle kilka sekund.",
  errorTitle: "Nie udało się",
  retry: "Spróbuj ponownie",
  myReports: "Moje zgłoszenia",
  heroA: "Zgłoś problem w mieście",
  heroB: "jednym zdjęciem",
  heroSub: "Bez formularzy i szukania właściwego wydziału. Resztą zajmie się AI i urząd.",
  steps: [
    "Zrób zdjęcie usterki lub bariery.",
    "AI rozpozna problem i napisze oficjalne pismo do urzędu.",
    "Sprawdź, potwierdź przez mObywatel i gotowe.",
  ],
  reportCta: "Zgłoś problem",
  gallery: "Wybierz zdjęcie z galerii",
  clusterNote: "Zgłoszenia z tego samego miejsca łączymy w jedno – im więcej osób, tym wyższy priorytet w urzędzie.",
  dropTitle: "Przeciągnij tutaj zdjęcie problemu",
  dropBody: "JPG, PNG lub WEBP. Lokalizację odczytamy ze zdjęcia albo wskażesz ją na mapie.",
  dropButton: "Wybierz zdjęcie z dysku",
  reviewTitle: "Sprawdź zgłoszenie",
  aiBadge: "Opis przygotowało AI",
  demoBadge: "Tryb demo – AI niedostępne",
  notDetectedTitle: "Nie rozpoznaliśmy problemu na zdjęciu",
  notDetectedBody: "Opisz go własnymi słowami – AI przygotuje zgłoszenie na tej podstawie. Możesz też wybrać kategorię ręcznie.",
  category: "Kategoria",
  change: "Zmień",
  collapse: "Zwiń",
  title: "Tytuł",
  letter: "Treść pisma do urzędu",
  letterHint: "Lokalizację i datę system dopisze automatycznie.",
  letterPolish: null,
  needNotes: "Dodaj opis lub wybierz kategorię, aby wysłać.",
  next: "Dalej – potwierdź i wyślij",
  location: "Lokalizacja",
  locDemo: "Demo",
  locDevice: "Moje położenie",
  locPhoto: "Ze zdjęcia",
  locMap: "Na mapie",
  tapMap: "Dotknij mapy, aby wskazać miejsce problemu.",
  noLocation: "Brak dostępu do lokalizacji – użyto lokalizacji demonstracyjnej.",
  approx: "ok.",
  notesRequired: "Twój opis problemu",
  notesOptional: "Twój opis (opcjonalnie)",
  notesPlaceholder: "Np. dziura jest tu od tygodnia, wieczorem jej nie widać, wpadł w nią rowerzysta",
  generating: "Generuję zgłoszenie…",
  useNotes: "Uwzględnij opis w zgłoszeniu",
  notesUpdated: "Zaktualizowano zgłoszenie na podstawie Twojego opisu.",
  notesIgnored:
    "Opis nie dotyczy zgłaszanego problemu, więc treść zgłoszenia nie została zmieniona. Opisz, co jest nie tak w tym miejscu.",
  notesFailed: "Nie udało się wygenerować zgłoszenia. Spróbuj ponownie.",
  authTitle: "Potwierdzenie tożsamości",
  authEyebrow: "Logowanie przez mObywatel · symulacja w prototypie",
  authHeading: "Potwierdź, że to Ty",
  authBody: "Urząd przyjmie zgłoszenie jako oficjalne pismo podpisane Twoimi danymi.",
  authLoginTitle: "Zaloguj się, aby wysłać zgłoszenie",
  authLoginBody: "Pismo do urzędu musi być podpisane. Zalogujesz się przez aplikację mObywatel – bez zakładania konta.",
  authLoginButton: "Zaloguj przez mObywatel",
  authConnecting: "Łączenie z mObywatel…",
  authNotYou: "Nie Ty? Zaloguj inną osobę",
  authDevice: "Urządzenie",
  authCamera: "Aparat (ze zdjęcia)",
  authFictional: "Prototyp: logowanie symulowane, dane osobowe są fikcyjne i stałe dla tej przeglądarki.",
  authUnavailable: "Logowanie jest niedostępne – zgłoszenie zostanie wysłane bez potwierdzenia tożsamości.",
  fullName: "Imię i nazwisko",
  sending: "Wysyłanie zgłoszenia…",
  confirm: "Potwierdź w mObywatel i wyślij",
  sent: "Zgłoszenie wysłane",
  ticketNo: "Numer zgłoszenia",
  reportedBy: "Zgłosili ten problem",
  merged: (n) => {
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
    return few ? `Ten problem zgłosiły już ${n} osoby` : `Ten problem zgłosiło już ${n} osób`;
  },
  mergedBody: "Dołączyliśmy Twoje zdjęcie do istniejącego zgłoszenia i podnieśliśmy jego priorytet w urzędzie.",
  firstTitle: "Jesteś pierwszą osobą, która to zgłosiła.",
  firstBody: "Urząd otrzymał nowe zgłoszenie z Twoim zdjęciem i lokalizacją.",
  track: "Śledź status w „Moich zgłoszeniach”",
  another: "Zgłoś kolejny problem",
  back: "Wstecz",
  step: (n) => `Krok ${n}/3`,
  photoAlt: "Zdjęcie zgłoszenia",
  refresh: "Odśwież",
  loading: "Ładowanie",
  myError: "Nie udało się pobrać zgłoszeń. Spróbuj ponownie.",
  emptyTitle: "Nic tu jeszcze nie ma",
  emptyBody: "Nie masz jeszcze zgłoszeń wysłanych z tego urządzenia.",
  stages: ["Przyjęte", "Wysłane do urzędu", "W realizacji", "Rozwiązane"],
  stageOf: (n, label) => `Etap ${n} z 4: ${label}`,
  sentTo: (unit) => `Pismo wysłane do: ${unit}`,
  deviceOnly: "Widzisz zgłoszenia wysłane z tego urządzenia. Zaloguj się przez mObywatel, aby przypisać je do swojego konta.",
  signIn: "Zaloguj przez mObywatel (symulacja)",
  signedInAs: (name) => `Zalogowano jako ${name} (symulacja mObywatel) – widzisz zgłoszenia przypisane do Twojego konta.`,
  signOut: "Wyloguj",
  signInFailed: "Logowanie jest teraz niedostępne.",
  reportsCount: (n) => `Zgłoszeń tego problemu: ${n}`,
  before: "Przed",
  after: "Po naprawie",
  showDetails: "Pokaż szczegóły",
  hideDetails: "Ukryj szczegóły",
  dText: "Treść zgłoszenia",
  dPlace: "Miejsce",
  dOpenMap: "Zobacz na mapie",
  dReportedAt: "Zgłoszono",
  dReporters: "Zgłaszających",
  dLetter: "Pismo do urzędu",
  dLetterNotSent: "Jeszcze nie wysłane – urząd sprawdza zgłoszenie.",
  dOfficeNote: "Informacja od urzędu",
  dPhotos: "Zdjęcia",
  language: "Język",
  enlarge: "Powiększ zdjęcie",
  viewer: { close: "Zamknij", previous: "Poprzednie zdjęcie", next: "Następne zdjęcie", of: (i, n) => `${i} z ${n}` },
  categories: {
    ROAD_DAMAGE: "Uszkodzenie drogi lub chodnika",
    ACCESSIBILITY_BARRIER: "Bariera architektoniczna",
    INFRASTRUCTURE_FAILURE: "Awaria infrastruktury",
    PUBLIC_TRANSPORT: "Przystanek i komunikacja",
    WASTE: "Odpady i zanieczyszczenia",
    GREENERY: "Zieleń miejska",
    WATER_SEWAGE: "Woda i kanalizacja",
    VANDALISM: "Wandalizm i graffiti",
    ILLEGAL_PARKING: "Nieprawidłowe parkowanie",
    OTHER: "Inny problem",
    NOT_DETECTED: "Nie rozpoznano problemu",
  },
  locationSources: { device: "lokalizacja telefonu", exif: "metadane zdjęcia", map: "wskazana na mapie", demo: "demo" },
};

const en: Dict = {
  mapLoading: "Loading map…",
  errAnalyze: "We couldn't analyse the photo.",
  errSubmit: "We couldn't send the report.",
  errGeneric: "Something went wrong.",
  analyzingBar: "Analysing photo",
  analyzingTitle: "Analysing your photo…",
  analyzingBody: "AI is identifying the problem and drafting a letter to the city office. This usually takes a few seconds.",
  errorTitle: "Something went wrong",
  retry: "Try again",
  myReports: "My reports",
  heroA: "Report a city problem",
  heroB: "with one photo",
  heroSub: "No forms, no hunting for the right department. AI and the city office handle the rest.",
  steps: [
    "Take a photo of the damage or barrier.",
    "AI identifies the problem and writes an official letter to the city office.",
    "Check it, confirm with mObywatel – done.",
  ],
  reportCta: "Report a problem",
  gallery: "Choose a photo from the gallery",
  clusterNote: "Reports from the same spot are merged – the more people report it, the higher its priority.",
  dropTitle: "Drop a photo of the problem here",
  dropBody: "JPG, PNG or WEBP. We read the location from the photo, or you can mark it on the map.",
  dropButton: "Choose a photo from your computer",
  reviewTitle: "Check your report",
  aiBadge: "Drafted by AI",
  demoBadge: "Demo mode – AI unavailable",
  notDetectedTitle: "We couldn't spot a problem in the photo",
  notDetectedBody: "Describe it in your own words – AI will draft the report from that. You can also pick a category yourself.",
  category: "Category",
  change: "Change",
  collapse: "Hide",
  title: "Title",
  letter: "Letter to the city office",
  letterHint: "The location and date are added automatically.",
  letterPolish: "The letter is written in Polish because it goes to the city office.",
  needNotes: "Add a description or choose a category to send.",
  next: "Next – confirm and send",
  location: "Location",
  locDemo: "Demo",
  locDevice: "My location",
  locPhoto: "From photo",
  locMap: "On the map",
  tapMap: "Tap the map to mark where the problem is.",
  noLocation: "Location unavailable – a demo location is used.",
  approx: "approx.",
  notesRequired: "Your description",
  notesOptional: "Your description (optional)",
  notesPlaceholder: "E.g. this pothole has been here for a week, you can't see it at night, a cyclist fell into it",
  generating: "Drafting the report…",
  useNotes: "Use my description in the report",
  notesUpdated: "The report has been updated with your description.",
  notesIgnored: "Your description doesn't relate to this problem, so the report wasn't changed. Describe what's wrong at this spot.",
  notesFailed: "We couldn't draft the report. Please try again.",
  authTitle: "Confirm your identity",
  authEyebrow: "Sign in with mObywatel · simulated in this prototype",
  authHeading: "Confirm it's you",
  authBody: "The city office accepts the report as an official letter signed with your details.",
  authLoginTitle: "Sign in to send your report",
  authLoginBody: "The letter to the city office must be signed. You sign in with the mObywatel app – no account needed.",
  authLoginButton: "Sign in with mObywatel",
  authConnecting: "Connecting to mObywatel…",
  authNotYou: "Not you? Sign in as someone else",
  authDevice: "Device",
  authCamera: "Camera (from photo)",
  authFictional: "Prototype: sign-in is simulated; personal data is fictional and stays the same in this browser.",
  authUnavailable: "Sign-in is unavailable – the report will be sent without identity confirmation.",
  fullName: "Full name",
  sending: "Sending the report…",
  confirm: "Confirm with mObywatel and send",
  sent: "Report sent",
  ticketNo: "Report number",
  reportedBy: "People who reported it",
  merged: (n) => `${n} people have reported this problem`,
  mergedBody: "We added your photo to the existing report and raised its priority at the city office.",
  firstTitle: "You're the first to report this.",
  firstBody: "The city office received a new report with your photo and location.",
  track: "Track the status in “My reports”",
  another: "Report another problem",
  back: "Back",
  step: (n) => `Step ${n}/3`,
  photoAlt: "Report photo",
  refresh: "Refresh",
  loading: "Loading",
  myError: "We couldn't load your reports. Please try again.",
  emptyTitle: "Nothing here yet",
  emptyBody: "You haven't sent any reports from this device yet.",
  stages: ["Received", "Sent to the city", "In progress", "Resolved"],
  stageOf: (n, label) => `Stage ${n} of 4: ${label}`,
  sentTo: (unit) => `Letter sent to: ${unit}`,
  deviceOnly: "You're seeing reports sent from this device. Sign in with mObywatel to link them to your account.",
  signIn: "Sign in with mObywatel (simulated)",
  signedInAs: (name) => `Signed in as ${name} (simulated mObywatel) – showing the reports linked to your account.`,
  signOut: "Sign out",
  signInFailed: "Sign-in is unavailable right now.",
  reportsCount: (n) => `Reports of this problem: ${n}`,
  before: "Before",
  after: "After repair",
  showDetails: "Show details",
  hideDetails: "Hide details",
  dText: "Report text",
  dPlace: "Place",
  dOpenMap: "Open map",
  dReportedAt: "Reported",
  dReporters: "People reporting",
  dLetter: "Letter to the city office",
  dLetterNotSent: "Not sent yet – the city office is reviewing the report.",
  dOfficeNote: "Note from the city office",
  dPhotos: "Photos",
  language: "Language",
  enlarge: "Enlarge photo",
  viewer: { close: "Close", previous: "Previous photo", next: "Next photo", of: (i, n) => `${i} of ${n}` },
  categories: {
    ROAD_DAMAGE: "Road or pavement damage",
    ACCESSIBILITY_BARRIER: "Accessibility barrier",
    INFRASTRUCTURE_FAILURE: "Infrastructure failure",
    PUBLIC_TRANSPORT: "Stop and public transport",
    WASTE: "Waste and litter",
    GREENERY: "Trees and green spaces",
    WATER_SEWAGE: "Water and sewage",
    VANDALISM: "Vandalism and graffiti",
    ILLEGAL_PARKING: "Illegal parking",
    OTHER: "Other problem",
    NOT_DETECTED: "No problem detected",
  },
  locationSources: { device: "phone location", exif: "photo metadata", map: "marked on map", demo: "demo" },
};

const uk: Dict = {
  mapLoading: "Завантаження мапи…",
  errAnalyze: "Не вдалося проаналізувати фото.",
  errSubmit: "Не вдалося надіслати звернення.",
  errGeneric: "Щось пішло не так.",
  analyzingBar: "Аналіз фото",
  analyzingTitle: "Аналізую фото…",
  analyzingBody: "ШІ розпізнає проблему й готує лист до міської ради. Зазвичай це займає кілька секунд.",
  errorTitle: "Не вдалося",
  retry: "Спробувати ще раз",
  myReports: "Мої звернення",
  heroA: "Повідомте про проблему в місті",
  heroB: "одним фото",
  heroSub: "Без анкет і пошуку потрібного відділу. Решту зроблять ШІ та міська рада.",
  steps: [
    "Сфотографуйте пошкодження або перешкоду.",
    "ШІ розпізнає проблему й напише офіційний лист до міської ради.",
    "Перевірте, підтвердьте через mObywatel – готово.",
  ],
  reportCta: "Повідомити про проблему",
  gallery: "Вибрати фото з галереї",
  clusterNote: "Звернення з одного місця об'єднуються – що більше людей повідомить, то вищий пріоритет.",
  dropTitle: "Перетягніть сюди фото проблеми",
  dropBody: "JPG, PNG або WEBP. Місце визначимо за фото, або ви позначите його на мапі.",
  dropButton: "Вибрати фото з комп'ютера",
  reviewTitle: "Перевірте звернення",
  aiBadge: "Опис підготував ШІ",
  demoBadge: "Демо-режим – ШІ недоступний",
  notDetectedTitle: "На фото не вдалося розпізнати проблему",
  notDetectedBody: "Опишіть її своїми словами – ШІ підготує звернення на цій основі. Можна також вибрати категорію вручну.",
  category: "Категорія",
  change: "Змінити",
  collapse: "Згорнути",
  title: "Заголовок",
  letter: "Текст листа до міської ради",
  letterHint: "Місце й дату система додасть автоматично.",
  letterPolish: "Лист написано польською, бо його отримує міська рада.",
  needNotes: "Додайте опис або виберіть категорію, щоб надіслати.",
  next: "Далі – підтвердити й надіслати",
  location: "Місце",
  locDemo: "Демо",
  locDevice: "Моє місце",
  locPhoto: "З фото",
  locMap: "На мапі",
  tapMap: "Торкніться мапи, щоб позначити місце проблеми.",
  noLocation: "Немає доступу до геолокації – використано демонстраційне місце.",
  approx: "бл.",
  notesRequired: "Ваш опис проблеми",
  notesOptional: "Ваш опис (необов'язково)",
  notesPlaceholder: "Напр. ця вибоїна тут уже тиждень, увечері її не видно, в неї впав велосипедист",
  generating: "Готую звернення…",
  useNotes: "Врахувати опис у зверненні",
  notesUpdated: "Звернення оновлено на основі вашого опису.",
  notesIgnored: "Опис не стосується цієї проблеми, тому текст звернення не змінено. Опишіть, що не так у цьому місці.",
  notesFailed: "Не вдалося підготувати звернення. Спробуйте ще раз.",
  authTitle: "Підтвердження особи",
  authEyebrow: "Вхід через mObywatel · симуляція в прототипі",
  authHeading: "Підтвердьте, що це ви",
  authBody: "Міська рада прийме звернення як офіційний лист, підписаний вашими даними.",
  authLoginTitle: "Увійдіть, щоб надіслати звернення",
  authLoginBody: "Лист до міської ради має бути підписаний. Ви входите через застосунок mObywatel – без реєстрації.",
  authLoginButton: "Увійти через mObywatel",
  authConnecting: "З'єднання з mObywatel…",
  authNotYou: "Не ви? Увійти як інша особа",
  authDevice: "Пристрій",
  authCamera: "Камера (з фото)",
  authFictional: "Прототип: вхід симульовано, особисті дані вигадані й незмінні в цьому браузері.",
  authUnavailable: "Вхід недоступний – звернення буде надіслано без підтвердження особи.",
  fullName: "Ім'я та прізвище",
  sending: "Надсилання звернення…",
  confirm: "Підтвердити в mObywatel і надіслати",
  sent: "Звернення надіслано",
  ticketNo: "Номер звернення",
  reportedBy: "Повідомили про проблему",
  merged: (n) => {
    const few = n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14);
    return few ? `Про цю проблему вже повідомили ${n} особи` : `Про цю проблему вже повідомили ${n} осіб`;
  },
  mergedBody: "Ми додали ваше фото до наявного звернення й підвищили його пріоритет у міській раді.",
  firstTitle: "Ви перші повідомили про це.",
  firstBody: "Міська рада отримала нове звернення з вашим фото й місцем.",
  track: "Стежте за статусом у «Моїх зверненнях»",
  another: "Повідомити про іншу проблему",
  back: "Назад",
  step: (n) => `Крок ${n}/3`,
  photoAlt: "Фото звернення",
  refresh: "Оновити",
  loading: "Завантаження",
  myError: "Не вдалося завантажити звернення. Спробуйте ще раз.",
  emptyTitle: "Тут поки нічого немає",
  emptyBody: "Ви ще не надсилали звернень із цього пристрою.",
  stages: ["Прийнято", "Надіслано до міської ради", "У роботі", "Вирішено"],
  stageOf: (n, label) => `Етап ${n} з 4: ${label}`,
  sentTo: (unit) => `Лист надіслано: ${unit}`,
  deviceOnly: "Ви бачите звернення, надіслані з цього пристрою. Увійдіть через mObywatel, щоб пов'язати їх з обліковим записом.",
  signIn: "Увійти через mObywatel (симуляція)",
  signedInAs: (name) => `Ви увійшли як ${name} (симуляція mObywatel) – показано звернення, пов'язані з вашим обліковим записом.`,
  signOut: "Вийти",
  signInFailed: "Вхід зараз недоступний.",
  reportsCount: (n) => `Звернень щодо цієї проблеми: ${n}`,
  before: "До",
  after: "Після ремонту",
  showDetails: "Показати деталі",
  hideDetails: "Сховати деталі",
  dText: "Текст звернення",
  dPlace: "Місце",
  dOpenMap: "Відкрити мапу",
  dReportedAt: "Повідомлено",
  dReporters: "Кількість заявників",
  dLetter: "Лист до міської ради",
  dLetterNotSent: "Ще не надіслано – міська рада перевіряє звернення.",
  dOfficeNote: "Інформація від міської ради",
  dPhotos: "Фото",
  language: "Мова",
  enlarge: "Збільшити фото",
  viewer: { close: "Закрити", previous: "Попереднє фото", next: "Наступне фото", of: (i, n) => `${i} з ${n}` },
  categories: {
    ROAD_DAMAGE: "Пошкодження дороги або тротуару",
    ACCESSIBILITY_BARRIER: "Архітектурний бар'єр",
    INFRASTRUCTURE_FAILURE: "Аварія інфраструктури",
    PUBLIC_TRANSPORT: "Зупинка й громадський транспорт",
    WASTE: "Сміття й забруднення",
    GREENERY: "Міська зелень",
    WATER_SEWAGE: "Вода й каналізація",
    VANDALISM: "Вандалізм і графіті",
    ILLEGAL_PARKING: "Неправильне паркування",
    OTHER: "Інша проблема",
    NOT_DETECTED: "Проблему не розпізнано",
  },
  locationSources: { device: "геолокація телефону", exif: "метадані фото", map: "позначено на мапі", demo: "демо" },
};

const DICT: Record<Lang, Dict> = { pl, en, uk };
