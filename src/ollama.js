// Minimal client for a local Ollama server (https://ollama.com).
// Everything here talks to localhost by default: nothing leaves your machine.

export const DEFAULT_HOST = 'http://127.0.0.1:11434';
export const DEFAULT_MODEL = 'gemma3:4b';

const SYSTEM_PROMPT = [
  'You are a calm, practical garden coach.',
  'Use ONLY the planting tasks the user lists. Never invent crops, dates or facts.',
  'Reply in plain text, at most 90 words, no markdown and no lists.',
  'End with one concrete task for today that needs hands and soil, not a phone.',
].join(' ');

function taskLine(task) {
  const timing =
    task.status === 'now'
      ? `window open until ${task.end}${task.closing ? ' (closing soon)' : ''}`
      : `window opens ${task.start}`;
  return `- ${task.verb} ${task.crop}: ${timing}. ${task.tip}`;
}

/** Build the chat messages for a list of planner tasks. */
export function buildMessages(tasks, date) {
  const user = [
    `Today is ${date}. These are the planting tasks for this week:`,
    ...tasks.map(taskLine),
    'Write the coach note.',
  ].join('\n');
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: user },
  ];
}

/** Ask the local model for a short coach note about `tasks`. */
export async function coachNote(
  tasks,
  { date, host = DEFAULT_HOST, model = DEFAULT_MODEL, fetchImpl = fetch, timeoutMs = 90_000 },
) {
  const response = await fetchImpl(`${host}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: false,
      messages: buildMessages(tasks, date),
      options: { temperature: 0.4, num_predict: 260 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`Ollama responded with HTTP ${response.status}`);

  const data = await response.json();
  const text = data?.message?.content?.trim();
  if (!text) throw new Error('Ollama returned an empty reply');
  return text;
}

/** Check whether Ollama is reachable and the configured model is pulled. */
export async function modelStatus({
  host = DEFAULT_HOST,
  model = DEFAULT_MODEL,
  fetchImpl = fetch,
  timeoutMs = 2_000,
} = {}) {
  try {
    const response = await fetchImpl(`${host}/api/tags`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { up: false, hasModel: false };
    const data = await response.json();
    const wanted = model.includes(':') ? model : `${model}:latest`;
    const hasModel = (data?.models ?? []).some((m) => m.name === wanted || m.model === wanted);
    return { up: true, hasModel };
  } catch {
    return { up: false, hasModel: false };
  }
}
