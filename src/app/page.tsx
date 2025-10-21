"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user, isUserLoading } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  const LoadingState = () => (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
        <Header />
        <main className="flex-grow flex items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto p-8 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className='space-y-2'>
                        <Skeleton className="h-6 w-72" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-64 w-full rounded-lg" />
                </div>
            </div>
        </main>
         <footer className="text-center p-4 text-sm text-muted-foreground">
            <p>MediScan AI is for demonstration purposes only. Not for real medical diagnosis.</p>
        </footer>
    </div>
  );

  return <LoadingState />;
}
