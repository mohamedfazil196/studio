
'use client';

import { useFirebase, useCollection, useMemoFirebase } from "@/firebase";
import { Sidebar, SidebarProvider, SidebarInset, SidebarMenuButtonProps, SidebarMenuButton } from "@/components/ui/sidebar";
import { SidebarHeader, SidebarTrigger, SidebarMenu, SidebarMenuItem, SidebarContent, SidebarFooter } from "@/components/ui/sidebar";
import { LayoutDashboard, FileUp, MessagesSquare, BellRing, Settings, LogOut, FileHeart, HeartPulse, Loader2, Sparkles } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Auth, signOut }from "firebase/auth";
import { collection } from "firebase/firestore";
import { type MedicalReport } from "@/app/types/medical-report";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getHealthTip } from "@/ai/flows/get-health-tip";

const HealthTracker = () => {
  const { user, firestore } = useFirebase();
  const [healthTip, setHealthTip] = useState("Keep up the great work on your health journey!");
  const [isTipLoading, setIsTipLoading] = useState(false);

  const reportsQuery = useMemoFirebase(
    () => user && firestore ? collection(firestore, 'users', user.uid, 'medical_reports') : null,
    [firestore, user]
  );
  const { data: reports, isLoading } = useCollection<MedicalReport>(reportsQuery);

  const healthScore = useMemo(() => {
    if (!reports || reports.length === 0) return 75; // Default score if no reports

    let score = 100;
    let normalCount = 0;
    let needsAttentionCount = 0;
    let immediateActionCount = 0;

    reports.forEach(report => {
        switch(report.severity) {
            case 'Normal':
                normalCount++;
                break;
            case 'Needs Attention':
                needsAttentionCount++;
                score -= 10;
                break;
            case 'Immediate Action':
                immediateActionCount++;
                score -= 25;
                break;
        }
    });

    // Add a small bonus for having normal reports
    score += normalCount * 2;
    
    return Math.max(0, Math.min(100, score)); // Clamp score between 0 and 100
  }, [reports]);

  const scoreColor = useMemo(() => {
    if (healthScore >= 80) return "hsl(var(--chart-2))"; // Green
    if (healthScore >= 50) return "hsl(var(--chart-3))"; // Yellow
    return "hsl(var(--chart-4))"; // Red
  }, [healthScore]);

  const handleTooltipOpen = async () => {
    setIsTipLoading(true);
    try {
        const tipResult = await getHealthTip({ healthScore });
        setHealthTip(tipResult.tip);
    } catch (error) {
        console.error("Failed to get health tip", error);
        // Use a default tip in case of error
        setHealthTip("Focus on a balanced diet and regular exercise for better health.");
    } finally {
        setIsTipLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 group-data-[collapsible=icon]:hidden">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip onOpenChange={(open) => { if (open) handleTooltipOpen()}}>
        <TooltipTrigger asChild>
           <div className="flex flex-col items-center gap-2 my-4 cursor-pointer group-data-[collapsible=icon]:hidden">
              <CircularProgress value={healthScore} size={80} strokeWidth={8} color={scoreColor} />
              <div className="text-center">
                  <p className="text-sm font-bold text-foreground">Health Score</p>
                  <p className="text-xs text-muted-foreground">Based on reports</p>
              </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="flex items-start gap-2 p-1">
             <Sparkles className="h-4 w-4 text-primary mt-1" />
             {isTipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <p className="text-sm">{healthTip}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isUserLoading, auth } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = () => {
    if (auth) {
      signOut(auth as Auth).then(() => {
        router.push('/login');
      });
    }
  }
  
  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <FileHeart className="w-20 h-20 text-primary animate-pulse" />
          <p className="text-lg font-semibold text-muted-foreground mt-4">Initializing AI dashboard...</p>
          <p className="text-sm text-muted-foreground/80">Please wait a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <div className="flex-grow flex items-center gap-2 group-data-[collapsible=icon]:hidden">
               <FileHeart className="h-7 w-7 text-primary" />
               <h1 className="text-xl font-headline font-bold text-primary">
                  MediScan AI
              </h1>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarMenu>
                 <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard" isActive={pathname === '/dashboard'} tooltip="Dashboard">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/analysis" isActive={pathname === '/dashboard/analysis'} tooltip="Analysis">
                        <FileUp />
                        <span>Analysis</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/chat" isActive={pathname === '/dashboard/chat'} tooltip="Q&A Chatbot">
                        <MessagesSquare />
                        <span>Q&A Chatbot</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                    <SidebarMenuButton href="/dashboard/reminders" isActive={pathname === '/dashboard/reminders'} tooltip="Reminders">
                        <BellRing />
                        <span>Reminders</span>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            <HealthTracker />

        </SidebarContent>
        <SidebarFooter>
           <SidebarMenu>
             <SidebarMenuItem>
                <SidebarMenuButton href="#" tooltip="Settings">
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sign Out">
                  <LogOut />
                  <span>Sign Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
           </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <main className="p-4 sm:p-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
