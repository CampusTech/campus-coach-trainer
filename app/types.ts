export type SessionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED";

export interface AgentConfig {
    name: string;
    publicDescription: string; // gives context to agent transfer tool
    instructions: string;
  }

export interface Session {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}
