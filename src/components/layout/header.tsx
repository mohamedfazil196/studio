import { FileHeart } from "lucide-react";

export function Header() {
  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="mx-auto flex items-center gap-3 max-w-7xl">
        <FileHeart className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-bold text-primary">
          MediScan AI
        </h1>
      </div>
    </header>
  );
}
