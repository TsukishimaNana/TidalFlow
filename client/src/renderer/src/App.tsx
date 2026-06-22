import TaskPanel from './components/TaskPanel';
import ConnectionStatus from './components/ConnectionStatus';
import { AppProvider } from './context/AppContext';

function App(): JSX.Element {
  return (
    <AppProvider>
      <TaskPanel />
      <ConnectionStatus />
    </AppProvider>
  );
}

export default App;
