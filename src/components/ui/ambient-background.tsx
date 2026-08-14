export function AmbientBackground() {
  return (
    <div aria-hidden className="ambient">
      <div className="ambient__grid" />
      <div className="ambient__glow ambient__glow--a" />
      <div className="ambient__glow ambient__glow--b" />
      <svg className="ambient__line" viewBox="0 0 1440 720" preserveAspectRatio="none">
        <path
          id="ambient-path"
          pathLength={1}
          d="M -80 580 C 160 500 240 660 430 540 C 600 430 700 300 880 360 C 1060 420 1200 560 1520 280"
        />
        <use href="#ambient-path" className="ambient__stroke ambient__stroke--a" />
        <use href="#ambient-path" className="ambient__stroke ambient__stroke--b" />
        <circle className="ambient__dot" r="3.5" cx="0" cy="0">
          <animateMotion dur="30s" begin="3s" repeatCount="indefinite">
            <mpath href="#ambient-path" />
          </animateMotion>
        </circle>
      </svg>
    </div>
  );
}
