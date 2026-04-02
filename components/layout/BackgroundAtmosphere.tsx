export function BackgroundAtmosphere() {
  return (
    <div
      aria-hidden="true"
      data-testid="background-atmosphere"
      data-atmosphere="shell"
      className="background-atmosphere pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div data-atmosphere-layer="base" className="background-atmosphere__base" />
      <div data-atmosphere-layer="perimeter" className="background-atmosphere__perimeter" />
      <div
        data-atmosphere-layer="texture"
        data-texture-light="/background/circuit-texture-light-bg.svg"
        data-texture-dark="/background/circuit-texture-dark-bg.svg"
        data-texture-fallback="/background/circuit-texture-bg.svg"
        className="background-atmosphere__texture"
      />

      <div
        data-atmosphere-layer="glow"
        data-glow-anchor="top-left"
        className="background-atmosphere__glow background-atmosphere__glow--top-left"
      />
      <div
        data-atmosphere-layer="glow"
        data-glow-anchor="top-right"
        className="background-atmosphere__glow background-atmosphere__glow--top-right"
      />
      <div
        data-atmosphere-layer="glow"
        data-glow-anchor="hero-core"
        className="background-atmosphere__glow background-atmosphere__glow--hero-core"
      />
      <div
        data-atmosphere-layer="glow"
        data-glow-anchor="mid-band"
        className="background-atmosphere__glow background-atmosphere__glow--mid-band background-atmosphere__desktop-only"
      />
      <div
        data-atmosphere-layer="glow"
        data-glow-anchor="lower-band"
        className="background-atmosphere__glow background-atmosphere__glow--lower-band background-atmosphere__desktop-only"
      />

      <div
        data-atmosphere-layer="support"
        data-support-region="hero"
        className="background-atmosphere__support background-atmosphere__support--hero"
      />
      <div
        data-atmosphere-layer="support"
        data-support-region="mid"
        className="background-atmosphere__support background-atmosphere__support--mid"
      />
      <div
        data-atmosphere-layer="support"
        data-support-region="lower"
        className="background-atmosphere__support background-atmosphere__support--lower"
      />
    </div>
  );
}
