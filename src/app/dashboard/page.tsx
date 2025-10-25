
"use client";

import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { User as UserIcon, FileText, AlertTriangle, ShieldAlert, Activity } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { PieChart, Pie, Cell } from "recharts"
import { type MedicalReport } from '@/app/types/medical-report';
import { format } from 'date-fns';

const pieChartConfig = {
    value: {
        label: 'Reports',
    },
    Normal: {
        label: 'Normal',
        color: 'hsl(var(--chart-2))',
    },
    'Needs Attention': {
        label: 'Needs Attention',
        color: 'hsl(var(--chart-3))',
    },
    'Immediate Action': {
        label: 'Immediate Action',
        color: 'hsl(var(--chart-4))',
    },
};

const severityConfig: { [key: string]: { class: string, icon: React.FC<any> } } = {
    'Normal': { class: 'border-green-500/50 text-green-400', icon: ShieldAlert },
    'Needs Attention': { class: 'border-yellow-500/50 text-yellow-400', icon: AlertTriangle },
    'Immediate Action': { class: 'border-red-500/50 text-red-500', icon: AlertTriangle },
};

const StatCard = ({ title, value, icon, description }: { title: string, value: number | string, icon: React.ReactNode, description: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);


export default function DashboardPage() {
  const { user, firestore } = useFirebase();

  const reportsQuery = useMemoFirebase(
    () => user && firestore ? collection(firestore, 'users', user.uid, 'medical_reports') : null,
    [firestore, user]
  );
  const { data: reports, isLoading } = useCollection<MedicalReport>(reportsQuery);

  const { pieChartData, summaryStats, recentReports } = useMemo(() => {
    if (!reports) {
      return { 
        pieChartData: [], 
        summaryStats: { total: 0, needsAttention: 0, immediateAction: 0 },
        recentReports: []
      };
    }

    const counts = reports.reduce((acc, report) => {
      const severity = report.severity || 'Normal';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const pieData = [
      { name: 'Normal', value: counts['Normal'] || 0, fill: 'hsl(var(--chart-2))' },
      { name: 'Needs Attention', value: counts['Needs Attention'] || 0, fill: 'hsl(var(--chart-3))' },
      { name: 'Immediate Action', value: counts['Immediate Action'] || 0, fill: 'hsl(var(--chart-4))' },
    ];
    
    const sortedReports = [...reports].sort((a, b) => new Date(b.uploadTimestamp).getTime() - new Date(a.uploadTimestamp).getTime());

    return { 
      pieChartData: pieData, 
      summaryStats: {
        total: reports.length,
        needsAttention: counts['Needs Attention'] || 0,
        immediateAction: counts['Immediate Action'] || 0,
      },
      recentReports: sortedReports.slice(0, 5) // Get latest 5 reports
    };
  }, [reports]);


  return (
    <div className="space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
             <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 border-2 border-primary">
                      <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? "User"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                          <UserIcon className="h-8 w-8" />
                      </AvatarFallback>
                  </Avatar>
                  <div>
                      <h1 className="text-3xl font-bold font-headline">Welcome, {user?.displayName || user?.email}!</h1>
                      <p className="text-muted-foreground">Here is your health overview dashboard.</p>
                  </div>
              </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard 
                title="Total Reports"
                value={isLoading ? '...' : summaryStats.total}
                description="Total number of reports analyzed."
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Needs Attention"
                value={isLoading ? '...' : summaryStats.needsAttention}
                description="Reports flagged for follow-up."
                icon={<ShieldAlert className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard 
                title="Immediate Action"
                value={isLoading ? '...' : summaryStats.immediateAction}
                description="Reports with urgent findings."
                icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
                <CardHeader>
                    <CardTitle className='font-headline text-primary'>Recent Reports</CardTitle>
                    <CardDescription>Your last 5 analyzed reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => <div key={i} className="flex items-center p-2 rounded-md bg-muted/50 animate-pulse h-12"></div>)
                        ) : recentReports.length > 0 ? (
                            recentReports.map(report => (
                                <div key={report.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <Activity className="h-5 w-5 text-primary" />
                                        <div>
                                            <p className="font-semibold text-sm">{report.fileName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Analyzed on {format(new Date(report.uploadTimestamp), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={severityConfig[report.severity]?.class}>{report.severity}</Badge>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-muted-foreground">
                                <p>No reports analyzed yet.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className='font-headline text-primary'>Analysis History</CardTitle>
                    <CardDescription>Breakdown of all report results.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center">
                     <ChartContainer config={pieChartConfig} className="h-[250px] w-full">
                        <PieChart>
                            <ChartTooltip 
                                cursor={false}
                                content={<ChartTooltipContent hideLabel />} 
                            />
                            <Pie 
                                data={pieChartData} 
                                dataKey="value" 
                                nameKey="name" 
                                innerRadius={60} 
                                strokeWidth={5}
                            >
                                {pieChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
