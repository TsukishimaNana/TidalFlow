import { useEffect, useRef, useState } from 'react';
import { CATEGORY_MAP } from 'shared';
import type { Task } from 'shared';
import { playCompleteSound } from '../utils/sounds';

interface TaskItemProps {
  task: Task;
  onComplete: (id: string) => Promise<Task>;
  onPostpone: (id: string) => Promise<Task>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (task: Task) => void;
}

const priorityStyles = [
  'bg-stone-100 text-stone-700 border-stone-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-rose-100 text-rose-700 border-rose-200'
] as const;

const priorityLabels = ['Normal', 'Important', 'Urgent'] as const;

const statusStyles: Record<Task['status'], string> = {
  pending: 'bg-stone-100 text-stone-600',
  in_progress: 'bg-teal-100 text-teal-700',
  completed: 'bg-green-100 text-green-700',
  postponed: 'bg-orange-100 text-orange-700'
};

const statusLabels: Record<Task['status'], string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  postponed: 'Postponed'
};

function getPriorityIndex(priority: number): 0 | 1 | 2 {
  if (priority >= 2) {
    return 2;
  }

  if (priority === 1) {
    return 1;
  }

  return 0;
}

export default function TaskItem({ task, onComplete, onPostpone, onDelete, onEdit }: TaskItemProps): JSX.Element {
  const [translateX, setTranslateX] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const latestX = useRef(0);

  const priorityIndex = getPriorityIndex(task.priority);
  const category = CATEGORY_MAP[task.category];
  const isDone = task.status === 'completed';

  function handleTouchStart(event: React.TouchEvent<HTMLElement>): void {
    if (isBusy) {
      return;
    }

    touchStartX.current = event.touches[0]?.clientX ?? null;
    latestX.current = translateX;
  }

  function handleTouchMove(event: React.TouchEvent<HTMLElement>): void {
    if (touchStartX.current === null || isBusy) {
      return;
    }

    const currentX = event.touches[0]?.clientX ?? touchStartX.current;
    const deltaX = currentX - touchStartX.current;
    const nextTranslateX = Math.max(-192, Math.min(0, latestX.current + deltaX));
    setTranslateX(nextTranslateX);
  }

  function handleTouchEnd(): void {
    if (touchStartX.current === null) {
      return;
    }

    setTranslateX((currentX) => (currentX < -72 ? -192 : 0));
    touchStartX.current = null;
    latestX.current = 0;
  }

  async function handleComplete(): Promise<void> {
    if (isBusy || isDone) {
      return;
    }

    setIsBusy(true);
    setIsCompleting(true);
    setTranslateX(0);
    playCompleteSound();

    window.setTimeout(() => {
      void onComplete(task.id)
        .catch(() => {
          setIsCompleting(false);
        })
        .finally(() => {
          setIsCompleting(false);
          setIsBusy(false);
        });
    }, 500);
  }

  async function handlePostpone(): Promise<void> {
    if (isBusy) {
      return;
    }

    setIsBusy(true);
    setTranslateX(0);

    try {
      await onPostpone(task.id);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (isBusy || !window.confirm(`Delete "${task.title}"?`)) {
      return;
    }

    setIsBusy(true);
    setTranslateX(0);

    try {
      await onDelete(task.id);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="absolute inset-y-0 right-0 flex w-48">
        <button
          type="button"
          onClick={handleComplete}
          disabled={isBusy || isDone}
          className="flex min-h-11 flex-1 items-center justify-center bg-green-500 px-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Complete
        </button>
        <button
          type="button"
          onClick={handlePostpone}
          disabled={isBusy || task.status === 'postponed'}
          className="flex min-h-11 flex-1 items-center justify-center bg-orange-500 px-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Postpone
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          className="flex min-h-11 flex-1 items-center justify-center bg-red-500 px-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          Delete
        </button>
      </div>

      <div
        className={`relative bg-white p-3 transition-[opacity,transform] duration-200 ease-out ${isCompleting ? 'scale-[1.05] opacity-0 duration-500' : 'opacity-100'}`}
        style={{ transform: `translateX(${translateX}px) ${isCompleting ? 'scale(1.05)' : 'scale(1)'}` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleComplete}
            disabled={isBusy || isDone}
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base transition ${
              isDone
                ? 'border-green-300 bg-green-500 text-white'
                : 'border-stone-300 bg-white text-stone-400 hover:border-teal-400 hover:text-teal-600'
            }`}
            aria-label={isDone ? 'Completed' : 'Complete task'}
          >
            {isDone ? '✓' : ''}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className={`break-words text-sm font-semibold leading-5 ${isDone ? 'text-stone-400 line-through' : 'text-stone-950'}`}>
                {task.title}
              </h3>
              <div className="flex shrink-0 items-center gap-1">
                {task.estimatedMinutes !== null && (
                  <span className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-600">
                    {task.estimatedMinutes}m
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(task)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label={`Edit ${task.title}`}
                >
                  ✎
                </button>
              </div>
            </div>

            {task.description && <p className="mt-1 line-clamp-2 break-words text-xs leading-5 text-stone-500">{task.description}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium">
              <span className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-1 text-stone-700">
                <span aria-hidden="true">{category.emoji}</span>
                <span>{category.label.replace(category.emoji, '')}</span>
              </span>
              <span className={`rounded-md border px-2 py-1 ${priorityStyles[priorityIndex]}`}>{priorityLabels[priorityIndex]}</span>
              <span className={`rounded-md px-2 py-1 ${statusStyles[task.status]}`}>{statusLabels[task.status]}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
