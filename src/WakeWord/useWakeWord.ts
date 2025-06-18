'use client';

import { useWakeWordStore } from './wakeWordStore';

export const useWakeWord = () => {
  const detected = useWakeWordStore((s) => s.detected);
  const lastDetection = useWakeWordStore((s) => s.lastDetection);
  return { detected, lastDetection };
};
