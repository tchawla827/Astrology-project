import { Suspense } from "react";

import { GeneratingStatus } from "./GeneratingStatus";

export default function GeneratingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 text-center">
      <Suspense fallback={<h1 className="text-3xl font-semibold">Building your chart snapshot...</h1>}>
        <GeneratingStatus />
      </Suspense>
    </main>
  );
}

