import { ReviewApp } from "@/components/ReviewApp";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-atmosphere" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-20 pt-10 sm:px-10">
        <header className="animate-rise mb-10">
          <p className="font-display text-5xl tracking-tight text-sand-100 sm:text-6xl">
            coderev
          </p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-sand-300 sm:text-lg">
            Review a public GitHub repo with Nvidia NIM or your own
            OpenAI-compatible key. Nothing is stored.
          </p>
        </header>
        <div className="animate-rise-delayed flex-1">
          <ReviewApp />
        </div>
        <footer className="mt-16 border-t border-white/10 pt-6 text-sm text-sand-300/80">
          Open source · CLI + Web · no database · keys used only for this request
        </footer>
      </div>
    </main>
  );
}
