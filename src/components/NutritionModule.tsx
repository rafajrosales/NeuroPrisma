import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Utensils, Droplets, Plus, Trash2, Calendar, Scale, Ruler, Sparkles, Loader2, Brain, ChevronRight, Search, Filter, Ban, CheckCircle2, AlertCircle, ListChecks, BookOpen, ClipboardList, Info } from 'lucide-react';
import { db, doc, getDoc, updateDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, addDoc, getDocs, orderBy, deleteDoc, serverTimestamp, Timestamp, where, setDoc } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface NutritionLog {
  id: string;
  userId: string;
  mealType: 'desayuno' | 'almuerzo' | 'comida' | 'cena' | 'snack' | 'suplemento' | 'hidratacion';
  description: string;
  calories?: number;
  waterAmount?: number;
  timestamp: Date;
}

interface FoodItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  status: 'permitido' | 'moderado' | 'prohibido';
  notes?: string;
}

interface NutritionalDish {
  id: string;
  userId: string;
  name: string;
  ingredients: string[];
  instructions?: string;
}

interface NutritionalPlan {
  id: string;
  userId: string;
  generalIndications: string;
  forbiddenGeneral: string[];
}

const MEAL_TYPES = [
  { value: 'desayuno', label: 'Desayuno', icon: '🍳' },
  { value: 'almuerzo', label: 'Almuerzo', icon: '🥪' },
  { value: 'comida', label: 'Comida', icon: '🍱' },
  { value: 'cena', label: 'Cena', icon: '🥗' },
  { value: 'snack', label: 'Snack/Botana', icon: '🍎' },
  { value: 'suplemento', label: 'Suplemento', icon: '💊' },
  { value: 'hidratacion', label: 'Hidratación', icon: '💧' },
];

const FOOD_CATEGORIES = [
  "Proteínas", "Carbohidratos", "Grasas Saludables", "Vegetales", "Frutas", "Lácteos", "Bebidas", "Complementos"
];

type Tab = 'diario' | 'alimentos' | 'platillos' | 'plan';

