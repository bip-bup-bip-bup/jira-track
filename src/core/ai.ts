import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AIProvider, ParseContext, WorklogEntry } from '../types';

class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-haiku-4-5') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async parse(input: string, context: ParseContext): Promise<WorklogEntry[]> {
    const prompt = buildPrompt(input, context);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return parseResponse(text);
  }
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-5-mini') {
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

function buildPrompt(input: string, context: ParseContext): string {
  const aliasesText = context.aliases.length > 0
    ? context.aliases.map(a => `  - "${a.keyword}" → ${a.task}${a.description ? ' (' + a.description + ')' : ''}`).join('\n')
    : '  (no aliases defined yet)';

  const recentTasksText = context.recentTasks.length > 0
    ? context.recentTasks.join(', ')
    : 'none';

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const dayName = days[now.getDay()];

  return `
You are a worklog parser for Jira time tracking.

Project key: ${context.projectKey}

Available task aliases (match by SEMANTIC MEANING, not exact text):
${aliasesText}

Recent tasks: ${recentTasksText}

Rules:
1. Match activities to aliases by meaning (e.g., "созванивался" → "созвоны")
2. If user specifies explicit task key (${context.projectKey}-XXX), use it
3. If activity matches alias semantically, substitute task key directly
4. If unsure which task to use, leave task as null
5. Parse dates: support Russian/English, relative dates (вчера, yesterday, сегодня, today)
6. Parse time: hours (ч, h, часа, hours), minutes (м, m, минут, min)
7. Date format in response: YYYY-MM-DD
8. Activity should be descriptive (what was done)
9. PERIODS: If user specifies a period (неделю, последние N дней, etc):
   - Create separate entries for each WORKDAY (Mon-Fri) in the period
   - Distribute hours equally across workdays
   - "неделю" = last 5 workdays (Mon-Fri)
   - "последние 3 дня" = last 3 workdays
   - Skip weekends (Sat, Sun)

Current date: ${todayISO} (${dayName}). Calculate all relative dates from this.

User input: "${input}"

Return ONLY valid JSON array, no other text or markdown:
[
  {
    "activity": "description of work",
    "task": "${context.projectKey}-XXX or null",
    "hours": number,
    "date": "YYYY-MM-DD"
  }
]

Examples:
Input: "вчера ${context.projectKey}-123 разработка 3ч"
Output: [{"activity":"разработка","task":"${context.projectKey}-123","hours":3,"date":"${todayISO} minus 1 day"}]
→ Use actual calculated date, not the text above

Input: "сегодня митинг 1ч"
Output: [{"activity":"митинг","task":null,"hours":1,"date":"${todayISO}"}]

Input: "неделю созвоны каждый день по 1.5 часа"
→ Create 5 entries, one per workday (Mon-Fri) of LAST week. Calculate each date from current date.

Input: "последние 3 дня ревью по 2 часа"
→ Create 3 entries for the last 3 workdays (skip weekends). Calculate from current date.

Input: "с 20 числа три дня подряд ревью 2ч"
→ Create 3 entries: 20th, 21st, 22nd of current month (skip weekends if any).
`.trim();
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

  if (raw.task && typeof raw.task === 'string' && !raw.task.match(/^[A-Z]+-\d+$/)) {
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
    return new AnthropicProvider(config.aiApiKey, config.aiModel ?? 'claude-haiku-4-5');
  }
  return new OpenAIProvider(config.aiApiKey, config.aiModel ?? 'gpt-5-mini');
}
