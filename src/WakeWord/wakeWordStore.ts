import { create } from 'zustand';

interface WakeWordState {
  detected: boolean;
  lastDetection: string | null;
  setDetected: (value: boolean) => void;
  setLastDetection: (msg: string) => void;
}

export const useWakeWordStore = create<WakeWordState>((set) => ({
  detected: false,
  lastDetection: null,
  setDetected: (value) => set({ detected: value }),
  setLastDetection: (msg) => set({ lastDetection: msg }),
}));
