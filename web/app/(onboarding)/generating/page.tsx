import { Suspense } from "react";

import { GeneratingStatus } from "./GeneratingStatus";

export default function GeneratingPage() {
  return (
    <main className="cinematic-scene relative grid min-h-screen place-items-center overflow-hidden px-6 py-10 text-center">
      <div className="cosmic-veil absolute inset-0" aria-hidden="true" />
      <div className="star-noise absolute inset-0 opacity-70" aria-hidden="true" />
      <section className="luxury-panel relative w-full max-w-3xl overflow-hidden rounded-lg p-8 sm:p-10">
        <div className="celestial-grid absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative">
          <Suspense fallback={<h1 className="font-display text-5xl font-semibold">Building your chart snapshot...</h1>}>
            <GeneratingStatus />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
