import { useEffect, useRef, useState } from "react";

const ScoreGauge = ({ score = 75 }: { score: number }) => {
  // The arc is a radius-40 half circle; seeding the length avoids a first-paint
  // flash before the real path measurement lands.
  const [pathLength, setPathLength] = useState(Math.PI * 40);
  const pathRef = useRef<SVGPathElement>(null);

  const percentage = Math.min(Math.max(score, 0), 100) / 100;

  useEffect(() => {
    if (pathRef.current && typeof pathRef.current.getTotalLength === "function") {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-[88px]">
        <svg viewBox="0 0 100 50" className="w-full h-full" aria-hidden="true">
          {/* Background arc */}
          <path
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="#d8d2c3"
            strokeWidth="8"
          />

          {/* Foreground arc */}
          <path
            ref={pathRef}
            d="M10,50 A40,40 0 0,1 90,50"
            fill="none"
            stroke="#1f3ecf"
            strokeWidth="8"
            strokeLinecap="butt"
            strokeDasharray={pathLength}
            strokeDashoffset={pathLength * (1 - percentage)}
            className="score-arc"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <div className="text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-ink">
            {score}/100
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreGauge;
