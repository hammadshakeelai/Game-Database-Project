interface EvalBarProps {
  evaluation: number;
}

/**
 * Vertical evaluation bar showing who's winning (X=indigo, O=rose).
 * Uses a sigmoid-based scaling instead of linear for more meaningful visual representation.
 */
export default function EvalBar({ evaluation }: EvalBarProps) {
  // Sigmoid-like scaling: maps evaluation to 0-100% range
  // This gives more visual resolution around even positions
  // and compresses extreme values
  let evalPercent: number;

  if (evaluation >= 10000) {
    evalPercent = 100;
  } else if (evaluation <= -10000) {
    evalPercent = 0;
  } else {
    // Sigmoid scaling centered at 50%
    // k controls sensitivity — higher = more sensitive to small eval changes
    const k = 0.015;
    evalPercent = 100 / (1 + Math.exp(-k * evaluation));
  }

  // Clamp to 3-97 so the bar is always minimally visible
  evalPercent = Math.max(3, Math.min(97, evalPercent));

  return (
    <div
      id="eval-bar"
      className="w-6 sm:w-8 bg-slate-800 border-r border-slate-700 flex flex-col justify-end relative overflow-hidden"
      title={`Evaluation: ${evaluation > 0 ? '+' : ''}${evaluation}`}
    >
      {/* X's side (bottom — indigo) */}
      <div
        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 transition-all duration-700 ease-out absolute bottom-0"
        style={{ height: `${evalPercent}%` }}
      />
      {/* O's side (top — rose) */}
      <div
        className="w-full bg-gradient-to-b from-rose-600 to-rose-400 transition-all duration-700 ease-out absolute top-0"
        style={{ height: `${100 - evalPercent}%` }}
      />
      {/* Center line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 z-10" />
      {/* Labels */}
      <div className="absolute inset-0 flex flex-col justify-between py-2 items-center text-[10px] font-bold z-10 pointer-events-none">
        <span className="text-rose-200 drop-shadow-md">O</span>
        <span className="text-indigo-200 drop-shadow-md">X</span>
      </div>
    </div>
  );
}
