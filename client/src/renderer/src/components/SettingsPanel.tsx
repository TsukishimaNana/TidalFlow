import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '@tidalflow/shared';
import type { AppSettings } from '@tidalflow/shared';
import { useSettings } from '../hooks/useSettings';

type SettingsPanelProps = {
  onClose: () => void;
};

type ToggleProps = {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
};

function Toggle({ checked, label, onChange }: ToggleProps): JSX.Element {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-stone-200 bg-stone-50 px-4 py-3">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition peer-checked:bg-teal-600">
        <span
          className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </span>
    </label>
  );
}

function FieldLabel({ children }: { children: string }): JSX.Element {
  return <label className="text-sm font-medium text-stone-700">{children}</label>;
}

function inputClassName(): string {
  return 'mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-100';
}

function SettingsPanel({ onClose }: SettingsPanelProps): JSX.Element {
  const { settings, saveSettings, loading, error } = useSettings();
  const [draftSettings, setDraftSettings] = useState<AppSettings>(settings);
  const [showApiKey, setShowApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setSuccessMessage('');
    }, 2200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [successMessage]);

  async function handleSave(): Promise<void> {
    setSaving(true);

    try {
      const savedSettings = await saveSettings(draftSettings);
      setDraftSettings(savedSettings);
      setSuccessMessage('设置已保存');
    } catch {
      setSuccessMessage('');
    } finally {
      setSaving(false);
    }
  }

  function handleReset(): void {
    setDraftSettings(DEFAULT_SETTINGS);
    setSuccessMessage('');
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-950">
      <section className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-8 lg:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-700">TidalFlow</p>
            <h1 className="mt-2 text-3xl font-semibold text-stone-950">设置</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
          >
            返回
          </button>
        </header>

        {loading ? (
          <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-sm">
            正在加载设置...
          </section>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSave();
            }}
          >
            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-950">服务器连接</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <FieldLabel>服务器 URL</FieldLabel>
                  <input
                    type="text"
                    value={draftSettings.server.url}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        server: { ...current.server, url: event.target.value }
                      }))
                    }
                    placeholder="http://localhost:3000"
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>API Key</FieldLabel>
                  <div className="mt-2 flex overflow-hidden rounded-md border border-stone-300 bg-white shadow-sm focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={draftSettings.server.apiKey}
                      onChange={(event) =>
                        setDraftSettings((current) => ({
                          ...current,
                          server: { ...current.server, apiKey: event.target.value }
                        }))
                      }
                      className="min-w-0 flex-1 border-0 px-3 py-2 text-sm text-stone-950 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey((current) => !current)}
                      className="border-l border-stone-200 px-3 text-sm font-medium text-stone-600 transition hover:text-teal-700"
                    >
                      {showApiKey ? '隐藏' : '显示'}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-950">工作时间</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <FieldLabel>开始时间</FieldLabel>
                  <input
                    type="time"
                    value={draftSettings.workHours.start}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        workHours: { ...current.workHours, start: event.target.value }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>结束时间</FieldLabel>
                  <input
                    type="time"
                    value={draftSettings.workHours.end}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        workHours: { ...current.workHours, end: event.target.value }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>午休开始</FieldLabel>
                  <input
                    type="time"
                    value={draftSettings.workHours.lunchStart}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        workHours: { ...current.workHours, lunchStart: event.target.value }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>午休结束</FieldLabel>
                  <input
                    type="time"
                    value={draftSettings.workHours.lunchEnd}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        workHours: { ...current.workHours, lunchEnd: event.target.value }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-950">提醒</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <FieldLabel>喝水/伸展间隔（分钟）</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={draftSettings.reminders.waterStretchIntervalMinutes}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        reminders: {
                          ...current.reminders,
                          waterStretchIntervalMinutes: Number(event.target.value)
                        }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div>
                  <FieldLabel>服药时间</FieldLabel>
                  <input
                    type="time"
                    value={draftSettings.reminders.medicationTime}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        reminders: { ...current.reminders, medicationTime: event.target.value }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div className="flex items-end">
                  <Toggle
                    label="启用提醒"
                    checked={draftSettings.reminders.enabled}
                    onChange={(checked) =>
                      setDraftSettings((current) => ({
                        ...current,
                        reminders: { ...current.reminders, enabled: checked }
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-stone-950">飞书集成</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
                <div>
                  <FieldLabel>Webhook URL</FieldLabel>
                  <input
                    type="text"
                    value={draftSettings.feishu.webhookUrl}
                    onChange={(event) =>
                      setDraftSettings((current) => ({
                        ...current,
                        feishu: { ...current.feishu, webhookUrl: event.target.value }
                      }))
                    }
                    className={inputClassName()}
                  />
                </div>
                <div className="flex items-end">
                  <Toggle
                    label="每日提醒"
                    checked={draftSettings.feishu.dailyReminderEnabled}
                    onChange={(checked) =>
                      setDraftSettings((current) => ({
                        ...current,
                        feishu: { ...current.feishu, dailyReminderEnabled: checked }
                      }))
                    }
                  />
                </div>
              </div>
            </section>

            <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-stone-50/95 py-4 backdrop-blur">
              <div className="min-h-6 text-sm">
                {error ? <span className="font-medium text-rose-700">{error}</span> : null}
                {successMessage ? <span className="font-medium text-teal-700">{successMessage}</span> : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-md border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
                >
                  恢复默认
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-teal-700 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </footer>
          </form>
        )}
      </section>
    </main>
  );
}

export default SettingsPanel;
