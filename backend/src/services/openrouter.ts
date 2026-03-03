import axios, { AxiosInstance } from 'axios';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  maxTokens: number;
  temperature?: number;
  stream?: boolean;
}

export class OpenRouterClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://veda-learn.app',
        'X-Title': 'Veda Learn',
        'Content-Type': 'application/json'
      }
    });
  }

  async chatCompletion(
    model: string,
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<string> {
    try {
      const response = await this.client.post('/chat/completions', {
        model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature ?? 0.7,
        stream: options.stream ?? false
      });

      return response.data.choices[0].message.content;
    } catch (error: any) {
      if (error.response?.status === 429) {
        console.warn(`Rate limited on ${model}, retrying with gpt-4o-mini`);
        return this.chatCompletion('openai/gpt-4o-mini', messages, options);
      }
      throw error;
    }
  }

  async embed(text: string, model: string = 'openai/text-embedding-3-small'): Promise<number[]> {
    try {
      const response = await this.client.post('/embeddings', {
        model,
        input: text
      });

      return response.data.data[0].embedding;
    } catch (error: any) {
      console.error('Embedding generation failed:', error.message);
      throw error;
    }
  }
}
