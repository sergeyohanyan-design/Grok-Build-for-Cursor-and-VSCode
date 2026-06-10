export class VoiceRecorder {
  get active(): boolean {
    return false;
  }
  async start(): Promise<void> {
    throw new Error("Voice input is not available in this build.");
  }
  async stop(): Promise<string> {
    throw new Error("Voice input is not available in this build.");
  }
  cancel(): void {}
}

export async function transcribeAudio(): Promise<string> {
  throw new Error("Voice input is not available in this build.");
}

export async function resolveWindowsAudioDevice(): Promise<string | undefined> {
  return undefined;
}