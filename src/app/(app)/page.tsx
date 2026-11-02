import { StopwatchPanel } from "@/components/stopwatch/stopwatch-panel";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center pt-2">
      <div className="mb-6 text-center">
        <p className="text-xs font-semibold tracking-[0.3em] text-accent">STOPWATCH</p>
        <h1 className="mt-1 text-2xl font-bold">ストップウォッチ</h1>
      </div>
      <StopwatchPanel />
    </div>
  );
}
