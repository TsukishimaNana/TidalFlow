export function playCompleteSound(): void {
  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext ?? audioWindow.webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  const audioContext = new AudioContextConstructor();
  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  const firstTone = audioContext.createOscillator();
  const secondTone = audioContext.createOscillator();

  gain.connect(audioContext.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

  firstTone.type = 'sine';
  firstTone.frequency.setValueAtTime(523.25, now);
  firstTone.frequency.exponentialRampToValueAtTime(659.25, now + 0.16);
  firstTone.connect(gain);
  firstTone.start(now);
  firstTone.stop(now + 0.18);

  secondTone.type = 'triangle';
  secondTone.frequency.setValueAtTime(783.99, now + 0.12);
  secondTone.frequency.exponentialRampToValueAtTime(1046.5, now + 0.34);
  secondTone.connect(gain);
  secondTone.start(now + 0.1);
  secondTone.stop(now + 0.36);

  window.setTimeout(() => {
    void audioContext.close();
  }, 500);
}
