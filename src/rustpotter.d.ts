// rustpotter.d.ts
declare module 'rustpotter-worklet' {
    export class RustpotterService {
      static new(sampleRate: number, config?: any): Promise<RustpotterService>;
      onDetection(callback: (detection: any) => void): void;
      addWakewordByPath(name: string, path: string): Promise<void>;
      getProcessorNode(audioContext: AudioContext): Promise<AudioWorkletNode>;
      disposeProcessorNode?(): void;
      close?(): void;
    }
  }