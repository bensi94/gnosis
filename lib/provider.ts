import { claudeProvider } from './providers/claude';
import { geminiProvider } from './providers/gemini';
import type { ModelId, Provider } from './types';

export interface LLMProvider {
  name: Provider;
  models: { id: ModelId; label: string; quick?: boolean }[];

  /** Streaming call — used for review generation */
  generate(opts: {
    content: string;
    systemPrompt: string;
    model: ModelId;
    thinking: boolean;
    onChunk?: (chunk: string, isThinking: boolean) => void;
  }): Promise<string>;

  /** Non-streaming call — used for smart imports */
  quick(opts: {
    content: string;
    systemPrompt: string;
    model: ModelId;
  }): Promise<string>;
}

const providers: Record<Provider, LLMProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
};

export function getProvider(name: Provider): LLMProvider {
  return providers[name];
}
