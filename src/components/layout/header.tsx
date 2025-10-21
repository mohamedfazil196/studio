import { FileHeart, LogIn, LogOut, User as UserIcon } from "lucide-react";
import Link from 'next/link';
import { useFirebase } from "@/firebase";
import { Auth, signOut } from "firebase/auth";
import { Button } from "../ui/button";

export function Header() {
  const { user, auth } = useFirebase();

  const handleSignOut = () => {
    if (auth) {
      signOut(auth as Auth);
    }
  }

  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
      <div className="mx-auto flex items-center justify-between max-w-7xl">
        <Link href="/" className="flex items-center gap-3">
          <FileHeart className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary">
            MediScan AI
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
