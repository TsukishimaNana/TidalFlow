import TaskPanel from './components/TaskPanel'
import ConnectionStatus from './components/ConnectionStatus'
import ReminderToast from './components/ReminderToast'
import { AppProvider } from './context/AppContext'
import { useReminder } from './hooks/useReminder'

function AppContent(): JSX.Element {
  const { reminders, dismissReminder } = useReminder();

  return (
    <>
      <TaskPanel />
      <ConnectionStatus />
      <ReminderToast reminders={reminders} onDismiss={dismissReminder} />
    </>
  );
}

function App(): JSX.Element {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
