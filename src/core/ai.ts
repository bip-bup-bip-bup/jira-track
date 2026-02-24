import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AIProvider, ParseContext, WorklogEntry } from '../types';
import { isValidTaskKey } from '../utils/validation';
import { buildPrompt } from './ai-prompt';
import { DEFAULT_ANTHROPIC_MODEL, DEFAULT_OPENAI_MODEL, AI_MAX_TOKENS } from '../constants';

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_ANTHROPIC_MODEL) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async parse(input: string, context: ParseContext): Promise<WorklogEntry[]> {
    const prompt = buildPrompt(input, context);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: AI_MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseResponse(text);
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = DEFAULT_OPENAI_MODEL) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async parse(input: string, context: ParseContext): Promise<WorklogEntry[]> {
    const prompt = buildPrompt(input, context);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.choices[0]?.message?.content || '';
    return parseResponse(text);
  }
}

function parseResponse(text: string): WorklogEntry[] {
  // Extract JSON from markdown code blocks if present
  const jsonMatch = text.match(/```json?\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);

  if (!jsonMatch) {
    throw new Error('AI did not return valid JSON');
  }

  const jsonText = jsonMatch[1] || jsonMatch[0];
  const json = JSON.parse(jsonText);

  if (!Array.isArray(json)) {
    throw new Error('AI response is not an array');
  }

  return json.map(validateEntry);
}

function validateEntry(raw: any): WorklogEntry {
  if (!raw.activity || typeof raw.activity !== 'string') {
    throw new Error('Invalid activity');
  }

  if (raw.task && typeof raw.task === 'string' && !isValidTaskKey(raw.task)) {
    throw new Error(`Invalid task key: ${raw.task}`);
  }

  if (!raw.hours || typeof raw.hours !== 'number' || raw.hours <= 0 || raw.hours > 24) {
    throw new Error(`Invalid hours: ${raw.hours}`);
  }

  if (!raw.date || typeof raw.date !== 'string' || !raw.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error(`Invalid date: ${raw.date}`);
  }

  return {
    activity: raw.activity,
    task: raw.task || null,
    hours: raw.hours,
    date: raw.date
  };
}

export function createAIProvider(config: { aiProvider: 'anthropic' | 'openai'; aiApiKey: string; aiModel?: string | null }): AIProvider {
  if (config.aiProvider === 'anthropic') {
    return new AnthropicProvider(config.aiApiKey, config.aiModel ?? DEFAULT_ANTHROPIC_MODEL);
  }
  return new OpenAIProvider(config.aiApiKey, config.aiModel ?? DEFAULT_OPENAI_MODEL);
}
