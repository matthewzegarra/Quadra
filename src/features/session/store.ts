import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { newId } from '@/lib/ids';

// Estado de sesión y preferencias del vecino. Persistido en kv-store (SQLite) con lecturas
// síncronas para que el primer render ya sepa si mostrar el tutorial.

const K = {
  localUserId: 'ayni.localUserId',
  authUserId: 'ayni.authUserId',
  displayName: 'ayni.displayName',
  firstName: 'ayni.firstName',
  lastName: 'ayni.lastName',
  email: 'ayni.email',
  dniLast4: 'ayni.dniLast4',
  whatsapp: 'ayni.whatsapp',
  onboardingDone: 'ayni.onboardingDone',
  coachDone: 'ayni.coachDone',
  easyMode: 'ayni.easyMode',
  demoMode: 'ayni.demoMode',
  meshEnabled: 'ayni.meshEnabled',
  localEmergency: 'ayni.localEmergency',
} as const;

const readBool = (key: string, def = false) => {
  const v = Storage.getItemSync(key);
  return v === null ? def : v === '1';
};
const writeBool = (key: string, v: boolean) => Storage.setItemSync(key, v ? '1' : '0');

function ensureLocalUserId(): string {
  const existing = Storage.getItemSync(K.localUserId);
  if (existing) return existing;
  const id = newId();
  Storage.setItemSync(K.localUserId, id);
  return id;
}

type SessionState = {
  localUserId: string;
  /** id de Supabase Auth (anónimo). Se fija recién cuando los datos locales ya fueron remapeados. */
  authUserId: string | null;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  dniLast4: string | null;
  whatsapp: string | null;
  onboardingDone: boolean;
  coachDone: boolean;
  easyMode: boolean;
  demoMode: boolean;
  meshEnabled: boolean;
  /** Modo emergencia abierto localmente (botón SOS / pestaña Emergencia). */
  localEmergency: boolean;
  setAuthUserId: (id: string | null) => void;
  setIdentity: (name: string, whatsapp: string | null) => void;
  setAccount: (input: { firstName: string; lastName: string; email: string; dniLast4: string | null; whatsapp: string | null }) => void;
  clearAuth: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  completeCoach: () => void;
  setEasyMode: (v: boolean) => void;
  setDemoMode: (v: boolean) => void;
  setMeshEnabled: (v: boolean) => void;
  setLocalEmergency: (v: boolean) => void;
};

export const useSession = create<SessionState>((set) => ({
  localUserId: ensureLocalUserId(),
  authUserId: Storage.getItemSync(K.authUserId),
  displayName: Storage.getItemSync(K.displayName),
  firstName: Storage.getItemSync(K.firstName),
  lastName: Storage.getItemSync(K.lastName),
  email: Storage.getItemSync(K.email),
  dniLast4: Storage.getItemSync(K.dniLast4),
  whatsapp: Storage.getItemSync(K.whatsapp),
  onboardingDone: readBool(K.onboardingDone),
  coachDone: readBool(K.coachDone),
  easyMode: readBool(K.easyMode),
  demoMode: readBool(K.demoMode, true), // hackatón: activo por defecto
  meshEnabled: readBool(K.meshEnabled),
  localEmergency: readBool(K.localEmergency),
  setAuthUserId: (authUserId) => {
    if (authUserId) Storage.setItemSync(K.authUserId, authUserId);
    else Storage.removeItemSync(K.authUserId);
    set({ authUserId });
  },
  setIdentity: (displayName, whatsapp) => {
    Storage.setItemSync(K.displayName, displayName);
    if (whatsapp) Storage.setItemSync(K.whatsapp, whatsapp);
    else Storage.removeItemSync(K.whatsapp);
    set({ displayName, whatsapp });
  },
  setAccount: ({ firstName, lastName, email, dniLast4, whatsapp }) => {
    const displayName = `${firstName} ${lastName}`.trim();
    Storage.setItemSync(K.firstName, firstName);
    Storage.setItemSync(K.lastName, lastName);
    Storage.setItemSync(K.email, email);
    Storage.setItemSync(K.displayName, displayName);
    if (dniLast4) Storage.setItemSync(K.dniLast4, dniLast4);
    else Storage.removeItemSync(K.dniLast4);
    if (whatsapp) Storage.setItemSync(K.whatsapp, whatsapp);
    else Storage.removeItemSync(K.whatsapp);
    set({ firstName, lastName, email, dniLast4, displayName, whatsapp });
  },
  clearAuth: () => {
    Storage.removeItemSync(K.authUserId);
    Storage.removeItemSync(K.displayName);
    Storage.removeItemSync(K.email);
    Storage.removeItemSync(K.dniLast4);
    set({ authUserId: null, displayName: null, email: null, dniLast4: null });
  },
  completeOnboarding: () => {
    writeBool(K.onboardingDone, true);
    set({ onboardingDone: true });
  },
  resetOnboarding: () => {
    writeBool(K.onboardingDone, false);
    writeBool(K.coachDone, false);
    set({ onboardingDone: false, coachDone: false });
  },
  completeCoach: () => {
    writeBool(K.coachDone, true);
    set({ coachDone: true });
  },
  setEasyMode: (v) => {
    writeBool(K.easyMode, v);
    set({ easyMode: v });
  },
  setDemoMode: (v) => {
    writeBool(K.demoMode, v);
    set({ demoMode: v });
  },
  setMeshEnabled: (v) => {
    writeBool(K.meshEnabled, v);
    set({ meshEnabled: v });
  },
  setLocalEmergency: (v) => {
    writeBool(K.localEmergency, v);
    set({ localEmergency: v });
  },
}));

/** Id efectivo del vecino: el de Supabase si existe, si no el local. */
export function currentUserId(): string {
  const s = useSession.getState();
  return s.authUserId ?? s.localUserId;
}

export function useCurrentUserId(): string {
  return useSession((s) => s.authUserId ?? s.localUserId);
}

export function currentUserName(): string {
  return useSession.getState().displayName ?? 'Vecino';
}
