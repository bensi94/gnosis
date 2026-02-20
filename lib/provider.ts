import { claudeProvider } from './providers/claude';
import { geminiProvider } from './providers/gemini';

export interface LLMProvider {
  name: string;
  models: { id: string; label: string; quick?: boolean }[];

  /** Streaming call — used for review generation */
  generate(opts: {
    content: string;
    systemPrompt: string;
    model: string;
    thinking: boolean;
    onChunk?: (chunk: string, isThinking: boolean) => void;
  }): Promise<string>;

  /** Non-streaming call — used for smart imports */
  quick(opts: {
    content: string;
    systemPrompt: string;
    model: string;
  }): Promise<string>;
}

const providers: Record<string, LLMProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
};

export function getProvider(name: string): LLMProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: ${name}`);
  return provider;
}
