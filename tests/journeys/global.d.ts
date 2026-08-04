export {};

declare global {
  interface Window {
    __SOLPORT__?: { game: { isRunning: boolean }; scene?: string };
  }
}
