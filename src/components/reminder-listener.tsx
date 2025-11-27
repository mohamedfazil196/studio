
'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

type MedicineReminder = {
    id: string;
    medicineName: string;
    dosage: string;
    reminderTime: string;
};

export const ReminderListener = () => {
    const { firestore, user } = useFirebase();
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const remindersQuery = useMemoFirebase(
        () => user && firestore ? collection(firestore, 'users', user.uid, 'medicine_reminders') : null,
        [firestore, user]
    );
    const { data: reminders } = useCollection<MedicineReminder>(remindersQuery);

    useEffect(() => {
        // Preload the audio
        if (typeof window !== 'undefined') {
            audioRef.current = new Audio('/notification.mp3');
            audioRef.current.load();
        }

        const checkReminders = () => {
            if (!reminders || Notification.permission !== 'granted') {
                return;
            }

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            reminders.forEach(reminder => {
                if (reminder.reminderTime === currentTime) {
                    // Play sound
                    audioRef.current?.play().catch(e => console.error("Error playing sound:", e));
                    
                    // Show notification
                    new Notification(`Time for your medicine!`, {
                        body: `Take ${reminder.dosage} of ${reminder.medicineName}.`,
                        icon: '/logo.png', // Ensure you have a logo in your /public folder
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
