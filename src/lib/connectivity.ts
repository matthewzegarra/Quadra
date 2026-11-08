import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { create } from 'zustand';

type ConnectivityState = {
  isOnline: boolean;
  setOnline: (v: boolean) => void;
};

/** Estado global de conexión. La UI nunca espera a la red: solo lo usa para banners y sync. */
export const useConnectivity = create<ConnectivityState>((set) => ({
  isOnline: true,
  setOnline: (isOnline) => set({ isOnline }),
}));

function toOnline(s: NetInfoState): boolean {
  // isInternetReachable puede ser null mientras se verifica: lo tratamos como conectado.
  return Boolean(s.isConnected) && s.isInternetReachable !== false;
}

/** Inicia la escucha de NetInfo. Devuelve la función para detenerla. */
export function startConnectivityListener(onReconnect?: () => void): () => void {
  let wasOnline = useConnectivity.getState().isOnline;
  return NetInfo.addEventListener((s) => {
    const online = toOnline(s);
    useConnectivity.getState().setOnline(online);
    if (online && !wasOnline) onReconnect?.();
    wasOnline = online;
  });
}
