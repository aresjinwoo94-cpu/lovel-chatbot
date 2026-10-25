import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { Card, IconButton, Muted, SectionLabel, Segmented } from '@/components/ui';
import { type AdminStats, isAdminEmail } from '@/lib/admin';
import { callFunction } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useColors } from '@/lib/theme';

/**
 * Panel privado: quién entra, cuántos, de dónde, cuánto tiempo se quedan y hasta dónde llegan
 * (embudo hasta el checkout). Datos de la analítica propia (src/lib/analytics.ts) vía la función
 * admin-stats, que solo responde a la cuenta del responsable.
 */
type Range = '1' | '7' | '30' | '90';

const STEP_LABEL: Record<string, string> = {
  visit: 'Visitan la app',
  age_confirmed: 'Pasan la puerta 18+',
  welcome_started: 'Empiezan el cuestionario',
  character_created: 'Crean un personaje',
  message_sent: 'Envían un mensaje',
  account_created: 'Crean cuenta',
  paywall_shown: 'Ven la oferta Pro',
  checkout_started: 'Van al checkout',
  checkout_completed: 'Pagan Pro',
};

const EVENT_LABEL: Record<string, string> = {
  age_confirmed: '18+',
  welcome_started: 'cuestionario',
  character_created: 'personaje',
  message_sent: 'mensaje',
  voice_sent: 'voz',
  account_created: 'cuenta',
  paywall_shown: 'oferta',
  pro_viewed: 'Pro',
  checkout_started: 'checkout',
  checkout_completed: 'pago',
};

