
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

type MedicineReminder = {
    id: string;
    medicineName: string;
    dosage: string;
    reminderTimes: string[];
};

export const ReminderListener = () => {
    const { firestore, user } = useFirebase();

    const remindersQuery = useMemoFirebase(
        () => user && firestore ? collection(firestore, 'users', user.uid, 'medicine_reminders') : null,
        [firestore, user]
    );
    const { data: reminders } = useCollection<MedicineReminder>(remindersQuery);

    useEffect(() => {
        const checkReminders = () => {
            if (!reminders || typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
                return;
            }

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            reminders.forEach(reminder => {
                if (Array.isArray(reminder.reminderTimes) && reminder.reminderTimes.includes(currentTime)) {
                    // Show notification
                    new Notification(`Time for your medicine!`, {
                        body: `Take ${reminder.dosage} of ${reminder.medicineName}.`,
                        icon: '/logo.png',
                        badge: '/logo.png'
                    });
                }
            });
        };

        // Check every minute
        const intervalId = setInterval(checkReminders, 60 * 1000);

        // Cleanup on unmount
        return () => clearInterval(intervalId);
    }, [reminders]);

    return null; // This component does not render anything
};
