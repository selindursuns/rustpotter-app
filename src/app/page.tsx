// import WakeWordDetector from '@/components/WakeWordDetector';

// export default function Home() {
//   return (
//     <main className="min-h-screen bg-gray-50">
//       <WakeWordDetector />
//     </main>
//   );
// }

'use client';

import WakeWordDetector from '@/WakeWord/WakeWordDetector';
import { useWakeWord } from '@/WakeWord/useWakeWord';

export default function SomeUI() {
  const { detected, lastDetection } = useWakeWord();

  return (
    <div>
      <WakeWordDetector />
      <p>Wake word: {detected ? '✅ YES' : '❌ NO'}</p>
      <p>Last: {lastDetection}</p>
    </div>
  );
}
