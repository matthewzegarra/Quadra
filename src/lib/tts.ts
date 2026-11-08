import * as Speech from 'expo-speech';
import { Alert } from 'react-native';
import { create } from 'zustand';

// Texto a voz (botón "Escuchar"). En Android, expo-speech solo acepta el código de idioma
// sin región ("es"); con "es-PE" caía al idioma por defecto. Elegimos una voz en español si existe.

type TtsState = { speakingId: string | null };
export const useTts = create<TtsState>(() => ({ speakingId: null }));

let spanishVoice: string | undefined | null = null; // null = no buscada aún

async function findSpanishVoice(): Promise<string | undefined> {
  if (spanishVoice !== null) return spanishVoice;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const es = voices.filter((v) => v.language?.toLowerCase().startsWith('es'));
    const pick =
      es.find((v) => /us|419|mx|pe/i.test(v.language)) ?? es.find((v) => !/network/i.test(v.identifier)) ?? es[0];
    spanishVoice = pick?.identifier;
  } catch {
    spanishVoice = undefined;
  }
  return spanishVoice;
}

export async function speak(text: string, id = 'default'): Promise<void> {
  await Speech.stop();
  const voice = await findSpanishVoice();
  useTts.setState({ speakingId: id });
  Speech.speak(text, {
    language: 'es',
    voice,
    rate: 0.9,
    volume: 1,
    onDone: () => useTts.setState({ speakingId: null }),
    onStopped: () => useTts.setState({ speakingId: null }),
    onError: () => {
      useTts.setState({ speakingId: null });
      Alert.alert(
        'No se pudo leer en voz alta',
        'Tu celular no tiene una voz instalada. Ve a Ajustes → Accesibilidad → Texto a voz y descarga "Español".',
      );
    },
  });
}

export function stopSpeaking() {
  useTts.setState({ speakingId: null });
  return Speech.stop();
}
