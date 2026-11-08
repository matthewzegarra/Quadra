import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Field } from '@/components/ui';
import { MicButton } from '@/components/VoiceButton';
import { updateMyProfile } from '@/data/repositories/profiles';
import { useSession } from '@/features/session/store';
import { normalizePhone } from '@/lib/contact';
import { refreshLocation } from '@/lib/location';
import { initNotifications } from '@/lib/notify';
import { colors, spacing } from '@/theme/tokens';

// Registro mínimo (prompt.md §5): solo nombre y WhatsApp opcional. Nada de contraseñas ni códigos.
export default function BienvenidaScreen() {
  const setIdentity = useSession((s) => s.setIdentity);
  const [name, setName] = useState(useSession.getState().displayName ?? '');
  const [phone, setPhone] = useState(useSession.getState().whatsapp ?? '');
  const valid = name.trim().length >= 2;

  const save = async () => {
    const wa = normalizePhone(phone);
    setIdentity(name.trim(), wa);
    await refreshLocation();
    await initNotifications(true); // pide permiso de notificaciones (Android 13+) una sola vez
    await updateMyProfile({ display_name: name.trim(), phone_whatsapp: wa });
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="hero" bold accessibilityRole="header">
            ¿Cómo te llamas?
          </AppText>
          <AppText color={colors.textSecondary}>Así te reconocerán tus vecinos. No pedimos correo ni contraseña.</AppText>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field label="Tu nombre" value={name} onChangeText={setName} placeholder="Ej. Rosa Quispe" autoCapitalize="words" />
            </View>
            <View style={{ justifyContent: 'flex-end' }}>
              <MicButton onText={(t) => setName(t.replace(/^(me llamo|mi nombre es|soy)\s+/i, ''))} label="Dicta tu nombre" />
            </View>
          </View>
          <Field
            label="Tu WhatsApp (opcional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="999 999 999"
            keyboardType="phone-pad"
          />
          <AppText variant="small" color={colors.textSecondary}>
            Tu número solo se comparte con el vecino que tú elijas para ayudarte.
          </AppText>
        </ScrollView>
        <View style={styles.footer}>
          <BigButton label="Entrar a mi barrio" icon="home-outline" onPress={save} disabled={!valid} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  footer: { padding: spacing.xl },
});
