import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Field, Notice, Segmented } from '@/components/ui';
import { ensureMyProfile, remapIdentity, updateMyProfile } from '@/data/repositories/profiles';
import { startSyncEngine, syncNow } from '@/data/sync/SyncEngine';
import { useSession } from '@/features/session/store';
import { normalizePhone } from '@/lib/contact';
import { refreshLocation } from '@/lib/location';
import { initNotifications } from '@/lib/notify';
import { fetchMyRemoteProfile, resendConfirmation, saveDni, signInWithEmail } from '@/lib/supabase';
import { colors, elevation, MIN_TOUCH, radius, spacing } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO = require('../../../assets/brand/logo-tile.png');
const QUADRI = require('../../../assets/brand/quadri-mascota.png');
const RESEND_COOLDOWN_S = 60;

type Mode = 'signup' | 'login';

export default function BienvenidaScreen() {
  // `confirmado=1` llega cuando el vecino vuelve desde la página "Correo confirmado" (quadra://bienvenida?confirmado=1)
  const params = useLocalSearchParams<{ editar?: string; confirmado?: string }>();
  const editing = params.editar === '1';
  const session = useSession();
  const [mode, setMode] = useState<Mode>(session.email ? 'login' : 'signup');
  const [firstName, setFirstName] = useState(session.firstName ?? '');
  const [lastName, setLastName] = useState(session.lastName ?? '');
  const [email, setEmail] = useState(session.email ?? '');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState(session.whatsapp ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  /** La cuenta se creó pero falta abrir el correo de confirmación. */
  const [pending, setPending] = useState(false);
  /** Venía de "Crear cuenta": al entrar hay que guardar DNI y nombres. */
  const createdHere = useRef(false);
  const [cooldown, setCooldown] = useState(0);
  const [resent, setResent] = useState(false);

  const dniDigits = dni.replace(/\D/g, '');
  const emailOk = EMAIL.test(email.trim());
  const passOk = password.length >= 8;
  const namesOk = firstName.trim().length >= 2 && lastName.trim().length >= 2;
  const accountOk = emailOk && passOk && (mode === 'login' || (namesOk && dniDigits.length === 8));

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  /** Con sesión lista: une lo creado offline, guarda DNI/nombres y entra. */
  const finishAccount = useCallback(
    async (authId: string) => {
      const isNew = createdHere.current;
      const wa = normalizePhone(phone);
      await remapIdentity(session.localUserId, authId);
      session.setAuthUserId(authId);

      // Desde un celular nuevo: recuperar el nombre guardado en la nube en vez de pisarlo con "Vecino"
      let first = firstName.trim();
      let last = lastName.trim();
      let whatsapp = wa;
      if (!isNew && !first) {
        const remote = await fetchMyRemoteProfile(authId);
        first = remote?.first_name ?? remote?.display_name ?? session.firstName ?? '';
        last = remote?.last_name ?? session.lastName ?? '';
        whatsapp = wa ?? remote?.phone_whatsapp ?? null;
      }

      const newDni = isNew && dniDigits.length === 8;
      session.setAccount({ firstName: first || 'Vecino', lastName: last, email: email.trim(), dniLast4: newDni ? dniDigits.slice(-4) : session.dniLast4, whatsapp });
      await refreshLocation();
      await initNotifications(true);
      await updateMyProfile({
        display_name: `${first} ${last}`.trim() || 'Vecino',
        first_name: first || null,
        last_name: last || null,
        phone_whatsapp: whatsapp,
        demo_mode: session.demoMode ? 1 : 0,
      });
      await ensureMyProfile();

      // Con sesión nueva arrancamos la sincronización ya (antes esperaba a reabrir la app) y subimos
      // el perfil ANTES del DNI: el servidor guarda el DNI colgado del perfil y fallaba si aún no existía.
      startSyncEngine();
      await syncWithin(8000);
      if (newDni) {
        const saved = (await saveDni(dniDigits)) ?? (await syncWithin(8000).then(() => saveDni(dniDigits)));
        if (saved) useSession.getState().setAccount({ ...accountOf(useSession.getState()), dniLast4: saved });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/');
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [phone, firstName, lastName, email, dniDigits],
  );

  /** Reintenta entrar (después de confirmar el correo). `silent`: sin mensaje si aún no confirma. */
  const tryLogin = useCallback(
    async (silent = false) => {
      if (busy || !emailOk || !passOk) return;
      setBusy(true);
      if (!silent) setError(null);
      try {
        const auth = await signInWithEmail(email, password, 'login');
        if ('id' in auth) {
          setPending(false);
          await finishAccount(auth.id);
        } else if ('needsConfirmation' in auth) {
          if (!silent) setError('Todavía no vemos tu correo confirmado. Abre el enlace que te enviamos y vuelve a intentar.');
        } else if (!silent) setError(auth.error);
      } catch {
        if (!silent) setError('No pudimos guardar tu cuenta.');
      } finally {
        setBusy(false);
      }
    },
    [busy, emailOk, passOk, email, password, finishAccount],
  );

  // Al volver a la app desde el correo, probamos entrar solos
  useEffect(() => {
    if (!pending) return;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') void tryLogin(true);
    });
    return () => sub.remove();
  }, [pending, tryLogin]);

  useEffect(() => {
    if (params.confirmado === '1' && pending) void tryLogin(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.confirmado]);

  const submit = async () => {
    setTouched(true);
    if (busy) return;
    if (!accountOk) {
      setError('Revisa los datos marcados en rojo.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const auth = await signInWithEmail(email, password, mode);
      if ('error' in auth) {
        setError(auth.error);
        return;
      }
      if (mode === 'signup') createdHere.current = true;
      if ('needsConfirmation' in auth) {
        setPending(true);
        setCooldown(RESEND_COOLDOWN_S);
        return;
      }
      await finishAccount(auth.id);
    } catch {
      setError('No pudimos guardar tu cuenta.');
    } finally {
      setBusy(false);
    }
  };

  /** Sin cuenta (o editando): todo queda en este celular. */
  const enterLocal = async () => {
    if (busy) return;
    const name = `${firstName.trim()} ${lastName.trim()}`.trim() || session.displayName || '';
    if (name.length < 2) {
      if (editing) setError('Escribe cómo te llamas.');
      else Alert.alert('Tu nombre', 'Escribe al menos tu nombre para que los vecinos te reconozcan.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const wa = normalizePhone(phone);
      session.setIdentity(name, wa);
      if (firstName.trim()) {
        session.setAccount({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), dniLast4: session.dniLast4, whatsapp: wa });
      }
      await refreshLocation();
      await initNotifications(true);
      await updateMyProfile({ display_name: name, phone_whatsapp: wa, first_name: firstName.trim() || null, last_name: lastName.trim() || null });
      router.replace('/');
    } catch {
      setError('No pudimos guardar tus datos.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError(null);
    const err = await resendConfirmation(email);
    if (err) setError(err);
    else {
      setResent(true);
      setCooldown(RESEND_COOLDOWN_S);
    }
  };

  // ── Editar mis datos (desde Perfil) ─────────────────────────────────────────────
  if (editing) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <AppText variant="hero" bold accessibilityRole="header">
              Tu cuenta
            </AppText>
            <AppText color={colors.textSecondary}>Así te ven tus vecinos.</AppText>
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Nombres" value={firstName} onChangeText={setFirstName} placeholder="Rosa" autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Quispe" autoCapitalize="words" />
              </View>
            </View>
            <Field label="WhatsApp (opcional)" icon="logo-whatsapp" value={phone} onChangeText={setPhone} placeholder="999 999 999" keyboardType="phone-pad" hint="Solo se comparte cuando alguien acepta tu ayuda o escribes a un servicio." />
            {error ? <Notice tone="error" text={error} /> : null}
          </ScrollView>
          <View style={styles.footer}>
            <BigButton label="Guardar" icon="checkmark" onPress={() => void enterLocal()} disabled={busy} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Falta confirmar el correo ───────────────────────────────────────────────────
  if (pending) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: spacing.xxl }]}>
          <View style={styles.mailArt} accessible={false}>
            <View style={styles.mailCircle}>
              <Ionicons name="mail-open-outline" size={64} color={colors.primary} />
            </View>
            <Image source={QUADRI} style={styles.mailQuadri} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>
          <AppText variant="hero" bold accessibilityRole="header">
            Revisa tu correo
          </AppText>
          <AppText color={colors.inkSoft}>
            Te enviamos un enlace a <AppText bold>{email.trim()}</AppText>. Ábrelo y toca{' '}
            <AppText bold>“Confirmar mi correo”</AppText>. Luego vuelve aquí: entrarás solo.
          </AppText>
          <View style={styles.stepsBox}>
            {['Abre tu correo', 'Toca “Confirmar mi correo”', 'Vuelve a Quadra'].map((s, i) => (
              <View key={s} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <AppText bold variant="small" color={colors.primary}>
                    {i + 1}
                  </AppText>
                </View>
                <AppText style={{ flex: 1 }}>{s}</AppText>
              </View>
            ))}
          </View>
          {resent ? <Notice tone="ok" text="Te enviamos el correo otra vez." /> : null}
          {error ? <Notice tone="error" text={error} /> : <Notice text="¿No llega? Mira en Spam o Promociones. Puede tardar un par de minutos." />}
        </ScrollView>
        <View style={styles.footer}>
          <BigButton label={busy ? 'Revisando…' : 'Ya lo confirmé, entrar'} icon="log-in-outline" onPress={() => void tryLogin(false)} disabled={busy} />
          <BigButton
            label={cooldown > 0 ? `Reenviar correo en ${cooldown} s` : 'Reenviar correo'}
            icon="refresh"
            tone="outline"
            onPress={() => void resend()}
            disabled={cooldown > 0 || busy}
          />
          <View style={styles.links}>
            <TextLink
              label="Usar otro correo"
              onPress={() => {
                setPending(false);
                setResent(false);
                setError(null);
              }}
            />
            <TextLink label="Entrar sin cuenta" onPress={() => void enterLocal()} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Crear cuenta / Entrar ───────────────────────────────────────────────────────
  const showErr = (bad: boolean) => touched && bad;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <Image source={LOGO} style={styles.logo} accessibilityIgnoresInvertColors />
              <AppText bold variant="large" color={colors.white}>
                Quadra
              </AppText>
            </View>
            <View style={{ maxWidth: '66%', gap: spacing.xs }}>
              <AppText variant="title" bold color={colors.white} accessibilityRole="header">
                {mode === 'signup' ? 'Entra a tu cuadra' : 'Qué bueno verte'}
              </AppText>
              <AppText color={colors.accent}>
                {mode === 'signup' ? 'Servicios, favores y ayuda a pocas cuadras.' : 'Entra con tu correo y contraseña.'}
              </AppText>
            </View>
            <Image source={QUADRI} style={styles.heroQuadri} resizeMode="contain" accessibilityIgnoresInvertColors />
          </View>

          {params.confirmado === '1' ? <Notice tone="ok" title="¡Correo confirmado!" text="Entra con tu correo y contraseña." /> : null}

          <Segmented<Mode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
              setTouched(false);
            }}
            options={[
              { value: 'signup', label: 'Crear cuenta' },
              { value: 'login', label: 'Ya tengo cuenta' },
            ]}
          />

          {mode === 'signup' ? (
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Nombres" value={firstName} onChangeText={setFirstName} placeholder="Rosa" autoCapitalize="words" autoComplete="given-name" textContentType="givenName" invalid={showErr(firstName.trim().length < 2)} />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Quispe" autoCapitalize="words" autoComplete="family-name" textContentType="familyName" invalid={showErr(lastName.trim().length < 2)} />
              </View>
            </View>
          ) : null}

          <Field
            label="Correo"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="rosa@correo.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            invalid={showErr(!emailOk)}
            hint={showErr(!emailOk) ? 'Escribe un correo como rosa@correo.com' : undefined}
          />
          <Field
            label="Contraseña"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            invalid={showErr(!passOk)}
            hint={mode === 'signup' || showErr(!passOk) ? 'Al menos 8 letras o números.' : undefined}
          />
          {mode === 'signup' ? (
            <>
              <Field
                label="DNI"
                icon="card-outline"
                value={dni}
                onChangeText={setDni}
                placeholder="8 dígitos"
                keyboardType="number-pad"
                maxLength={8}
                invalid={showErr(dniDigits.length !== 8)}
                hint="No se muestra a nadie y no sirve de contraseña."
              />
              <Field label="WhatsApp (opcional)" icon="logo-whatsapp" value={phone} onChangeText={setPhone} placeholder="999 999 999" keyboardType="phone-pad" autoComplete="tel" hint="Solo se comparte cuando alguien acepta tu ayuda o escribes a un servicio." />
            </>
          ) : null}

          {error ? <Notice tone="error" text={error} /> : null}
        </ScrollView>

        <View style={styles.footer}>
          <BigButton
            label={busy ? 'Un momento…' : mode === 'signup' ? 'Crear mi cuenta' : 'Entrar'}
            icon={mode === 'signup' ? 'person-add-outline' : 'log-in-outline'}
            onPress={() => void submit()}
            disabled={busy}
            hint={!accountOk ? 'Completa los datos marcados' : undefined}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Entrar sin cuenta, solo en este celular"
            accessibilityHint="Tus datos se guardan en el celular. Podrás crear tu cuenta después."
            onPress={() => void enterLocal()}
            disabled={busy}
            style={styles.localBtn}
          >
            <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
            <AppText bold color={colors.primary}>
              Entrar sin cuenta, solo en este celular
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Sincroniza, pero sin dejar al vecino esperando más de `ms` con mala señal. */
function syncWithin(ms: number): Promise<void> {
  return Promise.race([syncNow(), new Promise<void>((r) => setTimeout(r, ms))]);
}

/** Datos de cuenta actuales (para cambiar solo un campo con setAccount). */
function accountOf(s: ReturnType<typeof useSession.getState>) {
  return { firstName: s.firstName ?? 'Vecino', lastName: s.lastName ?? '', email: s.email ?? '', dniLast4: s.dniLast4, whatsapp: s.whatsapp };
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.textLink}>
      <AppText bold color={colors.primary} style={{ textDecorationLine: 'underline' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg + 8,
    padding: spacing.xl,
    gap: spacing.lg,
    overflow: 'hidden',
    minHeight: 200,
    ...elevation(2),
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logo: { width: 40, height: 40, borderRadius: 11 },
  heroQuadri: { position: 'absolute', right: -6, bottom: -10, width: 120, height: 146 },
  pair: { flexDirection: 'row', gap: spacing.md },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  localBtn: {
    minHeight: MIN_TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  mailArt: { alignSelf: 'center', width: 220, height: 170, marginBottom: spacing.sm },
  mailCircle: {
    position: 'absolute',
    left: 20,
    top: 10,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mailQuadri: { position: 'absolute', right: 0, bottom: 0, width: 84, height: 102 },
  stepsBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  links: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  textLink: { minHeight: MIN_TOUCH, justifyContent: 'center', paddingHorizontal: spacing.sm },
});
