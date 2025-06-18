'use client';

import { useEffect, useRef, useState } from 'react';
import { RustpotterService } from 'rustpotter-worklet';

export default function WakeWordDetector() {
  const [isListening, setIsListening] = useState(false);
  const [detections, setDetections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rustpotterRef = useRef<RustpotterService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  // === Clean up ===
  const cleanup = () => {
    console.log('[Cleanup] Stopping...');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }
      if (rustpotterRef.current) {
        rustpotterRef.current.disposeProcessorNode?.();
        rustpotterRef.current.close?.();
        rustpotterRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    } catch (err) {
      console.warn('[Cleanup] Error:', err);
    }
  };

  useEffect(() => cleanup, []);

  const startListening = async () => {
    console.log('[Start] Initializing...');
    try {
      setIsLoading(true);
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        video: false,
      });
      streamRef.current = stream;
      console.log('[Start] Mic acquired:', stream.getAudioTracks()[0].getSettings());

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();
      const actualRate = audioContext.sampleRate;
      console.log('[Start] Using real hardware rate:', actualRate);

      const rustpotter = await RustpotterService.new(
        actualRate,
        {
          workletPath: '/static/rustpotter-worklet.js',
          workerPath: '/static/rustpotter-worker.js',
          wasmPath: '/static/rustpotter_wasm_bg.wasm',
          threshold: 0.4,
          averagedThreshold: 0.15,
        }
      );

      rustpotterRef.current = rustpotter;

      rustpotter.onDetection((detection: any) => {
        console.log('[Detection]', detection);
        setDetections(prev => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] ${JSON.stringify(detection)}`,
        ]);
      });

      console.log('[Start] Adding wakeword...');
    //   await rustpotter.addWakewordByPath('alexa', '/static/alexa.rpw');
    //   await rustpotter.addWakewordByPath('hey-memory', '/static/hey-memory.rpw');
      await rustpotter.addWakewordByPath('memory', '/static/memory.rpw');

      const workletNode = await rustpotter.getProcessorNode(audioContext);
      workletNodeRef.current = workletNode;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(workletNode);

      console.log('[Start] Listening...');
      setIsListening(true);
    } catch (err) {
      console.error('[Error]', err);
      setError(err instanceof Error ? err.message : String(err));
      cleanup();
    } finally {
      setIsLoading(false);
    }
  };

  const stopListening = () => {
    console.log('[Stop] Stopping...');
    cleanup();
    setIsListening(false);
  };

  const clearDetections = () => setDetections([]);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rustpotter Wake Word Detector</h1>
      <div className="space-y-4">
        <div className="flex gap-4">
          <button
            onClick={isListening ? stopListening : startListening}
            disabled={isLoading}
            className={`px-4 py-2 rounded font-medium ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isLoading ? 'Loading...' : isListening ? 'Stop Listening' : 'Start Listening'}
          </button>

          <button
            onClick={clearDetections}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium"
          >
            Clear Detections
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isListening ? 'Listening for wake words...' : 'Not listening'}
          </span>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Detections ({detections.length})</h2>
          <div className="bg-gray-100 rounded p-4 h-48 overflow-y-auto whitespace-pre-wrap">
            {detections.length === 0 ? (
              <p className="text-gray-500 italic">No detections yet...</p>
            ) : (
              <ul className="space-y-1">
                {detections.map((detection, index) => (
                  <li key={index} className="text-sm font-mono">
                    {detection}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}