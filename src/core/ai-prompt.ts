import type { ParseContext } from '../types';

export function buildPrompt(input: string, context: ParseContext): string {
  const aliasesText = context.aliases.length > 0
    ? context.aliases.map(a => `  - "${a.keyword}" \u2192 ${a.task}${a.description ? ' (' + a.description + ')' : ''}`).join('\n')
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
1. Match activities to aliases by meaning (e.g., "\u0441\u043e\u0437\u0432\u0430\u043d\u0438\u0432\u0430\u043b\u0441\u044f" \u2192 "\u0441\u043e\u0437\u0432\u043e\u043d\u044b")
2. If user specifies explicit task key (${context.projectKey}-XXX), use it
3. If activity matches alias semantically, substitute task key directly
4. If unsure which task to use, leave task as null
5. Parse dates: support Russian/English, relative dates (\u0432\u0447\u0435\u0440\u0430, yesterday, \u0441\u0435\u0433\u043e\u0434\u043d\u044f, today)
6. Parse time: hours (\u0447, h, \u0447\u0430\u0441\u0430, hours), minutes (\u043c, m, \u043c\u0438\u043d\u0443\u0442, min)
7. Date format in response: YYYY-MM-DD
8. Activity should be descriptive (what was done)
9. PERIODS: If user specifies a period (\u043d\u0435\u0434\u0435\u043b\u044e, \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 N \u0434\u043d\u0435\u0439, etc):
   - Create separate entries for each WORKDAY (Mon-Fri) in the period
   - Distribute hours equally across workdays
   - "\u043d\u0435\u0434\u0435\u043b\u044e" = last 5 workdays (Mon-Fri)
   - "\u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 3 \u0434\u043d\u044f" = last 3 workdays
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
Input: "\u0432\u0447\u0435\u0440\u0430 ${context.projectKey}-123 \u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430 3\u0447"
Output: [{"activity":"\u0440\u0430\u0437\u0440\u0430\u0431\u043e\u0442\u043a\u0430","task":"${context.projectKey}-123","hours":3,"date":"${todayISO} minus 1 day"}]
\u2192 Use actual calculated date, not the text above

Input: "\u0441\u0435\u0433\u043e\u0434\u043d\u044f \u043c\u0438\u0442\u0438\u043d\u0433 1\u0447"
Output: [{"activity":"\u043c\u0438\u0442\u0438\u043d\u0433","task":null,"hours":1,"date":"${todayISO}"}]

Input: "\u043d\u0435\u0434\u0435\u043b\u044e \u0441\u043e\u0437\u0432\u043e\u043d\u044b \u043a\u0430\u0436\u0434\u044b\u0439 \u0434\u0435\u043d\u044c \u043f\u043e 1.5 \u0447\u0430\u0441\u0430"
\u2192 Create 5 entries, one per workday (Mon-Fri) of LAST week. Calculate each date from current date.

Input: "\u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0435 3 \u0434\u043d\u044f \u0440\u0435\u0432\u044c\u044e \u043f\u043e 2 \u0447\u0430\u0441\u0430"
\u2192 Create 3 entries for the last 3 workdays (skip weekends). Calculate from current date.

Input: "\u0441 20 \u0447\u0438\u0441\u043b\u0430 \u0442\u0440\u0438 \u0434\u043d\u044f \u043f\u043e\u0434\u0440\u044f\u0434 \u0440\u0435\u0432\u044c\u044e 2\u0447"
\u2192 Create 3 entries: 20th, 21st, 22nd of current month (skip weekends if any).
`.trim();
}
