
"use client";

import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { BarChart, CartesianGrid, XAxis, Bar, PieChart, Pie, Cell } from "recharts"
import { type MedicalReport } from '@/app/types/medical-report';

const barChartConfig = {
  reports: {
    label: "Reports",
    color: "hsl(var(--chart-1))",
  },
}

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


export default function DashboardPage() {
  const { user, firestore } = useFirebase();

  const reportsQuery = useMemoFirebase(
    () => user && firestore ? collection(firestore, 'users', user.uid, 'medical_reports') : null,
    [firestore, user]
  );
  const { data: reports, isLoading } = useCollection<MedicalReport>(reportsQuery);

  const { barChartData, totalReports } = useMemo(() => {
    if (!reports) {
      return { barChartData: [], totalReports: 0 };
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthlyCounts: { [key: string]: number } = monthNames.reduce((acc, month) => ({ ...acc, [month]: 0 }), {});

    reports.forEach(report => {
        try {
            const date = new Date(report.uploadTimestamp);
            const monthName = monthNames[date.getMonth()];
            if (monthlyCounts.hasOwnProperty(monthName)) {
                monthlyCounts[monthName]++;
            }
        } catch (e) {
            console.error("Invalid timestamp for report:", report.id);
        }
    });
    
    // For now, we only show the first 6 months for a cleaner chart
    const chartData = Object.entries(monthlyCounts).slice(0, 6).map(([month, reports]) => ({ month, reports }));
    
    return { barChartData: chartData, totalReports: reports.length };
  }, [reports]);

  const pieChartData = useMemo(() => {
    if (!reports) {
      return [
        { name: 'Normal', value: 0, fill: 'hsl(var(--chart-2))' },
        { name: 'Needs Attention', value: 0, fill: 'hsl(var(--chart-3))' },
        { name: 'Immediate Action', value: 0, fill: 'hsl(var(--chart-4))' },
      ];
    }
    const counts = reports.reduce((acc, report) => {
      const severity = report.severity || 'Normal'; // Default to Normal if undefined
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Normal', value: counts['Normal'] || 0, fill: 'hsl(var(--chart-2))' },
      { name: 'Needs Attention', value: counts['Needs Attention'] || 0, fill: 'hsl(var(--chart-3))' },
      { name: 'Immediate Action', value: counts['Immediate Action'] || 0, fill: 'hsl(var(--chart-4))' },
    ];
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
              <Card className="p-4 bg-card/50">
                  <p className="text-sm text-muted-foreground">Reports Analyzed</p>
                  <p className="text-4xl font-bold text-primary">{isLoading ? '...' : totalReports}</p>
              </Card>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className='font-headline text-primary'>Monthly Usage</CardTitle>
                    <CardDescription>Reports analyzed per month.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={barChartConfig} className="h-[250px] w-full">
                        <BarChart accessibilityLayer data={barChartData} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="month"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                tickFormatter={(value) => value.slice(0, 3)}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent 
                                    indicator="line"
                                    labelClassName="font-bold"
                                    className="bg-card/80 backdrop-blur-sm"
                                />}
                            />
                            <Bar dataKey="reports" fill="var(--color-reports)" radius={8} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className='font-headline text-primary'>Analysis History</CardTitle>
                    <CardDescription>Breakdown of recent report results.</CardDescription>
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