const duration = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ''}`.trim() : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐');
function countryName(cc: string) {
  if (!/^[A-Z]{2}$/.test(cc)) return 'Desconocido';
  try {
    return new Intl.DisplayNames(['es'], { type: 'region' }).of(cc) ?? cc;
  } catch {
    return cc;
  }
}
const pct = (a: number, b: number) => (b > 0 ? Math.round((100 * a) / b) : 0);
const when = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="min-w-[150px] flex-1 p-4">
      <Muted className="text-[13px]">{label}</Muted>
      <Text className="mt-1 font-semibold text-[26px] tracking-tighter text-ink">{value}</Text>
      {hint ? <Muted className="mt-0.5 text-[12px]">{hint}</Muted> : null}
    </Card>
  );
}

/** Fila con barra horizontal: etiqueta, valor y proporción (una sola serie, color de marca). */
function BarRow({ label, value, max, note, last }: { label: string; value: number; max: number; note?: string; last?: boolean }) {
  const colors = useColors();
  return (
    <View className={`px-4 py-3 ${last ? '' : 'border-b border-line'}`}>
      <View className="flex-row items-baseline">
        <Text className="flex-1 text-[14px] text-ink" numberOfLines={1}>
          {label}
        </Text>
        <Text className="ml-3 font-semibold text-[14px] text-ink">{value.toLocaleString('es')}</Text>
        {note ? <Muted className="ml-2 w-12 text-right text-[12px]">{note}</Muted> : null}
      </View>
      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle">
        <View style={{ width: `${max > 0 ? Math.max(2, (100 * value) / max) : 0}%`, height: '100%', borderRadius: 4, backgroundColor: colors.primary }} />
      </View>
    </View>
  );
}

/** Visitantes por día: columnas finas; al tocar una se ve su valor. */
function DailyChart({ data, days, until }: { data: AdminStats['daily']; days: number; until: string }) {
  const colors = useColors();
  const [sel, setSel] = useState<number | null>(null);
  // Rellena los días sin visitas para que el eje sea continuo.
  const series: { day: string; visitors: number; sessions: number }[] = [];
  const byDay = new Map(data.map((d) => [d.day, d]));
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(new Date(until).getTime() - i * 86400000).toISOString().slice(0, 10);
    series.push(byDay.get(d) ?? { day: d, visitors: 0, sessions: 0 });
  }
  const max = Math.max(1, ...series.map((d) => d.visitors));
  const shown = sel != null ? series[sel] : null;
  const label = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('es', { day: 'numeric', month: 'short' });
  return (
    <Card className="p-4">
      <View className="flex-row items-baseline">
        <Text className="flex-1 font-semibold text-[15px] text-ink">Visitantes por día</Text>
        <Muted className="text-[13px]">{shown ? `${label(shown.day)} · ${shown.visitors} visitantes · ${shown.sessions} sesiones` : `máx. ${max}`}</Muted>
      </View>
      <View className="mt-4 flex-row items-end" style={{ height: 140, gap: 2 }}>
        {series.map((d, i) => (
          <Pressable
            key={d.day}
            onPress={() => setSel(sel === i ? null : i)}
            onHoverIn={() => setSel(i)}
            accessibilityLabel={`${label(d.day)}: ${d.visitors} visitantes`}
            style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}
          >
            <View
              style={{
                height: `${d.visitors ? Math.max(3, (100 * d.visitors) / max) : 1}%`,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: d.visitors ? colors.primary : colors.line,
                opacity: sel == null || sel === i ? 1 : 0.45,
              }}
            />
          </Pressable>
        ))}
      </View>
      <View className="mt-2 flex-row justify-between">
        <Muted className="text-[12px]">{label(series[0].day)}</Muted>
        <Muted className="text-[12px]">hoy</Muted>
      </View>
    </Card>
  );
}

export default function AdminScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<Range>('30');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const allowed = isAdminEmail(session?.user.email);

  const load = useCallback(async () => {
    try {
      setStats(await callFunction<AdminStats>('admin-stats', { days: Number(range) }));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [range]);

  const refresh = () => {
    setLoading(true);
    void load();
  };

  useEffect(() => {
    if (!allowed) return;
    // carga al abrir (y al cambiar el periodo) y se actualiza sola cada minuto
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => void load(), 60000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [allowed, load]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const wide = width >= 900;

  if (!allowed) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream p-8">
        <Ionicons name="lock-closed-outline" size={28} color={colors.muted} />
        <Text className="mt-3 text-center text-[15px] text-ink">Esta sección es privada.</Text>
      </SafeAreaView>
    );
  }

  const t = stats?.totals;
  const visitors = stats?.funnel.find((f) => f.step === 'visit')?.visitors ?? 0;
  const col = (children: React.ReactNode) => <View style={{ flex: 1, minWidth: wide ? 0 : '100%' }}>{children}</View>;

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="h-14 flex-row items-center px-2">
        <IconButton icon="arrow-back" label="Volver" onPress={close} />
        <Text className="ml-1 flex-1 font-semibold text-[17px] text-ink">Panel privado</Text>
        {loading ? <ActivityIndicator color={colors.muted} style={{ marginRight: 12 }} /> : <IconButton icon="refresh" label="Actualizar" onPress={refresh} />}
      </View>
      <ScrollView contentContainerClassName="w-full max-w-[1100px] self-center px-4 pb-16" refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}>
        <Segmented<Range>
          value={range}
          onChange={(v) => {
            setLoading(true);
            setRange(v);
          }}
          options={[
            { id: '1', label: 'Hoy' },
            { id: '7', label: '7 días' },
            { id: '30', label: '30 días' },
            { id: '90', label: '90 días' },
          ]}
        />
        {error ? (
          <Card className="mt-4 p-4">
            <Text className="text-[14px] text-danger">No se pudieron cargar los datos: {error}</Text>
          </Card>
        ) : null}
        {!stats ? null : (
          <>
            <View className="mt-4 flex-row flex-wrap" style={{ gap: 10 }}>
              <Kpi label="Visitantes" value={t!.visitors.toLocaleString('es')} hint={`${t!.new_visitors} nuevos`} />
              <Kpi label="Sesiones" value={t!.sessions.toLocaleString('es')} hint={`${t!.signed_in_sessions} con cuenta o invitado`} />
              <Kpi label="Tiempo por sesión" value={duration(t!.median_seconds)} hint={`mediana · media ${duration(t!.avg_seconds)}`} />
              <Kpi label="En línea ahora" value={String(t!.online_now)} hint="últimos 2 min" />
              <Kpi label="Rebote" value={`${t!.bounce_rate} %`} hint="ven solo 1 pantalla" />
              <Kpi label="Pro activos" value={String(stats.pro.active)} hint={`de ${stats.pro.accounts} cuentas`} />
            </View>

            <View className="mt-4">
              <DailyChart data={stats.daily} days={Number(range) === 1 ? 7 : Number(range)} until={stats.generated_at} />
            </View>

            <View className="mt-2 flex-row flex-wrap" style={{ columnGap: 16 }}>
              {col(
                <>
                  <SectionLabel>Embudo hasta el checkout</SectionLabel>
                  <Card>
                    {stats.funnel.map((f, i) => (
                      <BarRow key={f.step} label={STEP_LABEL[f.step] ?? f.step} value={f.visitors} max={visitors} note={`${pct(f.visitors, visitors)} %`} last={i === stats.funnel.length - 1} />
                    ))}
                  </Card>
                  <Muted className="mt-2 px-1 text-[12px]">Personas distintas que llegaron a cada paso en el periodo (% sobre quienes visitaron).</Muted>
                </>,
              )}
              {col(
                <>
                  <SectionLabel>De dónde entran</SectionLabel>
                  <Card>
                    {stats.countries.length ? (
                      stats.countries.map((c, i) => (
                        <BarRow key={c.country} label={`${flag(c.country)}  ${countryName(c.country)}`} value={c.visitors} max={stats.countries[0].visitors} note={`${pct(c.visitors, t!.visitors)} %`} last={i === stats.countries.length - 1} />
                      ))
                    ) : (
                      <Muted className="p-4">Sin datos todavía.</Muted>
                    )}
                  </Card>
                  <Muted className="mt-2 px-1 text-[12px]">País aproximado según la zona horaria del dispositivo.</Muted>
                </>,
              )}
            </View>

            <View className="mt-2 flex-row flex-wrap" style={{ columnGap: 16 }}>
              {col(
                <>
                  <SectionLabel>Cómo llegan</SectionLabel>
                  <Card>
                    {stats.sources.length ? (
                      stats.sources.map((s, i) => <BarRow key={s.source} label={s.source} value={s.sessions} max={stats.sources[0].sessions} last={i === stats.sources.length - 1} />)
                    ) : (
                      <Muted className="p-4">Sin datos todavía.</Muted>
                    )}
                  </Card>
                  <SectionLabel>Dispositivos</SectionLabel>
                  <Card>
                    {stats.platforms.map((p, i) => (
                      <BarRow key={`${p.platform}-${p.device}`} label={`${p.platform === 'web' ? 'Web' : p.platform === 'ios' ? 'iOS' : p.platform === 'android' ? 'Android' : p.platform} · ${p.device}`} value={p.sessions} max={stats.platforms[0]?.sessions ?? 0} last={i === stats.platforms.length - 1} />
                    ))}
                  </Card>
                </>,
              )}
              {col(
                <>
                  <SectionLabel>Pantallas más vistas</SectionLabel>
                  <Card>
                    {stats.screens.map((s, i) => (
                      <BarRow key={s.route ?? i} label={s.route ?? '—'} value={s.views} max={stats.screens[0].views} note={`${s.visitors} pers.`} last={i === stats.screens.length - 1} />
                    ))}
                  </Card>
                </>,
              )}
            </View>

            <SectionLabel>Últimas visitas</SectionLabel>
            <Card>
              {stats.recent.length ? (
                stats.recent.map((r, i) => (
                  <View key={`${r.started_at}-${i}`} className={`px-4 py-3 ${i < stats.recent.length - 1 ? 'border-b border-line' : ''}`}>
                    <View className="flex-row items-baseline">
                      <Text className="flex-1 text-[14px] text-ink" numberOfLines={1}>
                        {flag(r.country ?? '')} {countryName(r.country ?? '')} · {r.platform === 'web' ? 'Web' : r.platform} {r.device ?? ''}
                      </Text>
                      <Muted className="ml-2 text-[12px]">{when(r.started_at)}</Muted>
                    </View>
                    <Muted className="mt-1 text-[13px]" numberOfLines={2}>
                      {duration(r.seconds)} · {r.screens} pantallas · entra por {r.entry_route ?? '/'}
                      {r.source ? ` · desde ${r.source}` : ''}
                      {r.events?.length ? ` · ${r.events.map((e) => EVENT_LABEL[e] ?? e).join(', ')}` : ''}
                    </Muted>
                  </View>
                ))
              ) : (
                <Muted className="p-4">Sin visitas en este periodo.</Muted>
              )}
            </Card>
            <Muted className="mt-3 px-1 text-[12px]">Actualizado {when(stats.generated_at)}. Se refresca solo cada minuto.</Muted>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
