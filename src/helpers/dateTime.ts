// src/helpers/dateTime.ts
//
// 📅🕰️ Date & Time helpers (RPG Renaissance)
//
// Objectif : centraliser tous les petits formats d’horodatage de l’app
// pour éviter les doublons, garantir un rendu cohérent et faciliter
// les changements de style plus tard.
//
// Conventions :
// - Locale par défaut : "fr-FR"
// - Les fonctions acceptent un ISO string (timestamptz) OU un Date.
// - Si la date est invalide -> retourne "" (string vide) pour éviter les crashes UI.
//
// Helpers principaux :
// - formatJournalTime : affichage compact pour la Chronique (HH:mm si aujourd’hui, sinon DD/MM)
// - isSameDay / isToday : utilitaires
// - formatTimeHM / formatDayMonth : briques de base
// - formatFullDateTime : debug / admin / détails

const DEFAULT_LOCALE = "fr-FR";

type DateInput = string | Date;

function toDate(input: DateInput): Date | null {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return null;
    return d;
}

/**
 * Vérifie si deux dates sont le même jour (timezone locale du client).
 */
export function isSameDay(a: DateInput, b: DateInput): boolean {
    const da = toDate(a);
    const db = toDate(b);
    if (!da || !db) return false;

    return (
        da.getDate() === db.getDate() &&
        da.getMonth() === db.getMonth() &&
        da.getFullYear() === db.getFullYear()
    );
}

/**
 * Vérifie si la date passée correspond à aujourd’hui (timezone locale du client).
 */
export function isToday(input: DateInput): boolean {
    return isSameDay(input, new Date());
}

/**
 * Formate une heure en HH:mm (ex: 07:58, 22:37).
 */
export function formatTimeHM(input: DateInput, locale: string = DEFAULT_LOCALE): string {
    const d = toDate(input);
    if (!d) return "";

    return d.toLocaleString(locale, {
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Formate un jour/mois en DD/MM (ex: 29/12).
 */
export function formatDayMonth(input: DateInput, locale: string = DEFAULT_LOCALE): string {
    const d = toDate(input);
    if (!d) return "";

    return d.toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
    });
}

/**
 * ✅ Format recommandé pour la Chronique / Journal :
 * - si date = aujourd’hui -> HH:mm
 * - sinon -> DD/MM
 *
 * Exemple :
 * - "2025-12-29T22:37:00Z" (aujourd’hui) -> "23:37" (selon timezone)
 * - "2025-12-26T03:41:00Z" -> "26/12"
 */
export function formatJournalTime(input: DateInput, locale: string = DEFAULT_LOCALE): string {
    const d = toDate(input);
    if (!d) return "";

    return isToday(d) ? formatTimeHM(d, locale) : formatDayMonth(d, locale);
}

/**
 * Format complet (utile pour debug / admin / logs).
 * Exemple : "29/12 22:37"
 */
export function formatFullDateTime(input: DateInput, locale: string = DEFAULT_LOCALE): string {
    const d = toDate(input);
    if (!d) return "";

    return d.toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Affichage long lisible (utile pour des pages détails).
 * Exemple : "29 décembre 2025"
 */
export function formatLongDate(input: DateInput, locale: string = DEFAULT_LOCALE): string {
    const d = toDate(input);
    if (!d) return "";

    return d.toLocaleDateString(locale, {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}
