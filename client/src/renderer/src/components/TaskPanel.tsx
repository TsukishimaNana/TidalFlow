import { useMemo, useState } from 'react';
import type { Task } from 'shared';
import { useTasks } from '../hooks/useTasks';
import TaskForm from './TaskForm';
import TaskItem from './TaskItem';

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const progressScoreA = a.status === 'in_progress' ? 0 : 1;
    const progressScoreB = b.status === 'in_progress' ? 0 : 1;

    if (progressScoreA !== progressScoreB) {
      return progressScoreA - progressScoreB;
    }

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '');
  });
}

export default function TaskPanel(): JSX.Element {
  const { tasks, isLoading, error, refreshTasks, createTask, updateTask, deleteTask, completeTask, postponeTask } = useTasks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);
  const remainingCount = tasks.filter((task) => task.status !== 'completed').length;

  function openCreateForm(): void {
    setEditingTask(null);
    setIsFormOpen(true);
  }

  function openEditForm(task: Task): void {
    setEditingTask(task);
    setIsFormOpen(true);
  }

  function closeForm(): void {
    setEditingTask(null);
    setIsFormOpen(false);
  }

  return (
    <main className="relative flex h-screen min-h-[560px] w-full min-w-[320px] flex-col overflow-hidden rounded-xl border border-white/60 bg-stone-50/95 text-stone-950 shadow-2xl backdrop-blur">
      <header className="shrink-0 border-b border-stone-200 bg-white/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">TidalFlow</p>
            <h1 className="truncate text-xl font-semibold text-stone-950">Today&apos;s Tasks</h1>
          </div>
          <button
            type="button"
            onClick={() => void refreshTasks()}
            disabled={isLoading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-lg text-stone-700 shadow-sm transition hover:bg-stone-100 disabled:cursor-wait disabled:opacity-60"
            aria-label="Refresh tasks"
          >
            ↻
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-stone-500">
          <span>{remainingCount} remaining</span>
          <span>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </header>

      {error && <p className="mx-4 mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{error}</p>}

      <section className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-3">
        {isLoading && sortedTasks.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-stone-500">Loading tasks...</div>
        ) : sortedTasks.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 text-2xl text-teal-700">+</div>
            <h2 className="mt-4 text-base font-semibold text-stone-900">No tasks yet</h2>
            <p className="mt-2 text-sm leading-6 text-stone-500">Add the next useful thing for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onComplete={completeTask}
                onPostpone={postponeTask}
                onDelete={deleteTask}
                onEdit={openEditForm}
              />
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={openCreateForm}
        className="absolute bottom-14 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-3xl font-light leading-none text-white shadow-lg shadow-teal-900/20 transition hover:bg-teal-700"
        aria-label="Create task"
      >
        +
      </button>

      {isFormOpen && (
        <TaskForm
          task={editingTask}
          onCancel={closeForm}
          onCreate={createTask}
          onUpdate={updateTask}
        />
      )}
    </main>
  );
}
