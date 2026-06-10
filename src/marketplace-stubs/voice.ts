export const DEFAULT_SEND_PHRASE = "grok send";

export function resolveVoiceKey(_opts?: {
  setting?: string;
  env?: Record<string, string | undefined>;
}): string | undefined {
  return undefined;
}

export function parseVoiceCommand(transcript: string, _sendPhrase?: string) {
  const text = (transcript || "").trim();
  return { text, send: false };
}