// Advisor config — set NEXT_PUBLIC_ADVISOR_NAME / NEXT_PUBLIC_ADVISOR_EMAIL in .env.local
// to change without a code deploy. Falls back to the defaults below.

export const ADVISOR_NAME  = process.env.NEXT_PUBLIC_ADVISOR_NAME  ?? "Mireille Bakal";
export const ADVISOR_EMAIL = process.env.NEXT_PUBLIC_ADVISOR_EMAIL ?? "mireille@sparingconsulting.com";
