import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useConnectivity } from '@/lib/connectivity';
import { stopSpeaking } from '@/lib/tts';

// Dictado por voz en español de Perú. Prefiere reconocimiento en el dispositivo (sirve sin internet
// en Android 13+ con el paquete de idioma descargado); si no, usa el servicio de Google.

export function useVoiceInput(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');
  const finalRef = useRef('');
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;
  const activeRef = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    if (activeRef.current) setListening(true);
  });
  useSpeechRecognitionEvent('result', (e) => {
    if (!activeRef.current) return;
    const text = e.results[0]?.transcript ?? '';
    setPartial(text);
    if (e.isFinal) finalRef.current = text;
  });
  useSpeechRecognitionEvent('end', () => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setListening(false);
    const text = (finalRef.current || '').trim();
    if (text) onFinalRef.current(text);
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    setListening(false);
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    if (e.error === 'language-not-supported' || e.error === 'service-not-allowed') {
      Alert.alert('Voz no disponible', 'Tu celular no tiene el reconocimiento de voz en español. Puedes escribir el texto.');
      return;
    }
    Alert.alert('No te escuchamos bien', 'Intenta de nuevo, más cerca del micrófono.');
  });

  const start = useCallback(async () => {
    await stopSpeaking();
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso de micrófono', 'Activa el micrófono para publicar con tu voz.');
      return;
    }
    finalRef.current = '';
    setPartial('');
    activeRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    let onDevice = false;
    try {
      onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    } catch {
      onDevice = false;
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'es-PE',
      interimResults: true,
      continuous: false,
      addsPunctuation: true,
      // Sin internet solo funciona el reconocimiento en el dispositivo
      requiresOnDeviceRecognition: onDevice && !useConnectivity.getState().isOnline,
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { listening, partial, start, stop };
}
