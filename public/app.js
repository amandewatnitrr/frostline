import { plan } from './js/planner.js';

const $ = (selector) => document.querySelector(selector);

const form = $('#form');
const errorBox = $('#error');
const card = $('#card');
const groups = $('#groups');
const coach = $('#coach');
const STORAGE_KEY = 'frostline:frost-dates';

const GROUPS = [
  { key: 'closing', title: 'Closing soon', test: (t) => t.status === 'now' && t.closing },
  { key: 'now', title: 'Do now', test: (t) => t.status === 'now' && !t.closing },
  { key: 'soon', title: 'Coming up', test: (t) => t.status === 'soon' },
];

let requestId = 0;

function todayIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function save(values) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Storage can be blocked; the app works without it.
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function timing(task) {
  if (task.status === 'soon') {
    return task.daysUntilStart === 1 ? 'opens tomorrow' : `opens in ${task.daysUntilStart} days`;
  }
  if (task.daysLeft === 0) return 'last day';
  return task.daysLeft === 1 ? '1 day left' : `${task.daysLeft} days left`;
}

function render(tasks, date) {
  groups.replaceChildren();
  $('#card-date').textContent = date;

  if (tasks.length === 0) {
    groups.append(el('p', 'empty', 'Nothing to sow or plant this week. Go and look at your soil instead.'));
    return;
  }

  for (const group of GROUPS) {
    const items = tasks.filter(group.test);
    if (items.length === 0) continue;

    const section = el('section', `group group-${group.key}`);
    section.append(el('h3', null, group.title));
    const list = el('ul', 'tasks');
    for (const task of items) {
      const li = el('li', 'task');
      li.append(el('span', 'box'));
      const body = el('div', 'task-body');
      body.append(el('strong', null, `${task.verb} ${task.crop}`));
      body.append(el('span', 'when', ` ${timing(task)} (${task.start} to ${task.end})`));
      body.append(el('p', 'tip', task.tip));
      li.append(body);
      list.append(li);
    }
    section.append(list);
    groups.append(section);
  }
}

async function loadCoach(values, id) {
  coach.textContent = 'Asking the local model…';
  try {
    const response = await fetch('/api/advice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    });
    const data = await response.json();
    if (id !== requestId) return; // a newer request replaced this one
    if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
    coach.textContent = data.advice;
  } catch (err) {
    if (id !== requestId) return;
    coach.textContent = `No coach note this time (${err.message}). The checklist above works without it.`;
  }
}

async function loadStatus() {
  const status = $('#status');
  try {
    const response = await fetch('/api/health');
    const { model, ollama } = await response.json();
    if (!ollama.up) {
      status.textContent = 'Ollama is not running. The planner still works; start Ollama for coach notes.';
    } else if (!ollama.hasModel) {
      status.textContent = `Ollama is running but ${model} is missing. Run: ollama pull ${model}`;
    } else {
      status.textContent = `Local model ready: ${model}. Nothing leaves this machine.`;
    }
  } catch {
    status.textContent = 'Could not reach the Frostline server.';
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = {
    date: form.date.value,
    lastFrost: form.lastFrost.value.trim(),
    firstFrost: form.firstFrost.value.trim(),
  };

  let tasks;
  try {
    tasks = plan(values);
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.hidden = false;
    card.hidden = true;
    return;
  }

  errorBox.hidden = true;
  save({ lastFrost: values.lastFrost, firstFrost: values.firstFrost });
  render(tasks, values.date);
  card.hidden = false;
  requestId += 1;
  loadCoach(values, requestId);
});

$('#print').addEventListener('click', () => window.print());

const saved = loadSaved();
form.date.value = todayIso();
form.lastFrost.value = saved.lastFrost ?? '';
form.firstFrost.value = saved.firstFrost ?? '';
loadStatus();
