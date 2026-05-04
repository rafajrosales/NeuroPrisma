import { useState, useEffect } from 'react';
import { db, collection, query, where, onSnapshot, User, addDoc, Timestamp, deleteDoc, doc, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  alarmEnabled: boolean;
  status: 'pending' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
}

export function useCalendar(user: User | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const eventsRef = collection(db, 'users', user.uid, 'events');
    const q = query(eventsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          start: data.start.toDate(),
          end: data.end.toDate(),
        } as CalendarEvent;
      });
      setEvents(fetchedEvents);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/events`);
    });

    return () => unsubscribe();
  }, [user]);

  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'events'), {
        ...event,
        userId: user.uid,
        start: Timestamp.fromDate(event.start),
        end: Timestamp.fromDate(event.end),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/events`);
    }
  };

  const removeEvent = async (eventId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'events', eventId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/events/${eventId}`);
    }
  };

  const updateEvent = async (eventId: string, updates: Partial<Omit<CalendarEvent, 'id'>>) => {
    if (!user) return;
    try {
      const firestoreUpdates: any = { ...updates, updatedAt: Timestamp.now() };
      if (updates.start) firestoreUpdates.start = Timestamp.fromDate(updates.start);
      if (updates.end) firestoreUpdates.end = Timestamp.fromDate(updates.end);
      
      await updateDoc(doc(db, 'users', user.uid, 'events', eventId), firestoreUpdates);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/events/${eventId}`);
    }
  };

  const updateEventStatus = async (eventId: string, status: CalendarEvent['status']) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'events', eventId), {
        status,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/events/${eventId}`);
    }
  };

  return { events, loading, addEvent, removeEvent, updateEventStatus, updateEvent };
}

export function isSlotAvailable(events: CalendarEvent[], start: Date, end: Date, excludeEventId?: string): boolean {
  return !events.some(event => {
    if (event.id === excludeEventId || event.status === 'cancelled') return false;
    
    // Overlap condition: (StartA < EndB) and (EndA > StartB)
    return (start < event.end) && (end > event.start);
  });
}

export function findNextAvailableSlot(events: CalendarEvent[], durationMinutes: number, after: Date = new Date()): Date {
  // Solo consideramos eventos que terminan después del tiempo 'after' y no están cancelados
  const relevantEvents = events
    .filter(e => e.status !== 'cancelled' && e.end > after)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let candidate = new Date(after);
  
  for (const event of relevantEvents) {
    // Si hay un hueco entre el candidato y el inicio del siguiente evento
    if (candidate < event.start) {
      const gapSize = (event.start.getTime() - candidate.getTime()) / 60000;
      if (gapSize >= durationMinutes) {
        return candidate;
      }
    }
    // Si el candidato cae dentro del evento, lo movemos al final del evento
    if (candidate < event.end) {
      candidate = new Date(event.end);
      // Redondear al minuto siguiente para limpieza visual
      candidate.setSeconds(0, 0);
      if (candidate.getTime() <= event.end.getTime()) {
        candidate.setMinutes(candidate.getMinutes() + 1);
      }
    }
  }
  
  return candidate;
}
