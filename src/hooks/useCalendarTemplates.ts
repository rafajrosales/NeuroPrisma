import { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { User } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface TemplateEvent {
  title: string;
  description?: string;
  startOffsetMinutes: number;
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
}

export interface DayBlockTemplate {
  id: string;
  name: string;
  events: TemplateEvent[];
  createdAt: Date;
}

export interface WeekBlockTemplate {
  id: string;
  name: string;
  days: {
    dayOfWeek: number;
    events: TemplateEvent[];
  }[];
  createdAt: Date;
}

export function useCalendarTemplates(user: User | null) {
  const [dayBlocks, setDayBlocks] = useState<DayBlockTemplate[]>([]);
  const [weekBlocks, setWeekBlocks] = useState<WeekBlockTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTemplates = async () => {
      try {
        const dQ = query(collection(db, 'users', user.uid, 'dayBlocks'));
        const dSnap = await getDocs(dQ);
        const dData: DayBlockTemplate[] = [];
        dSnap.forEach(d => {
          const data = d.data();
          dData.push({
            id: d.id,
            name: data.name,
            events: data.events || [],
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setDayBlocks(dData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));

        const wQ = query(collection(db, 'users', user.uid, 'weekBlocks'));
        const wSnap = await getDocs(wQ);
        const wData: WeekBlockTemplate[] = [];
        wSnap.forEach(d => {
          const data = d.data();
          wData.push({
            id: d.id,
            name: data.name,
            days: data.days || [],
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setWeekBlocks(wData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/dayBlocks|weekBlocks`);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [user]);

  const addDayBlock = async (name: string, events: TemplateEvent[]) => {
    if (!user) return;
    try {
      const newRef = await addDoc(collection(db, 'users', user.uid, 'dayBlocks'), {
        userId: user.uid,
        name,
        events,
        createdAt: new Date(),
      });
      setDayBlocks(prev => [{ id: newRef.id, name, events, createdAt: new Date() }, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/dayBlocks`);
    }
  };

  const removeDayBlock = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'dayBlocks', id));
      setDayBlocks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/dayBlocks/${id}`);
    }
  };

  const addWeekBlock = async (name: string, days: WeekBlockTemplate['days']) => {
    if (!user) return;
    try {
      const newRef = await addDoc(collection(db, 'users', user.uid, 'weekBlocks'), {
        userId: user.uid,
        name,
        days,
        createdAt: new Date(),
      });
      setWeekBlocks(prev => [{ id: newRef.id, name, days, createdAt: new Date() }, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/weekBlocks`);
    }
  };

  const removeWeekBlock = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'weekBlocks', id));
      setWeekBlocks(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/weekBlocks/${id}`);
    }
  };

  return { dayBlocks, weekBlocks, loading, addDayBlock, removeDayBlock, addWeekBlock, removeWeekBlock };
}
