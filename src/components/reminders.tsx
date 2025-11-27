
"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Trash2, BellRing, PlusCircle, Clock, Pill, Bell, Tag, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';

const languages = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'pa-IN', name: 'Punjabi' },
];

const reminderSchema = z.object({
    medicineName: z.string().min(1, "Medicine name is required."),
    dosage: z.string().min(1, "Dosage is required."),
    reminderTimes: z.array(z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/)).min(1, "At least one reminder time is required."),
    preferredLanguage: z.string().min(1, "Please select a language."),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

type MedicineReminder = Omit<ReminderFormValues, 'reminderTimes'> & {
    id: string;
    userId: string;
    timeZone: string;
    reminderTimes: string[];
};

const ReminderSkeleton = () => (
    <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
             <Card key={i} className="flex items-center justify-between p-4 bg-card-foreground/5">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <div>
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20 mt-1" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                     <Skeleton className="h-4 w-16" />
                     <Skeleton className="h-8 w-8" />
                </div>
            </Card>
        ))}
    </div>
)

const NotificationManager = () => {
    const { toast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = () => {
        if (!('Notification' in window)) {
            toast({
                title: "Not Supported",
                description: "This browser does not support desktop notifications.",
                variant: "destructive"
            });
            return;
        }

        Notification.requestPermission().then(p => {
            setPermission(p);
            if (p === 'granted') {
                toast({
                    title: "Notifications Enabled!",
                    description: "You will now receive real-time reminders.",
                });
                new Notification("MediScan AI Reminders", {
                    body: "Notifications have been successfully enabled!",
                    icon: "/logo.png"
                });
            } else {
                 toast({
                    title: "Notifications Blocked",
                    description: "You have blocked notifications. To enable them, please update your browser settings.",
                    variant: "destructive"
                });
            }
        });
    }

    if (permission === 'granted') {
        return (
            <Alert className="border-primary/50 text-primary">
                <Bell className="h-4 w-4" />
                <AlertTitle>Notifications are enabled!</AlertTitle>
                <AlertDescription>
                    You will receive real-time alerts for your medicine reminders.
                </AlertDescription>
            </Alert>
        );
    }
    
    return (
        <Alert>
            <BellRing className="h-4 w-4" />
            <AlertTitle>Enable Real-Time Reminders</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
                <p>Click the button to allow desktop notifications for your medicine.</p>
                <Button onClick={requestPermission}>Enable Notifications</Button>
            </AlertDescription>
        </Alert>
    );
};


export function Reminders() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [timeInput, setTimeInput] = useState('');

    const remindersQuery = useMemoFirebase(
        () => user && firestore ? collection(firestore, 'users', user.uid, 'medicine_reminders') : null,
        [firestore, user]
    );
    const { data: reminders, isLoading } = useCollection<MedicineReminder>(remindersQuery);

    const form = useForm<ReminderFormValues>({
        resolver: zodResolver(reminderSchema),
        defaultValues: {
            medicineName: "",
            dosage: "",
            reminderTimes: [],
            preferredLanguage: "en-US",
        },
    });

    const addTime = () => {
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (timeInput && timeRegex.test(timeInput)) {
            const currentTimes = form.getValues('reminderTimes');
            if (!currentTimes.includes(timeInput)) {
                form.setValue('reminderTimes', [...currentTimes, timeInput]);
            }
            setTimeInput('');
        }
    };

    const removeTime = (timeToRemove: string) => {
        const currentTimes = form.getValues('reminderTimes');
        form.setValue('reminderTimes', currentTimes.filter(t => t !== timeToRemove));
    };

    async function onSubmit(values: ReminderFormValues) {
        if (!user || !firestore) return;

        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const newReminder = {
            ...values,
            userId: user.uid,
            timeZone,
        };

        const colRef = collection(firestore, 'users', user.uid, 'medicine_reminders');
        addDocumentNonBlocking(colRef, newReminder);

        toast({
            title: "Reminder Set!",
            description: `You'll be reminded for ${values.medicineName}.`,
        });
        form.reset();
    }

    const deleteReminder = (reminderId: string) => {
        if (!user || !firestore) return;
        const docRef = doc(firestore, 'users', user.uid, 'medicine_reminders', reminderId);
        deleteDocumentNonBlocking(docRef);
        toast({
            title: "Reminder Removed",
            description: "The reminder has been successfully deleted.",
            variant: "destructive"
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-xl text-primary flex items-center gap-2"><BellRing />Medicine Reminders</CardTitle>
                <CardDescription>Add and manage your medication schedules. Enable notifications to get real-time desktop alerts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                 <NotificationManager />

                <div className="grid md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Add New Reminder</h3>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="medicineName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Medicine Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Paracetamol" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="dosage"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dosage</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., 500mg, 1 tablet" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name="reminderTimes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reminder Times</FormLabel>
                                            <div className="flex items-center gap-2">
                                                <Input 
                                                    type="time" 
                                                    value={timeInput}
                                                    onChange={(e) => setTimeInput(e.target.value)}
                                                />
                                                <Button type="button" size="icon" onClick={addTime}>
                                                    <Plus />
                                                </Button>
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-2">
                                                {field.value.map(time => (
                                                    <Badge key={time} variant="secondary" className="flex items-center gap-2">
                                                        {time}
                                                        <button type="button" onClick={() => removeTime(time)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="preferredLanguage"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notification Language</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a language" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {languages.map(lang => (
                                                <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full">
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Reminder
                                </Button>
                            </form>
                        </Form>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Your Reminders</h3>
                        <ScrollArea className="h-[50vh] pr-4">
                            {isLoading && <ReminderSkeleton />}
                            {!isLoading && reminders && reminders.length === 0 && (
                                <div className="text-center text-muted-foreground py-10">
                                    <BellRing className="mx-auto h-12 w-12" />
                                    <p className="mt-4">You have no reminders set.</p>
                                    <p className="text-sm">Use the form on the left to add one.</p>
                                </div>
                            )}
                            <div className="space-y-4">
                            {reminders?.map((reminder) => (
                                <Card key={reminder.id} className="flex items-start justify-between p-4 bg-card-foreground/5">
                                    <div className="flex items-center gap-4">
                                        <Pill className="h-6 w-6 text-primary" />
                                        <div>
                                            <p className="font-semibold">{reminder.medicineName}</p>
                                            <p className="text-sm text-muted-foreground">{reminder.dosage}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex flex-wrap justify-end gap-2">
                                        {Array.isArray(reminder.reminderTimes) && reminder.reminderTimes.map(time => (
                                             <Badge key={time} variant="outline" className="flex items-center gap-1 text-xs">
                                                <Clock className="h-3 w-3" />
                                                {time}
                                            </Badge>
                                        ))}
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteReminder(reminder.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                            <span className="sr-only">Delete reminder</span>
                                        </Button>
                                    </div>
                                </Card>
                            ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
