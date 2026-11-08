import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Chip, Field } from '@/components/ui';
import { ensureMyProfile, remapIdentity, updateMyProfile } from '@/data/repositories/profiles';
import { useSession } from '@/features/session/store';
import { normalizePhone } from '@/lib/contact';
import { refreshLocation } from '@/lib/location';
import { initNotifications } from '@/lib/notify';
import { saveDni, signInWithEmail } from '@/lib/supabase';
import { colors, spacing } from '@/theme/tokens';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BienvenidaScreen() {
  const params = useLocalSearchParams<{ editar?: string }>();
  const editing = params.editar === '1';
  const session = useSession();
  const [mode, setMode] = useState<'signup' | 'login'>(session.email ? 'login' : 'signup');
  const [firstName, setFirstName] = useState(session.firstName ?? '');
  const [lastName, setLastName] = useState(session.lastName ?? '');
  const [email, setEmail] = useState(session.email ?? '');
  const [password, setPassword] = useState('');
  const [dni, setDni] = useState('');
  const [phone, setPhone] = useState(session.whatsapp ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dniDigits = dni.replace(/\D/g, '');
  const accountOk =
    EMAIL.test(email.trim()) &&
    password.length >= 8 &&
    (mode === 'login' || (firstName.trim().length >= 2 && lastName.trim().length >= 2 && dniDigits.length === 8));

  const enter = async (offline: boolean) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const wa = normalizePhone(phone);
      if (offline || editing) {
        const name = `${firstName.trim()} ${lastName.trim()}`.trim() || session.displayName || 'Vecino';
        if (name.trim().length < 2) {
          setError('Escribe cómo te llamas.');
          return;
        }
        session.setIdentity(name, wa);
        if (firstName.trim()) session.setAccount({ firstName: firstName.trim() || name, lastName: lastName.trim(), email: email.trim(), dniLast4: session.dniLast4, whatsapp: wa });
        await refreshLocation();
        await initNotifications(true);
        await updateMyProfile({ display_name: name, phone_whatsapp: wa, first_name: firstName.trim() || null, last_name: lastName.trim() || null });
        router.replace('/');
        return;
      }

      const auth = await signInWithEmail(email, password, mode);
      if ('error' in auth) {
        setError(auth.error);
        return;
      }
      await remapIdentity(session.localUserId, auth.id);
      session.setAuthUserId(auth.id);
      let last4: string | null = session.dniLast4;
      if (mode === 'signup') {
        last4 = await saveDni(dniDigits);
        if (!last4) last4 = dniDigits.slice(-4);
      }
      session.setAccount({
        firstName: firstName.trim() || session.firstName || 'Vecino',
        lastName: lastName.trim(),
        email: email.trim(),
        dniLast4: last4,
        whatsapp: wa,
      });
      await refreshLocation();
      await initNotifications(true);
      await updateMyProfile({
        display_name: `${firstName.trim()} ${lastName.trim()}`.trim() || 'Vecino',
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone_whatsapp: wa,
        demo_mode: session.demoMode ? 1 : 0,
      });
      await ensureMyProfile();
      router.replace('/');
    } catch {
      setError('No pudimos guardar tu cuenta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="hero" bold accessibilityRole="header">
            {editing ? 'Tu cuenta' : 'Entra a tu cuadra'}
          </AppText>
          <AppText color={colors.textSecondary}>
            {editing ? 'Así te ven tus vecinos.' : 'Tu DNI no se muestra y no sirve de contraseña.'}
          </AppText>

          {!editing ? (
            <View style={styles.modes}>
              <Chip label="Crear cuenta" selected={mode === 'signup'} onPress={() => setMode('signup')} />
              <Chip label="Ya tengo cuenta" selected={mode === 'login'} onPress={() => setMode('login')} />
            </View>
          ) : null}

          {mode === 'signup' || editing ? (
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <Field label="Nombres" value={firstName} onChangeText={setFirstName} placeholder="Rosa" autoCapitalize="words" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Quispe" autoCapitalize="words" />
              </View>
            </View>
          ) : null}

          {!editing ? (
            <>
              <Field label="Correo" value={email} onChangeText={setEmail} placeholder="rosa@correo.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
              <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry />
              {mode === 'signup' ? (
                <Field label="DNI" value={dni} onChangeText={setDni} placeholder="8 dígitos" keyboardType="number-pad" maxLength={8} />
              ) : null}
            </>
          ) : null}

          <Field label="WhatsApp (opcional)" value={phone} onChangeText={setPhone} placeholder="999 999 999" keyboardType="phone-pad" />
          <AppText variant="small" color={colors.textSecondary}>
            Tu número solo se comparte cuando alguien acepta ayudarte, o cuando escribes a un servicio.
          </AppText>
          {error ? (
            <AppText color={colors.danger} accessibilityRole="alert">
              {error}
            </AppText>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          {editing ? (
            <BigButton label="Guardar" icon="checkmark" onPress={() => void enter(true)} disabled={busy} />
          ) : (
            <>
              <BigButton
                label={busy ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}
                icon="home-outline"
                onPress={() => void enter(false)}
                disabled={!accountOk || busy}
              />
              <BigButton
                label="Entrar solo en este celular"
                icon="phone-portrait-outline"
                tone="outline"
                onPress={() => {
                  if (firstName.trim().length < 2 && mode === 'signup') {
                    Alert.alert('Tu nombre', 'Escribe al menos tu nombre para que los vecinos te reconozcan.');
                    return;
                  }
                  void enter(true);
                }}
                disabled={busy}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing.xxl },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pair: { flexDirection: 'row', gap: spacing.md },
  footer: { padding: spacing.xl, gap: spacing.sm },
});