export default function NutritionModule({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState<Tab>('diario');
  const [logs, setLogs] = useState<NutritionLog[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [dishes, setDishes] = useState<NutritionalDish[]>([]);
  const [plan, setPlan] = useState<NutritionalPlan | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // States for forms
  const [mealForm, setMealForm] = useState({ type: 'comida' as any, description: '', amount: '' });
  const [foodForm, setFoodForm] = useState({ name: '', category: FOOD_CATEGORIES[0], status: 'permitido' as any, notes: '' });
  const [dishForm, setDishForm] = useState({ name: '', ingredients: [] as string[], instructions: '' });
  const [planForm, setPlanForm] = useState({ indications: '', forbidden: '' });

  useEffect(() => {
    fetchData();
    fetchProfile();
  }, [user.uid]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const logsSnap = await getDocs(query(collection(db, 'users', user.uid, 'nutritionLogs'), orderBy('timestamp', 'desc')));
      const foodsSnap = await getDocs(query(collection(db, 'users', user.uid, 'foodItems'), orderBy('category', 'asc')));
      const dishesSnap = await getDocs(query(collection(db, 'users', user.uid, 'nutritionalDishes')));
      const planSnap = await getDocs(collection(db, 'users', user.uid, 'nutritionalPlans'));

      setLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() } as NutritionLog)));
      setFoods(foodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as FoodItem)));
      setDishes(dishesSnap.docs.map(d => ({ id: d.id, ...d.data() } as NutritionalDish)));
      
      if (!planSnap.empty) {
        const pData = planSnap.docs[0].data() as NutritionalPlan;
        setPlan({ id: planSnap.docs[0].id, ...pData });
        setPlanForm({ indications: pData.generalIndications, forbidden: pData.forbiddenGeneral?.join(', ') || '' });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchProfile = async () => {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) setProfile(snap.data());
  };

  // Actions
  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const data: any = {
        userId: user.uid,
        mealType: mealForm.type,
        description: mealForm.type === 'hidratacion' ? 'Agua' : mealForm.description,
        timestamp: serverTimestamp(),
      };
      if (mealForm.type === 'hidratacion') data.waterAmount = Number(mealForm.amount);
      else if (mealForm.amount) data.calories = Number(mealForm.amount);

      await addDoc(collection(db, 'users', user.uid, 'nutritionLogs'), data);
      setMealForm({ type: 'comida', description: '', amount: '' });
      fetchData();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/nutritionLogs`);
    }
    setIsSaving(false);
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'users', user.uid, 'foodItems'), { 
        userId: user.uid, ...foodForm 
      });
      setFoodForm({ name: '', category: FOOD_CATEGORIES[0], status: 'permitido', notes: '' });
      fetchData();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/foodItems`);
    }
    setIsSaving(false);
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'nutritionalDishes'), {
        userId: user.uid, ...dishForm
      });
      setDishForm({ name: '', ingredients: [], instructions: '' });
      fetchData();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/nutritionalDishes`);
    }
    setIsSaving(false);
  };

  const handleUpdatePlan = async () => {
    setIsSaving(true);
    try {
      const planData = {
        userId: user.uid,
        generalIndications: planForm.indications,
        forbiddenGeneral: planForm.forbidden.split(',').map(s => s.trim()).filter(Boolean),
        updatedAt: serverTimestamp()
      };
      
      const planId = plan?.id;
      if (planId) {
        await setDoc(doc(db, 'users', user.uid, 'nutritionalPlans', planId), planData);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'nutritionalPlans'), planData);
      }
      fetchData();
    } catch (err) { 
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/nutritionalPlans`);
    }
    setIsSaving(false);
  };

  const deleteItem = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, col, id));
      fetchData();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/${col}/${id}`);
    }
  };

  // Stats
  const dailyWater = logs.filter(l => startOfDay(l.timestamp).getTime() === startOfDay(new Date()).getTime() && l.mealType === 'hidratacion').reduce((a, b) => a + (b.waterAmount || 0), 0);
  const dailyCalories = logs.filter(l => startOfDay(l.timestamp).getTime() === startOfDay(new Date()).getTime() && l.mealType !== 'hidratacion').reduce((a, b) => a + (b.calories || 0), 0);

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all",
        activeTab === id 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-text-muted hover:bg-surface hover:text-text-main"
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24">
      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 bg-surface p-2 rounded-3xl border border-border shadow-sm w-fit mx-auto">
        <TabButton id="diario" label="Diario" icon={ClipboardList} />
        <TabButton id="alimentos" label="Base de Alimentos" icon={ListChecks} />
        <TabButton id="platillos" label="Mis Platillos" icon={Utensils} />
        <TabButton id="plan" label="Plan Nutricional" icon={Info} />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'diario' && (
          <motion.div key="diario" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100"><Droplets className="w-6 h-6" /></div>
                <div>
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Agua Hoy</p>
                  <p className="text-2xl font-black text-text-main tabular-nums">{dailyWater} <span className="text-xs font-bold opacity-40">ml</span></p>
                </div>
              </div>
              <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4 md:col-span-2">
                 <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 shrink-0"><Utensils className="w-6 h-6" /></div>
                 <div className="flex-1">
                   <div className="flex justify-between items-end mb-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Energía Ingerida</p>
                      <p className="text-xs font-bold text-text-main">{dailyCalories} / 2000 <span className="text-[10px] opacity-40">kcal</span></p>
                   </div>
                   <div className="h-2 bg-background rounded-full overflow-hidden border border-border">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (dailyCalories / 2000) * 100)}%` }} className="h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                   </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6">
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-black text-text-main tracking-tight">Nuevo Registro</h3>
                  </div>
                  <form onSubmit={handleAddLog} className="space-y-6">
                    <div className="grid grid-cols-4 gap-2">
                      {MEAL_TYPES.map(t => (
                        <button key={t.value} type="button" onClick={() => setMealForm({...mealForm, type: t.value})} className={cn("p-3 rounded-xl border text-xl flex items-center justify-center transition-all", mealForm.type === t.value ? "bg-primary border-primary shadow-lg shadow-primary/20 scale-105" : "bg-background border-border hover:bg-border/50")}>{t.icon}</button>
                      ))}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">{mealForm.type === 'hidratacion' ? 'Cantidad (ml)' : 'Descripción'}</label>
                       {mealForm.type === 'hidratacion' ? (
                         <input type="number" value={mealForm.amount} onChange={e => setMealForm({...mealForm, amount: e.target.value})} placeholder="250" className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold" />
                       ) : (
                         <textarea value={mealForm.description} onChange={e => setMealForm({...mealForm, description: e.target.value})} placeholder="¿Qué comiste?..." className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-medium h-24 resize-none" />
                       )}
                    </div>
                    {mealForm.type !== 'hidratacion' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Calorías Est. (kcal)</label>
                        <input type="number" value={mealForm.amount} onChange={e => setMealForm({...mealForm, amount: e.target.value})} placeholder="0" className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold" />
                      </div>
                    )}
                    <button type="submit" disabled={isSaving} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Registrar
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-2">
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm min-h-[400px]">
                   <h3 className="text-lg font-black text-text-main tracking-tight mb-8">Registros Recientes</h3>
                   <div className="space-y-4">
                      {logs.length === 0 ? <p className="text-center py-20 text-text-muted text-xs font-bold uppercase tracking-widest opacity-30">Sin registros hoy</p> : logs.map(log => (
                        <div key={log.id} className="group bg-background p-4 rounded-2xl border border-border flex items-center justify-between">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center text-lg">{MEAL_TYPES.find(m => m.value === log.mealType)?.icon}</div>
                              <div>
                                 <p className="text-sm font-bold text-text-main">{log.description}</p>
                                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{format(log.timestamp, 'HH:mm')} {log.calories ? `• ${log.calories} kcal` : log.waterAmount ? `• ${log.waterAmount} ml` : ''}</p>
                              </div>
                           </div>
                           <button onClick={() => deleteItem('nutritionLogs', log.id)} className="p-2 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'alimentos' && (
          <motion.div key="alimentos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 space-y-6">
                <div className="bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6">
                  <div className="flex items-center gap-3"><Plus className="w-5 h-5 text-primary" /><h3 className="text-lg font-black text-text-main tracking-tight">Agregar Alimento</h3></div>
                  <form onSubmit={handleAddFood} className="space-y-4">
                    <input type="text" placeholder="Nombre del alimento" value={foodForm.name} onChange={e => setFoodForm({...foodForm, name: e.target.value})} className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold" />
                    <select value={foodForm.category} onChange={e => setFoodForm({...foodForm, category: e.target.value})} className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold">
                       {FOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="flex gap-2">
                       {['permitido', 'moderado', 'prohibido'].map(s => (
                         <button key={s} type="button" onClick={() => setFoodForm({...foodForm, status: s as any})} className={cn("flex-1 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all", foodForm.status === s ? (s === 'permitido' ? "bg-emerald-500 text-white border-emerald-500" : s === 'moderado' ? "bg-amber-500 text-white border-amber-500" : "bg-rose-500 text-white border-rose-500") : "bg-background text-text-muted border-border")}>
                           {s}
                         </button>
                       ))}
                    </div>
                    <button type="submit" disabled={!foodForm.name} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest">Añadir a Base</button>
                  </form>
                </div>
             </div>
             <div className="lg:col-span-2 bg-surface p-6 rounded-3xl border border-border shadow-sm">
                <h3 className="text-lg font-black text-text-main tracking-tight mb-8">Base de Datos de Alimentos</h3>
                <div className="space-y-8">
                  {FOOD_CATEGORIES.map(cat => {
                    const catFoods = foods.filter(f => f.category === cat);
                    if (catFoods.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-4">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-widest pl-2 border-l-2 border-primary">{cat}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {catFoods.map(food => (
                            <div key={food.id} className="group flex items-center justify-between p-4 bg-background rounded-2xl border border-border">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-2 h-2 rounded-full", food.status === 'permitido' ? "bg-emerald-500" : food.status === 'moderado' ? "bg-amber-500" : "bg-rose-500")} />
                                <span className="text-sm font-bold text-text-main">{food.name}</span>
                              </div>
                              <button onClick={() => deleteItem('foodItems', food.id)} className="p-2 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
          </motion.div>
        )}

        {activeTab === 'platillos' && (
          <motion.div key="platillos" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-1 bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6 self-start">
               <div className="flex items-center gap-3"><Plus className="w-5 h-5 text-primary" /><h3 className="text-lg font-black text-text-main tracking-tight">Crear Platillo</h3></div>
               <form onSubmit={handleAddDish} className="space-y-4">
                  <input type="text" placeholder="Nombre del platillo" value={dishForm.name} onChange={e => setDishForm({...dishForm, name: e.target.value})} className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold" />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Ingredientes</label>
                    <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-background border border-border rounded-xl">
                       {foods.filter(f => f.status !== 'prohibido').map(f => (
                         <label key={f.id} className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg cursor-pointer transition-colors">
                           <input type="checkbox" checked={dishForm.ingredients.includes(f.name)} onChange={e => {
                             const ingredients = e.target.checked ? [...dishForm.ingredients, f.name] : dishForm.ingredients.filter(i => i !== f.name);
                             setDishForm({...dishForm, ingredients});
                           }} className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
                           <span className="text-xs font-medium text-text-main">{f.name}</span>
                         </label>
                       ))}
                    </div>
                  </div>
                  <textarea placeholder="Instrucciones de preparación (opcional)" value={dishForm.instructions} onChange={e => setDishForm({...dishForm, instructions: e.target.value})} className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-medium h-24 resize-none" />
                  <button type="submit" disabled={!dishForm.name || dishForm.ingredients.length === 0} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest">Guardar Platillo</button>
               </form>
             </div>
             <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
               {dishes.map(dish => (
                 <div key={dish.id} className="group bg-surface p-6 rounded-3xl border border-border shadow-sm hover:border-primary/30 transition-all flex flex-col">
                   <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-black text-text-main tracking-tight leading-tight">{dish.name}</h4>
                      <button onClick={() => deleteItem('nutritionalDishes', dish.id)} className="p-2 text-text-muted hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
                   </div>
                   <div className="flex flex-wrap gap-1.5 mb-6">
                      {dish.ingredients.map(ing => (
                        <span key={ing} className="px-2 py-1 bg-background border border-border rounded-lg text-[10px] font-bold text-text-muted uppercase">{ing}</span>
                      ))}
                   </div>
                   {dish.instructions && (
                     <div className="mt-auto pt-4 border-t border-border">
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Preparación</p>
                        <p className="text-xs text-text-main leading-relaxed font-medium line-clamp-3">{dish.instructions}</p>
                     </div>
                   )}
                 </div>
               ))}
             </div>
          </motion.div>
        )}

        {activeTab === 'plan' && (
          <motion.div key="plan" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} className="max-w-3xl mx-auto w-full space-y-8">
            <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm space-y-8">
              <div className="flex items-center gap-4 border-b border-border pb-6">
                 <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100"><ClipboardList className="w-7 h-7" /></div>
                 <div>
                    <h3 className="text-2xl font-black text-text-main tracking-tight">Indicaciones de Nutriología</h3>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Guía estratégica personalizada</p>
                 </div>
              </div>

              <div className="grid gap-8">
                <div className="space-y-4">
                   <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /><h4 className="text-sm font-black text-text-main uppercase tracking-tight">Indicaciones Generales</h4></div>
                   <textarea value={planForm.indications} onChange={e => setPlanForm({...planForm, indications: e.target.value})} placeholder="Ej: Beber 2L de agua, evitar azúcares refinados, priorizar grasas omega-3 para soporte cognitivo..." className="w-full px-6 py-5 bg-background border border-border rounded-2xl text-sm font-medium h-40 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all" />
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-2"><Ban className="w-5 h-5 text-rose-500" /><h4 className="text-sm font-black text-text-main uppercase tracking-tight">Alimentos Prohibidos</h4></div>
                   <input type="text" value={planForm.forbidden} onChange={e => setPlanForm({...planForm, forbidden: e.target.value})} placeholder="Ej: Refrescos, Harinas Blancas, Embutidos (separados por coma)" className="w-full px-6 py-5 bg-background border border-border rounded-2xl text-sm font-bold" />
                   <p className="text-[10px] text-text-muted pl-4">Estos se marcarán globalmente en tu base de datos y alertas.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                 <button onClick={handleUpdatePlan} disabled={isSaving} className="px-10 py-4 bg-primary text-white rounded-2xl font-extrabold text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-3">
                   {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-5 h-5" />} Actualizar Plan Maestro
                 </button>
              </div>
            </div>

            {/* Nutrition Tip */}
            <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4">
               <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
               <p className="text-xs text-amber-900 font-medium leading-relaxed">
                 <span className="font-black uppercase tracking-widest block mb-1">Nota Neuro-Cognitiva:</span>
                 Un intestino inflamado produce neuro-inflamación. Sigue las restricciones del plan para mantener tu claridad mental y estabilidad neuro-afectiva.
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
