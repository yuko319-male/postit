import { MemoBoard } from "@/components/memo-board";
import { StickyNote } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans selection:bg-yellow-200/50 relative">
      {/* Theme Toggle Button */}
      <div className="fixed top-8 right-8 z-50">
        <ModeToggle />
      </div>

      {/* Header section with modern feel */}
      <header className="relative w-full py-24 px-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-30 select-none pointer-events-none -z-10">
          <div className="absolute top-1/4 -left-20 w-80 h-80 bg-yellow-200 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-yellow-300 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 text-center relative z-10">
          <div className="p-4 bg-yellow-400 rounded-3xl shadow-xl shadow-yellow-400/30 dark:shadow-yellow-900/10 rotate-3 transition-transform hover:rotate-0">
            <StickyNote className="h-10 w-10 text-neutral-900" />
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-neutral-900 dark:text-neutral-100">
              Yuko <span className="text-yellow-500">Post-it</span>
            </h1>
            <p className="max-w-xl text-xl md:text-2xl text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
              A minimalist way to organize your thoughts, one sticker at a time.
            </p>
          </div>
        </div>
      </header>

      {/* Main Board */}
      <main className="pb-32">
        <MemoBoard />
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 text-center border-t border-border/40 backdrop-blur-md bg-white/30 dark:bg-black/30">
        <p className="text-neutral-500 dark:text-neutral-400 font-medium">
          &copy; {new Date().getFullYear()} Yuko Post-it. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
