import { EventEmitter } from "node:events";

export class VoiceStreamer extends EventEmitter {
  get active(): boolean {
    return false;
  }
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
}