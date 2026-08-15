let context: AudioContext | null = null;

export const playAlertSound = (severity: string): void => {
  if (typeof window === 'undefined') return;
  try {
    context = context ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = severity === 'CRITICAL' ? 'square' : 'sine';
    oscillator.frequency.value = severity === 'CRITICAL' ? 880 : 620;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (severity === 'CRITICAL' ? 0.5 : 0.25));
  } catch {
    return;
  }
};
