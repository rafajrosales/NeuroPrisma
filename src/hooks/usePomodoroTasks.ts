import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, query } from 'firebase/firestore';
import { User } from 'firebase/auth';

export interface PomodoroTask {
  id: string;
  name: string;
  workDuration: number;
  breakDuration: number;
  announceInterval: number;
  createdAt: Date;
}

export function usePomodoroTasks(user: User) {
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchTasks = async () => {
      try {
        const q = query(collection(db, 'users', user.uid, 'pomodoroTasks'));
        const snapshot = await getDocs(q);
        const tasksData: PomodoroTask[] = [];
        snapshot.forEach(d => {
          const data = d.data();
          tasksData.push({
            id: d.id,
            name: data.name,
            workDuration: data.workDuration,
            breakDuration: data.breakDuration,
            announceInterval: data.announceInterval,
            createdAt: data.createdAt?.toDate() || new Date(),
          });
        });
        setTasks(tasksData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}/pomodoroTasks`);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [user]);

  const addTask = async (task: Omit<PomodoroTask, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'pomodoroTasks'), {
        ...task,
        userId: user.uid,
        createdAt: new Date(),
      });
      setTasks(prev => [{ ...task, id: docRef.id, createdAt: new Date() }, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/pomodoroTasks`);
    }
  };

  const removeTask = async (taskId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'pomodoroTasks', taskId));
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/pomodoroTasks/${taskId}`);
    }
  };

  return { tasks, loading, addTask, removeTask };
}
