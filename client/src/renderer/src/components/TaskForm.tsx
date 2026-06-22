import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_MAP } from '@tidalflow/shared';
import type { CreateTaskInput, Task, UpdateTaskInput } from '@tidalflow/shared';

interface TaskFormProps {
  task?: Task | null;
  onCancel: () => void;
  onCreate: (data: CreateTaskInput) => Promise<Task>;
  onUpdate: (id: string, data: Partial<UpdateTaskInput>) => Promise<Task>;
}

type Category = Task['category'];

const categories = Object.keys(CATEGORY_MAP) as Category[];

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export default function TaskForm({ task, onCancel, onCreate, onUpdate }: TaskFormProps): JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('programming');
  const [priority, setPriority] = useState(0);
  const [scheduledDate, setScheduledDate] = useState(toDateInputValue(null));
  const [estimatedMinutes, setEstimatedMinutes] = useState('25');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(task);

  useEffect(() => {
    setTitle(task?.title ?? '');
    setDescription(task?.description ?? '');
    setCategory(task?.category ?? 'programming');
    setPriority(task?.priority ?? 0);
    setScheduledDate(toDateInputValue(task?.scheduledDate));
    setEstimatedMinutes(task?.estimatedMinutes === null || task?.estimatedMinutes === undefined ? '' : String(task.estimatedMinutes));
    setError(null);
  }, [task]);

  const canSave = useMemo(() => title.trim().length > 0 && !isSaving, [isSaving, title]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    const minutes = estimatedMinutes.trim() === '' ? undefined : Number(estimatedMinutes);
    const normalizedMinutes = Number.isFinite(minutes) && minutes !== undefined ? Math.max(0, Math.round(minutes)) : undefined;

    setIsSaving(true);
    setError(null);

    try {
      if (task) {
        await onUpdate(task.id, {
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          scheduledDate: scheduledDate || null,
          estimatedMinutes: normalizedMinutes ?? null
        });
      } else {
        await onCreate({
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          scheduledDate: scheduledDate || undefined,
          estimatedMinutes: normalizedMinutes
        });
      }

      onCancel();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save task');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end bg-stone-950/20 backdrop-blur-[1px]" role="dialog" aria-modal="true">
      <form
        onSubmit={handleSubmit}
        className="max-h-[92%] w-full translate-y-0 overflow-y-auto rounded-t-xl border border-stone-200 bg-white px-4 pb-4 pt-3 shadow-2xl animate-[slideUp_300ms_ease-out]"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-stone-950">{isEditing ? 'Edit Task' : 'New Task'}</h2>
            <p className="text-xs text-stone-500">{scheduledDate}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-stone-100"
            aria-label="Close task form"
          >
            ×
          </button>
        </div>

        <label className="block text-xs font-semibold text-stone-700" htmlFor="task-title">
          Title
        </label>
        <input
          id="task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          placeholder="What needs attention?"
          required
        />

        <label className="mt-3 block text-xs font-semibold text-stone-700" htmlFor="task-description">
          Description
        </label>
        <textarea
          id="task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-1 min-h-20 w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm leading-5 text-stone-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          placeholder="Optional detail"
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-stone-700" htmlFor="task-category">
            Category
            <select
              id="task-category"
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {categories.map((categoryKey) => (
                <option key={categoryKey} value={categoryKey}>
                  {CATEGORY_MAP[categoryKey].label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-stone-700" htmlFor="task-scheduled-date">
            Date
            <input
              id="task-scheduled-date"
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm font-normal text-stone-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>

        <label className="mt-3 block text-xs font-semibold text-stone-700" htmlFor="task-estimated-minutes">
          Estimated Time
        </label>
        <input
          id="task-estimated-minutes"
          type="number"
          min="0"
          step="5"
          value={estimatedMinutes}
          onChange={(event) => setEstimatedMinutes(event.target.value)}
          className="mt-1 h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          placeholder="Minutes"
        />

        <fieldset className="mt-3">
          <legend className="text-xs font-semibold text-stone-700">Priority</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[
              { value: 0, label: 'Normal', className: 'peer-checked:border-stone-500 peer-checked:bg-stone-100' },
              { value: 1, label: 'Important', className: 'peer-checked:border-amber-500 peer-checked:bg-amber-100' },
              { value: 2, label: 'Urgent', className: 'peer-checked:border-rose-500 peer-checked:bg-rose-100' }
            ].map((item) => (
              <label key={item.value} className="relative">
                <input
                  type="radio"
                  name="priority"
                  value={item.value}
                  checked={priority === item.value}
                  onChange={() => setPriority(item.value)}
                  className="peer sr-only"
                />
                <span
                  className={`flex h-11 items-center justify-center rounded-lg border border-stone-200 px-2 text-xs font-semibold text-stone-700 transition ${item.className}`}
                >
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-11 items-center justify-center rounded-lg border border-stone-300 bg-white text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="flex h-11 items-center justify-center rounded-lg bg-teal-600 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
