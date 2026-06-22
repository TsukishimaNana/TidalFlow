import { useEffect, useState } from 'react';
import type { Task } from '@tidalflow/shared';
import { CATEGORY_MAP, DEFAULT_SETTINGS } from '@tidalflow/shared';
import SettingsPanel from './components/SettingsPanel';
import ReminderToast from './components/ReminderToast';
import { useReminder } from './hooks/useReminder';

const todayTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Review the current sprint slice',
    description: 'Confirm the next concrete task before opening new work.',
    category: 'programming',
    status: 'in_progress',
    priority: 2,
    scheduledDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    estimatedMinutes: 25,
    parentTaskId: null,
    phaseOrder: null,
    source: 'manual',
    isRecurring: false,
    recurringRule: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 'task-2',
    title: 'Water and stretch break',
    description: 'A short reset keeps the next block easier to start.',
    category: 'health',
    status: 'pending',
    priority: 1,
    scheduledDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    estimatedMinutes: 5,
    parentTaskId: null,
    phaseOrder: null,
    source: 'manual',
    isRecurring: true,
    recurringRule: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  },
  {
    id: 'task-3',
    title: 'Capture loose follow-ups',
    description: 'Move scattered notes into the task queue.',
    category: 'life',
    status: 'pending',
    priority: 0,
    scheduledDate: new Date().toISOString().slice(0, 10),
    dueDate: null,
    estimatedMinutes: 15,
    parentTaskId: null,
    phaseOrder: null,
    source: 'manual',
    isRecurring: false,
    recurringRule: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null
  }
];

const statusLabels: Record<Task['status'], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  postponed: 'Postponed'
};

const priorityLabels = ['Normal', 'Important', 'Urgent'];

type AppView = 'main' | 'settings';

function App(): JSX.Element {
  const [view, setView] = useState<AppView>('main');
  const { reminders, dismissReminder } = useReminder();
  const activeTask = todayTasks.find((task) => task.status === 'in_progress') ?? todayTasks[0];
  const totalMinutes = todayTasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);

  useEffect(() => {
    return window.tidalflow.navigation?.onShowSettings(() => {
      setView('settings');
    });
  }, []);

  if (view === 'settings') {
    return <SettingsPanel onClose={() => setView('main')} />;
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <ReminderToast reminders={reminders} onDismiss={dismissReminder} />
      <section className="mx-auto grid min-h-screen w-full max-w-6xl gap-6 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">TidalFlow</p>
              <h1 className="mt-2 text-4xl font-semibold text-stone-950">Today&apos;s focus plan</h1>
            </div>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setView('settings')}
                aria-label="打开设置"
                title="设置"
                className="flex h-11 w-11 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
              >
                <span aria-hidden="true" className="text-xl leading-none">⚙</span>
              </button>
              <div className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
                <p className="font-medium text-stone-900">{DEFAULT_SETTINGS.workHours.start} - {DEFAULT_SETTINGS.workHours.end}</p>
                <p>Work window</p>
              </div>
            </div>
          </header>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-teal-700">Current block</p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">{activeTask.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">{activeTask.description}</p>
              </div>
              <span className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                {priorityLabels[activeTask.priority]}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <div className="rounded-md bg-stone-100 px-4 py-3">
                <p className="text-2xl font-semibold">{activeTask.estimatedMinutes}</p>
                <p className="text-sm text-stone-600">minutes</p>
              </div>
              <div className="rounded-md bg-stone-100 px-4 py-3">
                <p className="text-2xl font-semibold">{todayTasks.length}</p>
                <p className="text-sm text-stone-600">tasks</p>
              </div>
              <div className="rounded-md bg-stone-100 px-4 py-3">
                <p className="text-2xl font-semibold">{totalMinutes}</p>
                <p className="text-sm text-stone-600">planned</p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-teal-700">Queue</p>
              <h2 className="mt-1 text-xl font-semibold text-stone-950">Next steps</h2>
            </div>
            <span className="rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-700">
              {DEFAULT_SETTINGS.reminders.waterStretchIntervalMinutes} min reminder
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {todayTasks.map((task) => (
              <article key={task.id} className="rounded-md border border-stone-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-stone-950">{task.title}</h3>
                  <span className="text-sm text-stone-500">{task.estimatedMinutes} min</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-stone-600">{task.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className="rounded bg-stone-100 px-2 py-1 text-stone-700">{CATEGORY_MAP[task.category].label}</span>
                  <span className="rounded bg-stone-100 px-2 py-1 text-stone-700">{statusLabels[task.status]}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
