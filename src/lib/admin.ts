/**
 * Panel privado (/admin). El servidor (función admin-stats) es quien decide de verdad quién puede
 * ver los datos; esto solo sirve para mostrar u ocultar el acceso en la app.
 */
// EXPO_PUBLIC_ADMIN_EMAILS solo se usa en builds de prueba (QA del panel); en producción no existe.
export const ADMIN_EMAILS = ['aresjinwoo94@gmail.com', ...(process.env.EXPO_PUBLIC_ADMIN_EMAILS?.split(',').map((e: string) => e.trim().toLowerCase()) ?? [])];

export const isAdminEmail = (email: string | null | undefined) => !!email && ADMIN_EMAILS.includes(email.toLowerCase());

export interface AdminStats {
  days: number;
  generated_at: string;
  totals: {
    visitors: number;
    new_visitors: number;
    sessions: number;
    signed_in_sessions: number;
    avg_seconds: number;
    median_seconds: number;
    bounce_rate: number;
    online_now: number;
  };
  daily: { day: string; visitors: number; sessions: number }[];
  countries: { country: string; visitors: number }[];
  platforms: { platform: string; device: string; sessions: number }[];
  sources: { source: string; sessions: number }[];
  screens: { route: string; views: number; visitors: number }[];
  funnel: { step: string; visitors: number }[];
  recent: {
    started_at: string;
    country: string | null;
    platform: string | null;
    device: string | null;
    entry_route: string | null;
    screens: number;
    seconds: number;
    signed_in: boolean;
    source: string | null;
    events: string[] | null;
  }[];
  pro: { active: number; accounts: number };
}
