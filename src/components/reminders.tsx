
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';
import { Trash2, BellRing, PlusCircle, Clock, Pill } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    reminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)."),
    preferredLanguage: z.string().min(1, "Please select a language."),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

type MedicineReminder = ReminderFormValues & {
    id: string;
    userId: string;
    timeZone: string;
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


export function Reminders() {
    const { firestore, user } = useFirebase();
    const { toast } = useToast();

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
            reminderTime: "",
            preferredLanguage: "en-US",
        },
    });

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
                <CardDescription>Add and manage your medication schedules. Note: Push notifications are not yet implemented.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
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
                                name="reminderTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reminder Time (24h format)</FormLabel>
                                        <FormControl>
                                            <Input type="time" {...field} />
                                        </FormControl>
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
                            <Card key={reminder.id} className="flex items-center justify-between p-4 bg-card-foreground/5">
                                <div className="flex items-center gap-4">
                                    <Pill className="h-6 w-6 text-primary" />
                                    <div>
                                        <p className="font-semibold">{reminder.medicineName}</p>
                                        <p className="text-sm text-muted-foreground">{reminder.dosage}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                     <div className="flex items-center gap-2 text-sm">
                                        <Clock className="h-4 w-4" />
                                        {reminder.reminderTime}
                                     </div>
                                     <Button variant="ghost" size="icon" onClick={() => deleteReminder(reminder.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                        <span className="sr-only">Delete reminder</span>
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        </div>
                     </ScrollArea>
                </div>
            </CardContent>
        </Card>
    );
}
