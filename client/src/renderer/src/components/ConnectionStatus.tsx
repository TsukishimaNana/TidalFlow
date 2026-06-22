import { useConnection } from '../hooks/useConnection';

export default function ConnectionStatus(): JSX.Element {
  const { isConnected } = useConnection();

  return (
    <div className="fixed bottom-3 right-3 z-50 flex min-h-8 items-center gap-2 rounded-full border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm backdrop-blur">
      <span
        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.16)]' : 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.14)]'}`}
        aria-hidden="true"
      />
      <span>{isConnected ? 'Connected' : 'Offline'}</span>
    </div>
  );
}
