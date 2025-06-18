'use client';

import { useEffect, useRef, useState } from 'react';
import { RustpotterService } from 'rustpotter-worklet';
import { useWakeWordStore } from './wakeWordStore';

export default function WakeWordDetector() {
  const [isListening, setIsListening] = useState(false);
  const [detections, setDetections] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const rustpotterRef = useRef<RustpotterService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);

  const cleanup = () => {
    try {
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      workletNodeRef.current?.disconnect();
      workletNodeRef.current = null;
      rustpotterRef.current?.disposeProcessorNode?.();
      rustpotterRef.current?.close?.();
      rustpotterRef.current = null;
      audioContextRef.current?.close();
      audioContextRef.current = null;
    } catch (err) {
      console.warn('[Cleanup] Error:', err);
    }
  };

  useEffect(() => cleanup, []);

  const startListening = async () => {
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

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();

      const rustpotter = await RustpotterService.new(
        audioContext.sampleRate,
        {
          workletPath: '/static/rustpotter-worklet.js',
          workerPath: '/static/rustpotter-worker.js',
          wasmPath: '/static/rustpotter_wasm_bg.wasm',
          threshold: 0.5,
          averagedThreshold: 0.20,
          gain: 1.2,
        }
      );

      rustpotterRef.current = rustpotter;

      rustpotter.onDetection((detection: any) => {
        const msg = `[${new Date().toLocaleTimeString()}] ${JSON.stringify(detection)}`;
        setDetections(prev => [...prev, msg]);

        // Update global store
        useWakeWordStore.getState().setDetected(true);
        useWakeWordStore.getState().setLastDetection(msg);
        setTimeout(() => {
          useWakeWordStore.getState().setDetected(false);
        }, 500);
      });

      await rustpotter.addWakewordByPath('memory', '/static/memory.rpw');

      const workletNode = await rustpotter.getProcessorNode(audioContext);
      workletNodeRef.current = workletNode;

      const sourceNode = audioContext.createMediaStreamSource(stream);
      sourceNode.connect(workletNode);

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
    cleanup();
    setIsListening(false);
  };

  const clearDetections = () => setDetections([]);

  return (
    <div className="p-8 max-w-xl mx-auto bg-white shadow rounded space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Wake Word Detector</h1>

      <div className="flex items-center gap-4">
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={isLoading}
          className={`px-6 py-3 rounded font-semibold transition ${
            isLoading
              ? 'bg-gray-400 cursor-not-allowed'
              : isListening
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isLoading ? 'Loading...' : isListening ? 'Stop' : 'Start'}
        </button>

        <button
          onClick={clearDetections}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded font-medium"
        >
          Clear Detections
        </button>

        <div
          className={`w-4 h-4 rounded-full ${
            isListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          }`}
        />
        <span className="text-gray-600 text-sm">
          {isListening ? 'Listening...' : 'Not listening'}
        </span>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">Last Wake Word Status</h2>
        <div className="p-4 bg-gray-50 border rounded text-sm overflow-x-auto">
          {detections.length > 0 ? (
            <pre>{detections[detections.length - 1]}</pre>
          ) : (
            <p className="text-gray-500 italic">No detections yet...</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">All Detections ({detections.length})</h2>
        <div className="p-4 bg-gray-100 border rounded h-48 overflow-y-auto text-sm font-mono whitespace-pre-wrap">
          {detections.length === 0 ? (
            <p className="text-gray-500 italic">No detections yet...</p>
          ) : (
            detections.map((d, i) => <div key={i}>{d}</div>)
          )}
        </div>
      </div>
    </div>
  );
}
