import React, { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  Utensils,
  Droplets,
  Plus,
  Trash2,
  Calendar,
  Scale,
  Ruler,
  Sparkles,
  Loader2,
  Brain,
  ChevronRight,
  Search,
  Filter,
  Ban,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  BookOpen,
  Clock,
  ClipboardList,
  Info,
  Package,
  X,
  ShoppingBag,
  Zap,
  ChefHat,
} from "lucide-react";
import {
  db,
  doc,
  getDoc,
  updateDoc,
  handleFirestoreError,
  OperationType,
} from "../lib/firebase";
import {
  collection,
  query,
  addDoc,
  getDocs,
  orderBy,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  where,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { cn } from "../lib/utils";
import {
  getNutritionalSuggestions,
  getWeeklyGrocerySuggestions,
} from "../services/aiService";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { motion, AnimatePresence } from "motion/react";
import { INITIAL_FOODS } from "../data/initialFoods";

interface FoodItem {
  id: string;
  userId: string;
  name: string;
  category: string;
  status: "permitido" | "moderado" | "prohibido";
  unit?: string;
  notes?: string;
}

interface NutritionalDish {
  id: string;
  userId: string;
  name: string;
  ingredients: { name: string; quantity: string }[];
  instructions?: string;
  status?: "template" | "preparando";
  fridgeItemIds?: string[];
  createdAt?: any;
}

interface PortionPlan {
  group: string;
  total: number;
  desayuno: number;
  colacion1: number;
  comida: number;
  colacion2: number;
  cena: number;
}

interface NutritionalPlan {
  id: string;
  userId: string;
  generalIndications: string;
  forbiddenGeneral: string[];
  portions: PortionPlan[];
  glucoseGoals?: {
    fasting: string;
    postMeal: string;
  };
}

const FOOD_CATEGORIES = [
  "Frutas",
  "Cereales",
  "Verduras",
  "Leguminosas",
  "Alimentos de origen animal",
  "Grasas",
  "Lácteos/bebida vegetal",
  "Semillas",
  "Otros",
];

type Tab =
  | "mercado"
  | "cocina"
  | "refrigerador"
  | "alimentos"
  | "platillos"
  | "plan";

interface ShoppingItem {
  id: string;
  foodId: string;
  name: string;
  category: string;
  quantity?: string;
  status: "permitido" | "moderado" | "prohibido" | "libre";
  dishName?: string;
  bought: boolean;
}

interface FridgeItem {
  id: string;
  foodId: string;
  name: string;
  category: string;
  quantity?: string;
  dishName?: string;
  confirmed?: boolean;
}

export default function NutritionModule({ user, isOnline }: { user: User, isOnline: boolean }) {
  const [activeTab, setActiveTab] = useState<Tab>("cocina");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [dishes, setDishes] = useState<NutritionalDish[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [fridge, setFridge] = useState<FridgeItem[]>([]);
  const [suggestedDishes, setSuggestedDishes] = useState<any[]>([]);
  const [plan, setPlan] = useState<NutritionalPlan | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<string>("comida");
  const [prepTime, setPrepTime] = useState<"rápido" | "estándar" | "elaborado">(
    "estándar",
  );

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingMarket, setIsGeneratingMarket] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Verification state for fridge to kitchen move
  const [verifyingKitchen, setVerifyingKitchen] = useState<{
    dishName: string;
    items: FridgeItem[];
    dishId?: string;
  } | null>(null);
  const [itemsToKeepInFridge, setItemsToKeepInFridge] = useState<Set<string>>(
    new Set(),
  );

  const INITIAL_PORTIONS: PortionPlan[] = [
    {
      group: "Verduras",
      total: 5,
      desayuno: 2,
      colacion1: 0,
      comida: 2,
      colacion2: 0,
      cena: 1,
    },
    {
      group: "Frutas",
      total: 2,
      desayuno: 0,
      colacion1: 1,
      comida: 0,
      colacion2: 1,
      cena: 0,
    },
    {
      group: "Cereales",
      total: 6,
      desayuno: 2,
      colacion1: 0,
      comida: 2,
      colacion2: 0,
      cena: 2,
    },
    {
      group: "A. Origen Animal",
      total: 9,
      desayuno: 3,
      colacion1: 0,
      comida: 3,
      colacion2: 0,
      cena: 3,
    },
    {
      group: "Aceites",
      total: 3,
      desayuno: 1,
      colacion1: 0,
      comida: 1,
      colacion2: 0,
      cena: 1,
    },
    {
      group: "Semillas",
      total: 1,
      desayuno: 0,
      colacion1: 0.5,
      comida: 0,
      colacion2: 0.5,
      cena: 0,
    },
  ];

  // States for forms
  const [foodForm, setFoodForm] = useState({
    name: "",
    category: FOOD_CATEGORIES[0],
    status: "permitido" as any,
    notes: "",
    unit: "",
  });
  const [dishForm, setDishForm] = useState({
    name: "",
    ingredients: [] as { name: string; quantity: string }[],
    instructions: "",
  });
  const [planForm, setPlanForm] = useState({ indications: "", forbidden: "" });
  const [selectedCategory, setSelectedCategory] = useState(FOOD_CATEGORIES[0]);
  const [selectedStatus, setSelectedStatus] = useState<string | "all">("all");
  const [marketSearch, setMarketSearch] = useState("");
  const [marketQuantities, setMarketQuantities] = useState<
    Record<string, string>
  >({});
  const [marketUnits, setMarketUnits] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
    fetchProfile();
  }, [user.uid]);

  const sendDishToKitchen = async (
    dishName: string,
    items: FridgeItem[],
    providedInstructions?: string,
  ) => {
    setIsSaving(true);
    try {
      const template = dishes.find(
        (d) =>
          d.name.trim().toLowerCase() === dishName.trim().toLowerCase() &&
          d.status === "template",
      );
      const instructions = providedInstructions || template?.instructions || "";

      const batch = writeBatch(db);
      const dishRef = doc(
        collection(db, "users", user.uid, "nutritionalDishes"),
      );

      const dishData = {
        name: dishName,
        ingredients: items.map((i) => ({
          name: i.name,
          quantity: i.quantity || "1 u.",
        })),
        instructions: instructions,
        status: "preparando",
        fridgeItemIds: items.map((i) => i.id),
        createdAt: serverTimestamp(),
        userId: user.uid,
      };

      batch.set(dishRef, dishData);

      // NO ELIMINAMOS NADA DEL REFRI TODAVÍA.
      // Simplemente marcamos que están confirmados si no lo estaban
      items.forEach((i) => {
        if (!i.confirmed) {
          batch.update(doc(db, "users", user.uid, "fridge", i.id), {
            confirmed: true,
          });
        }
      });

      await batch.commit();

      setDishes((prev) => [
        ...prev,
        { id: dishRef.id, ...dishData } as NutritionalDish,
      ]);
      setFridge((prev) =>
        prev.map((f) => {
          if (items.some((i) => i.id === f.id)) {
            return { ...f, confirmed: true };
          }
          return f;
        }),
      );

      alert(`👨‍🍳 ¡Ingredientes listos! "${dishName}" se ha movido a La Cocina.`);
      setActiveTab("cocina");
      setVerifyingKitchen(null);
      setItemsToKeepInFridge(new Set());
    } catch (e) {
      handleFirestoreError(
        e,
        OperationType.WRITE,
        `users/${user.uid}/fridge/autoSendToKitchen`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFridgeCheck = async (item: FridgeItem) => {
    try {
      const newStatus = !item.confirmed;
      await updateDoc(doc(db, "users", user.uid, "fridge", item.id), {
        confirmed: newStatus,
      });

      const updatedFridge = fridge.map((f) =>
        f.id === item.id ? { ...f, confirmed: newStatus } : f,
      );
      setFridge(updatedFridge);

      // Si es un platillo y se acaba de confirmar el ultimo ingrediente, mandamos a cocina DIRECTO
      if (item.dishName && item.dishName !== "Básicos" && newStatus) {
        const dishItems = updatedFridge.filter(
          (f) => f.dishName === item.dishName,
        );
        if (dishItems.every((i) => i.confirmed)) {
          await sendDishToKitchen(item.dishName, dishItems);
        }
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${user.uid}/fridge/${item.id}`,
      );
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const foodsSnap = await getDocs(
        query(
          collection(db, "users", user.uid, "foodItems"),
          orderBy("category", "asc"),
        ),
      );
      const dishesSnap = await getDocs(
        query(collection(db, "users", user.uid, "nutritionalDishes")),
      );
      const shoppingSnap = await getDocs(
        query(collection(db, "users", user.uid, "shoppingList")),
      );
      const fridgeSnap = await getDocs(
        query(collection(db, "users", user.uid, "fridge")),
      );
      const planSnap = await getDocs(
        collection(db, "users", user.uid, "nutritionalPlans"),
      );

      const dbFoods = foodsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as FoodItem,
      );

      // -- LIMPIEZA DE DUPLICADOS --
      const seen = new Map<string, FoodItem>();
      const duplicatesToRemove: string[] = [];
      const cleanDbFoods: FoodItem[] = [];

      dbFoods.forEach((food) => {
        const normalizedName = food.name.trim().toLowerCase();
        if (seen.has(normalizedName)) {
          duplicatesToRemove.push(food.id);
        } else {
          seen.set(normalizedName, food);
          cleanDbFoods.push(food);
        }
      });

      const batchUpdate = writeBatch(db);
      let needsUpdate = false;

      // Borrar duplicados si existen
      if (duplicatesToRemove.length > 0) {
        needsUpdate = true;
        duplicatesToRemove.forEach((id) => {
          batchUpdate.delete(doc(db, "users", user.uid, "foodItems", id));
        });
      }

      const updatedFoods = cleanDbFoods.map((dbFood) => {
        const initFood = INITIAL_FOODS.find((i) => i.name === dbFood.name);
        if (
          initFood &&
          (dbFood.notes !== initFood.notes || dbFood.unit !== initFood.unit)
        ) {
          needsUpdate = true;
          batchUpdate.update(
            doc(db, "users", user.uid, "foodItems", dbFood.id),
            {
              notes: initFood.notes || "",
              unit: initFood.unit || "",
            },
          );
          return { ...dbFood, notes: initFood.notes, unit: initFood.unit };
        }
        return dbFood;
      });

      if (needsUpdate) {
        try {
          await batchUpdate.commit();
        } catch (e) {}
      }

      setFoods(updatedFoods);
      setDishes(
        dishesSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as NutritionalDish,
        ),
      );
      setShoppingList(
        shoppingSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ShoppingItem,
        ),
      );
      setFridge(
        fridgeSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as FridgeItem),
      );

      if (!planSnap.empty) {
        const pData = planSnap.docs[0].data() as NutritionalPlan;
        setPlan({ id: planSnap.docs[0].id, ...pData });
        setPlanForm({
          indications: pData.generalIndications,
          forbidden: pData.forbiddenGeneral?.join(", ") || "",
        });
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const fetchProfile = async () => {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) setProfile(snap.data());
  };

  // Fridge Actions
  const addToFridge = async (food: FoodItem) => {
    if (
      fridge.some(
        (item) =>
          item.foodId === food.id && (item as any).dishName === "Básicos",
      )
    )
      return;
    try {
      const newItem = {
        foodId: food.id,
        name: food.name,
        category: food.category,
        dishName: "Básicos",
        addedAt: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "users", user.uid, "fridge"),
        newItem,
      );
      setFridge([...fridge, { id: docRef.id, ...newItem } as FridgeItem]);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/fridge`,
      );
    }
  };

  const removeFromFridge = async (id: string) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "fridge", id));
      setFridge(fridge.filter((item) => item.id !== id));
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/fridge/${id}`,
      );
    }
  };

  const parseConversionInfo = (notes: string) => {
    if (!notes) return null;
    const match = notes.match(
      /(?:Porción:\s*)?([\d\s\/]+)(?:de\s+)?(taza|cucharada|cucharadita|pieza|pza|lata|l|litro|g|gramos|ml)(?:s)?\s*(?:\(~([\d\.]+)(g|ml)[^\)]*\))?/i,
    );
    if (!match) return null;

    let qtyStr = match[1].trim();
    let qty = 0;
    if (qtyStr.includes(" ")) {
      const [whole, frac] = qtyStr.split(" ");
      const [n, d] = frac.split("/");
      qty = parseInt(whole) + parseInt(n) / parseInt(d);
    } else if (qtyStr.includes("/")) {
      const [n, d] = qtyStr.split("/");
      qty = parseInt(n) / parseInt(d);
    } else {
      qty = parseFloat(qtyStr);
    }

    let unit = match[2].toLowerCase();
    let g_ml = match[3] ? parseFloat(match[3]) : 0;
    let g_ml_unit = match[4] || "";
    return { qty, unit, g_ml, g_ml_unit };
  };

  const getShoppingFinalName = (
    food: FoodItem,
    quantityInput: string | null,
  ): string => {
    if (!quantityInput || !quantityInput.trim()) return food.name;
    const input = quantityInput.trim();
    const baseName = food.name.trim();

    const conv = parseConversionInfo(food.notes || "");
    if (!conv) {
      return `${input} de ${baseName}`;
    }

    // Try to parse the number they inputted
    const numMatch = input.match(/^([\d\.\s\/]+)/);
    let userQty = 0;
    if (numMatch) {
      let qStr = numMatch[1].trim();
      if (qStr.includes(" ")) {
        const [whole, frac] = qStr.split(" ");
        if (frac.includes("/")) {
          const [n, d] = frac.split("/");
          userQty = parseInt(whole) + parseInt(n) / parseInt(d);
        } else {
          userQty = parseFloat(whole); // Fallback
        }
      } else if (qStr.includes("/")) {
        const [n, d] = qStr.split("/");
        userQty = parseInt(n) / parseInt(d);
      } else {
        userQty = parseFloat(qStr);
      }
    }

    // Check if the user mentioned a unit
    let userUnit = "";
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes("taza")) userUnit = "taza";
    else if (lowerInput.includes("cucharada")) userUnit = "cucharada";
    else if (lowerInput.includes("cucharadita")) userUnit = "cucharadita";
    else if (lowerInput.includes("pieza")) userUnit = "pieza";
    else if (lowerInput.includes("lata")) userUnit = "lata";

    // If they just typed numbers, assume they meant portions based on their food unit
    if (userQty > 0) {
      // If user typed '2 tazas' and the food uses 'taza', we convert!
      if (userUnit && userUnit === conv.unit && conv.g_ml > 0) {
        let totalGml = (userQty / conv.qty) * conv.g_ml;
        return `${input} (~${Math.round(totalGml)}${conv.g_ml_unit}) de ${baseName}`;
      }

      // If no unit typed but we can infer they meant the recipe unit
      if (!userUnit && conv.unit) {
        let unitStr = userQty === 1 ? conv.unit : conv.unit + "s";
        if (conv.g_ml > 0) {
          let totalGml = (userQty / conv.qty) * conv.g_ml;
          return `${userQty} ${unitStr} (~${Math.round(totalGml)}${conv.g_ml_unit}) de ${baseName}`;
        }
        return `${userQty} ${unitStr} de ${baseName}`;
      }
    }

    return `${input} de ${baseName}`;
  };

  // Shopping List Actions
  const removeFromShoppingList = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, "shoppingList", itemId));
      setShoppingList((prev) => prev.filter((item) => item.id !== itemId));
    } catch (err) {
      console.error("Error removing from shopping list:", err);
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/shoppingList/${itemId}`,
      );
    }
  };

  const addToShoppingList = async (
    food: FoodItem,
    quantityOverride?: string,
  ) => {
    console.log("addToShoppingList called for:", food);
    if (shoppingList.some((item) => item.foodId === food.id)) return;

    // Simplificación: omitir prompt para evitar problemas en iFrame
    let rawQty = quantityOverride || marketQuantities[food.id] || "";
    let unit = marketUnits[food.id] || "kg";
    let quantity = rawQty ? `${rawQty} ${unit}`.trim() : "";
    let finalName = food.name;

    try {
      const newItem = {
        foodId: food.id,
        name: finalName,
        category: food.category,
        quantity: quantity,
        dishName: "Básicos",
        status: food.status,
        bought: false,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "users", user.uid, "shoppingList"),
        newItem,
      );
      console.log("Added to firestore, docRef:", docRef.id);
      setShoppingList([
        ...shoppingList,
        { id: docRef.id, ...newItem } as ShoppingItem,
      ]);
      // Clear quantity for this item after adding
      setMarketQuantities((prev) => {
        const next = { ...prev };
        delete next[food.id];
        return next;
      });
    } catch (err) {
      console.error("Error adding to shopping list:", err);
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/shoppingList`,
      );
    }
  };

  const handleManualAddToMarket = async (itemName: string) => {
    if (!itemName || itemName.trim() === "") return;

    // Simple regex to parse quantity if it starts with number + unit (e.g. "2kg manz")
    let cleanName = itemName.trim();
    let detectedQty = "";

    const qtyRegex =
      /^([\d\.]+\s*(?:kg|kilos?|l|litros?|g|gramos?|u|unidades?))\s+(?:de\s+)?(.*)/i;
    const match = cleanName.match(qtyRegex);
    if (match) {
      detectedQty = match[1];
      cleanName = match[2];
    }

    setIsSaving(true);
    try {
      const existingFood = foods.find(
        (f) => f.name.toLowerCase() === cleanName.toLowerCase(),
      );

      // 1. Add to foodItems (the "master" list) if it doesn't exist
      let foodId = existingFood?.id;
      if (!existingFood) {
        const foodDocRef = await addDoc(
          collection(db, "users", user.uid, "foodItems"),
          {
            userId: user.uid,
            name: cleanName,
            category: "Otros",
            status: "permitido",
          },
        );
        foodId = foodDocRef.id;
        setFoods((prev) => [
          ...prev,
          {
            id: foodId!,
            userId: user.uid,
            name: cleanName,
            category: "Otros",
            status: "permitido",
          } as FoodItem,
        ]);
      }

      // 2. Add to shoppingList
      const newItem = {
        foodId: foodId!,
        name: cleanName,
        category: "Otros",
        quantity: detectedQty,
        status: "permitido",
        bought: false,
        createdAt: serverTimestamp(),
      };
      const docRef = await addDoc(
        collection(db, "users", user.uid, "shoppingList"),
        newItem,
      );
      setShoppingList((prev) => [
        ...prev,
        { id: docRef.id, ...newItem } as ShoppingItem,
      ]);
    } catch (err) {
      console.error("Error adding manual item:", err);
      alert(
        `Error al agregar "${cleanName}": ${err instanceof Error ? err.message : "Error desconocido"}`,
      );
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/shoppingList`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDropShopping = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const foodData = JSON.parse(e.dataTransfer.getData("text/plain"));
      addToShoppingList(foodData);
    } catch (err) {
      console.error("Error parsing dragged data:", err);
    }
  };

  const toggleBought = async (itemId: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus;
      await updateDoc(doc(db, "users", user.uid, "shoppingList", itemId), {
        bought: newStatus,
      });

      const updatedList = shoppingList.map((item) =>
        item.id === itemId ? { ...item, bought: newStatus } : item,
      );
      setShoppingList(updatedList);

      // Logica automatica: si todos los ingredientes de este grupo estan marcados, moverlos ya
      const changedItem = updatedList.find((i) => i.id === itemId);
      if (changedItem && newStatus) {
        const itemDish = changedItem.dishName || "Básicos";
        const groupItems = updatedList.filter(
          (i) => (i.dishName || "Básicos") === itemDish,
        );
        const allBought = groupItems.every((i) => i.bought);

        if (allBought) {
          setIsSaving(true);
          try {
            const batch = writeBatch(db);
            const newFridgeItems: FridgeItem[] = [];

            for (const item of groupItems) {
              const fridgeRef = doc(
                collection(db, "users", user.uid, "fridge"),
              );
              const fridgeData = {
                foodId: item.foodId,
                name: item.name,
                category: item.category,
                quantity: item.quantity || "",
                dishName: itemDish,
                confirmed: false,
                addedAt: serverTimestamp(),
              };
              batch.set(fridgeRef, fridgeData);
              batch.delete(doc(db, "users", user.uid, "shoppingList", item.id));
              newFridgeItems.push({
                id: fridgeRef.id,
                ...fridgeData,
              } as FridgeItem);
            }

            await batch.commit();
            setFridge((prev) => [...prev, ...newFridgeItems]);
            setShoppingList((prev) =>
              prev.filter((i) => !groupItems.some((gi) => gi.id === i.id)),
            );

            alert(
              `✅ Receta "${itemDish}" completada.\n\nSe ha movido al refrigerador para verificación final.`,
            );
            setActiveTab("refrigerador");
          } catch (err) {
            handleFirestoreError(
              err,
              OperationType.WRITE,
              `users/${user.uid}/shoppingList/autoMove`,
            );
          } finally {
            setIsSaving(false);
          }
        }
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${user.uid}/shoppingList/${itemId}`,
      );
    }
  };

  const clearBoughtItems = async () => {
    if (shoppingList.length === 0) return;

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const newFridgeItems: FridgeItem[] = [];

      for (const item of shoppingList) {
        // Only if not already in fridge (matching name AND dish to avoid incorrect skips)
        const itemDish = item.dishName || "Básicos";
        const existsInFridge = fridge.some((f) => {
          if (
            f.foodId &&
            item.foodId &&
            f.foodId === item.foodId &&
            (f as any).dishName === itemDish
          )
            return true;
          const fName = f.name.toLowerCase().trim();
          const iName = item.name.toLowerCase().trim();
          return fName === iName && (f as any).dishName === itemDish;
        });

        if (!existsInFridge) {
          const fridgeRef = doc(collection(db, "users", user.uid, "fridge"));
          const fridgeData = {
            foodId: item.foodId,
            name: item.name,
            category: item.category,
            quantity: item.quantity || "",
            dishName: itemDish,
            confirmed: false,
            addedAt: serverTimestamp(),
          };
          batch.set(fridgeRef, fridgeData);
          newFridgeItems.push({
            id: fridgeRef.id,
            ...fridgeData,
          } as FridgeItem);
        }
        // Delete from market list
        batch.delete(doc(db, "users", user.uid, "shoppingList", item.id));
      }

      await batch.commit();
      setFridge((prev) => [...prev, ...newFridgeItems]);
      setShoppingList([]);

      alert(
        "✅ ¡Compra finalizada!\n\nSe han movido los ingredientes a tu refrigerador. Por favor, confírmalos uno a uno para asegurar que tienes todo listo para cocinar.",
      );
      setActiveTab("refrigerador");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/fridge/clearAndMoveAll`,
      );
    }
    setIsSaving(false);
  };

  const deleteGroupFromShoppingList = async (groupName: string) => {
    console.log(
      `[DEBUG] deleteGroupFromShoppingList CALLED for group:`,
      groupName,
    );

    setIsSaving(true);
    try {
      const q = collection(db, "users", user.uid, "shoppingList");
      const querySnapshot = await getDocs(q);
      console.log(`[DEBUG] Fetched ${querySnapshot.size} documents.`);

      const batch = writeBatch(db);
      let deletedCount = 0;

      querySnapshot.forEach((docSnap) => {
        const item = docSnap.data() as ShoppingItem;
        const itemDishName = (item.dishName || "Básicos").trim();
        const targetGroupName = groupName.trim();

        if (itemDishName === targetGroupName) {
          batch.delete(docSnap.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        setShoppingList((prev) =>
          prev.filter((i) => (i.dishName || "Básicos") !== groupName),
        );
        alert(`✅ ${deletedCount} productos de "${groupName}" eliminados.`);
      } else {
        alert(
          `No se encontraron productos para eliminar en el grupo "${groupName}".`,
        );
      }
    } catch (err) {
      console.error("[ERROR] catch en deleteGroupFromShoppingList:", err);
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/shoppingList/deleteGroup`,
      );
    }
    setIsSaving(false);
  };

  const moveGroupToFridge = async (
    groupName: string,
    items: ShoppingItem[],
  ) => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const newFridgeItems: FridgeItem[] = [];

      for (const item of items) {
        // Only if not already in fridge
        const existsInFridge = fridge.some(
          (f) =>
            f.foodId === item.foodId &&
            (f as any).dishName === (item.dishName || "Básicos"),
        );

        if (!existsInFridge) {
          const fridgeRef = doc(collection(db, "users", user.uid, "fridge"));
          const fridgeData = {
            foodId: item.foodId,
            name: item.name,
            category: item.category,
            quantity: item.quantity || "",
            dishName: item.dishName || "Básicos",
            confirmed: false,
            addedAt: serverTimestamp(),
          };
          batch.set(fridgeRef, fridgeData);
          newFridgeItems.push({
            id: fridgeRef.id,
            ...fridgeData,
          } as FridgeItem);
        }
        batch.delete(doc(db, "users", user.uid, "shoppingList", item.id));
      }

      await batch.commit();
      setFridge((prev) => [...prev, ...newFridgeItems]);
      setShoppingList((prev) =>
        prev.filter((i) => !items.some((gi) => gi.id === i.id)),
      );

      alert(`✅ Productos de "${groupName}" movidos al refrigerador.`);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/fridge/moveGroup`,
      );
    }
    setIsSaving(false);
  };

  const moveTemplateToKitchen = async (dish: NutritionalDish) => {
    setIsSaving(true);
    try {
      // Buscar ingredientes en el refri (incluyendo básicos)
      const matchedFridgeItems: FridgeItem[] = [];
      for (const ing of dish.ingredients) {
        const ingName = typeof ing === "string" ? ing : ing.name;
        const fItem = fridge.find(
          (f) =>
            f.name.toLowerCase() === ingName.toLowerCase() &&
            (!f.dishName || f.dishName === "Básicos" || f.dishName === dish.name),
        );
        if (fItem) matchedFridgeItems.push(fItem);
      }

      // Mandar a cocina
      await sendDishToKitchen(dish.name, matchedFridgeItems, dish.instructions);
      alert(
        `👨‍🍳 ¡Platillo "${dish.name}" enviado a La Cocina para preparación!`,
      );
      setActiveTab("cocina");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/nutritionalDishes/moveToKitchen`,
      );
    }
    setIsSaving(false);
  };

  const consumeDishIngredientsFromFridge = async (dish: NutritionalDish) => {
    const toRemoveIndices: string[] = [];
    const removedNames: string[] = [];

    for (const ingredientObj of dish.ingredients) {
      const ingredientName =
        typeof ingredientObj === "string" ? ingredientObj : ingredientObj.name;
      const food = foods.find(
        (f) => f.name.toLowerCase() === ingredientName.toLowerCase(),
      );

      let fridgeItem = fridge.find(
        (item) =>
          (item.dishName === dish.name ||
            (item as any).dishName === dish.name) &&
          (food
            ? item.foodId === food.id
            : item.name.toLowerCase() === ingredientName.toLowerCase()),
      );

      // Fallback to Basics if not found in specific dish
      if (!fridgeItem) {
        fridgeItem = fridge.find(
          (item) =>
            (item.dishName || (item as any).dishName) === "Básicos" &&
            (food
              ? item.foodId === food.id
              : item.name.toLowerCase() === ingredientName.toLowerCase()),
        );
      }

      if (fridgeItem && !toRemoveIndices.includes(fridgeItem.id)) {
        toRemoveIndices.push(fridgeItem.id);
        removedNames.push(fridgeItem.name);
      }
    }

    if (toRemoveIndices.length === 0) {
      alert(
        `No se encontraron ingredientes de "${dish.name}" en tu refrigerador para consumir.`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      toRemoveIndices.forEach((id) => {
        batch.delete(doc(db, "users", user.uid, "fridge", id));
      });
      await batch.commit();
      setFridge((prev) =>
        prev.filter((item) => !toRemoveIndices.includes(item.id)),
      );
      alert(
        `¡Buen provecho! Se han consumido los ingredientes del refrigerador.`,
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/fridge/consumeBatch`,
      );
      alert("Hubo un error al consumir los ingredientes.");
    }
    setIsSaving(false);
  };

  const verifyAndAddDishIngredientsToShoppingList = async (
    dish: NutritionalDish,
  ) => {
    const missingItems: any[] = [];
    const inFridgeList: string[] = [];

    for (const ingredientObj of dish.ingredients) {
      const ingredientName =
        typeof ingredientObj === "string" ? ingredientObj : ingredientObj.name;
      const ingredientQuantity =
        typeof ingredientObj === "string" ? "" : ingredientObj.quantity;
      const food = foods.find(
        (f) => f.name.toLowerCase() === ingredientName.toLowerCase(),
      );

      let isMissing = false;
      let foodRef: any = null;

      const currentDishName = dish.name;

      if (food) {
        const inFridge = fridge.some(
          (item) =>
            item.foodId === food.id &&
            ((item.dishName || (item as any).dishName) === currentDishName ||
              (item.dishName || (item as any).dishName) === "Básicos"),
        );
        const alreadyInShopping = shoppingList.some(
          (item) =>
            item.foodId === food.id &&
            (item.dishName === currentDishName || item.dishName === "Básicos"),
        );

        if (inFridge) {
          inFridgeList.push(food.name);
        } else if (!alreadyInShopping) {
          isMissing = true;
          foodRef = food;
        }
      } else {
        isMissing = true;
        foodRef = {
          id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: ingredientName,
          category: dish.name,
          status: "libre",
        };
      }

      if (isMissing && foodRef) {
        missingItems.push({ ...foodRef, _recipeQty: ingredientQuantity });
      }
    }

    if (missingItems.length === 0) {
      alert(
        `¡Todo listo! Tienes todos los ingredientes para "${dish.name}" en tu refrigerador o lista de mercado.\n\nEn refrigerador: ${inFridgeList.length > 0 ? inFridgeList.join(", ") : "Ninguno"}`,
      );
      return;
    }

    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const newShoppingItems: ShoppingItem[] = [];
      const addedNames: string[] = [];

      missingItems.forEach((food) => {
        let quantity = food._recipeQty;
        if (!quantity) {
          quantity = "";
        }

        let finalName = getShoppingFinalName(food, quantity);

        const docRef = doc(collection(db, "users", user.uid, "shoppingList"));
        const newItem = {
          foodId: food.id,
          name: finalName,
          category: `📝 Platillo: ${dish.name}`,
          dishName: dish.name,
          status: food.status,
          bought: false,
          createdAt: serverTimestamp(),
        };
        batch.set(docRef, newItem);
        newShoppingItems.push({ id: docRef.id, ...newItem } as ShoppingItem);
        addedNames.push(finalName);
      });

      await batch.commit();
      setShoppingList((prev) => [...prev, ...newShoppingItems]);

      alert(
        `Alerta de Mercado:\n\nSe agregaron ingredientes para "${dish.name}":\n` +
          addedNames.map((name) => `• ${name}`).join("\n"),
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/shoppingList/batch`,
      );
      alert("Hubo un error al agregar los ingredientes al mercado.");
    }
    setIsSaving(false);
  };

  const resetKitchenSystem = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      // Clean Fridge
      fridge.forEach((item) => {
        batch.delete(doc(db, "users", user.uid, "fridge", item.id));
      });
      // Clean Dishes
      dishes.forEach((dish) => {
        batch.delete(doc(db, "users", user.uid, "nutritionalDishes", dish.id));
      });
      // Clean Shopping List
      shoppingList.forEach((item) => {
        batch.delete(doc(db, "users", user.uid, "shoppingList", item.id));
      });

      await batch.commit();
      setFridge([]);
      setDishes([]);
      setShoppingList([]);
      alert("✅ Sistema reiniciado. Todo ha sido borrado.");
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/resetSystem`,
      );
    }
    setIsSaving(false);
  };

  const handleAddFood = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const docRef = await addDoc(
        collection(db, "users", user.uid, "foodItems"),
        {
          userId: user.uid,
          ...foodForm,
        },
      );
      setFoodForm({
        name: "",
        category: FOOD_CATEGORIES[0],
        status: "permitido",
        notes: "",
        unit: "",
      });
      fetchData();
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/foodItems`,
      );
    }
    setIsSaving(false);
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    let newDish: any = null;
    try {
      const docRef = await addDoc(
        collection(db, "users", user.uid, "nutritionalDishes"),
        {
          userId: user.uid,
          ...dishForm,
          status: "template",
        },
      );
      newDish = {
        id: docRef.id,
        userId: user.uid,
        ...dishForm,
        status: "template",
      };
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/nutritionalDishes`,
      );
    }
    setDishForm({ name: "", ingredients: [], instructions: "" });
    if (newDish) {
      await verifyAndAddDishIngredientsToShoppingList(newDish);
    }
    await fetchData();
    setIsSaving(false);
  };

  const handleUpdatePlan = async () => {
    setIsSaving(true);
    try {
      const planData = {
        userId: user.uid,
        generalIndications: planForm.indications,
        forbiddenGeneral: planForm.forbidden
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        portions: plan?.portions || INITIAL_PORTIONS,
        glucoseGoals: {
          fasting: "80-130 mg/dL",
          postMeal: "<180 mg/dL",
        },
        updatedAt: serverTimestamp(),
      };

      const planId = plan?.id;
      if (planId) {
        await setDoc(
          doc(db, "users", user.uid, "nutritionalPlans", planId),
          planData,
        );
      } else {
        await addDoc(
          collection(db, "users", user.uid, "nutritionalPlans"),
          planData,
        );
      }
      fetchData();
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/nutritionalPlans`,
      );
    }
    setIsSaving(false);
  };

  const handleUpdateFoodStatus = async (
    foodId: string,
    newStatus: "permitido" | "moderado" | "prohibido",
  ) => {
    try {
      const foodRef = doc(db, "users", user.uid, "foodItems", foodId);
      await updateDoc(foodRef, { status: newStatus });
      setFoods(
        foods.map((f) => (f.id === foodId ? { ...f, status: newStatus } : f)),
      );
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.UPDATE,
        `users/${user.uid}/foodItems/${foodId}`,
      );
    }
  };

  const handleImportInitialFoods = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      INITIAL_FOODS.forEach((food) => {
        const docRef = doc(collection(db, "users", user.uid, "foodItems"));
        batch.set(docRef, {
          ...food,
          userId: user.uid,
          createdAt: serverTimestamp(),
        });
      });
      await batch.commit();
      fetchData();
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/foodItems/batch`,
      );
    }
    setIsSaving(false);
  };

  const deleteItem = async (col: string, id: string) => {
    try {
      await deleteDoc(doc(db, "users", user.uid, col, id));
      fetchData();
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `users/${user.uid}/${col}/${id}`,
      );
    }
  };

  const handleGenerateSuggestions = async () => {
    setIsGenerating(true);
    try {
      const allowed = foods
        .filter((f) => f.status === "permitido")
        .map(
          (f) =>
            `${f.name} (Recomendación de porción: ${f.notes || "al gusto"})`,
        );

      if (allowed.length === 0) {
        alert(
          "No tienes alimentos marcados como 'permitido'. Ve al catálogo para organizar tu despensa primero.",
        );
        setIsGenerating(false);
        return;
      }

      const forbidden = foods
        .filter((f) => f.status === "prohibido")
        .map((f) => f.name);

      const allForbidden = Array.from(
        new Set([...forbidden, ...(plan?.forbiddenGeneral || [])]),
      );

      const inFridge = fridge.map((f) => f.name);

      if (allowed.length === 0) {
        alert(
          "Primero debes importar o agregar alimentos a tu lista de 'Alimentos Permitidos' en la pestaña respectiva.",
        );
        setIsGenerating(false);
        return;
      }

      const suggestions = await getNutritionalSuggestions(
        allowed,
        allForbidden,
        plan?.portions || INITIAL_PORTIONS,
        selectedMealType,
        inFridge,
        "market_allowed",
        prepTime,
      );

      if (typeof suggestions === "string") {
        alert(suggestions);
        setIsGenerating(false);
        return;
      }

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setSuggestedDishes(suggestions);
      } else {
        alert(
          "Hubo un problema al generar los platillos con IA. Por favor, intenta de nuevo.",
        );
      }
    } catch (err) {
      console.error("Error generating suggestions:", err);
    }
    setIsGenerating(false);
  };

  const generateWeeklyGroceries = async () => {
    setIsGeneratingMarket(true);
    try {
      const allowed = foods
        .filter((f) => f.status === "permitido")
        .map((f) => f.name);

      const forbidden = foods
        .filter((f) => f.status === "prohibido")
        .map((f) => f.name);

      const allForbidden = Array.from(
        new Set([...forbidden, ...(plan?.forbiddenGeneral || [])]),
      );

      const inFridge = fridge.map((f) => f.name);

      if (allowed.length === 0) {
        alert(
          "Primero debes importar o agregar alimentos a tu lista de 'Alimentos Permitidos' en la pestaña respectiva.",
        );
        setIsGeneratingMarket(false);
        return;
      }

      const suggestions = await getWeeklyGrocerySuggestions(
        allowed,
        allForbidden,
        inFridge,
        plan?.portions || INITIAL_PORTIONS,
      );

      if (typeof suggestions === "string") {
        alert(suggestions);
        setIsGeneratingMarket(false);
        return;
      }

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const batch = writeBatch(db);
        const newShoppingItems: ShoppingItem[] = [];

        for (const item of suggestions) {
          const itemName = typeof item === "string" ? item : item.name;
          const itemQuantity =
            typeof item === "string"
              ? ""
              : item.quantity
                ? ` - ${item.quantity}`
                : "";
          if (inFridge.includes(itemName)) continue;

          let foodObj = foods.find(
            (f) => f.name.toLowerCase() === itemName.toLowerCase(),
          );
          let foodId = foodObj?.id;
          let category = foodObj?.category || "Otros";
          let status = foodObj?.status || "permitido";

          if (!foodId) {
            const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            foodId = customId;
          }

          const docRef = doc(collection(db, "users", user.uid, "shoppingList"));
          const newItem = {
            foodId: foodId,
            name: `${itemName}${itemQuantity}`,
            category: category,
            dishName: "Sugerencia Semanal",
            status: status,
            bought: false,
            createdAt: serverTimestamp(),
          };
          batch.set(docRef, newItem);
          newShoppingItems.push({ id: docRef.id, ...newItem } as ShoppingItem);
        }

        await batch.commit();
        setShoppingList((prev) => [...prev, ...newShoppingItems]);
        alert("¡Lista de mercado sugerida agregada con éxito!");
      } else {
        alert("No se obtuvieron sugerencias. Intenta nuevamente.");
      }
    } catch (err) {
      console.error(err);
      alert("Error al generar lista de mercado.");
    } finally {
      setIsGeneratingMarket(false);
    }
  };

  const generateDishFromFridgeIngredients = async () => {
    setIsGenerating(true);
    try {
      const allowed = foods
        .filter((f) => f.status === "permitido")
        .map(
          (f) =>
            `${f.name} (Recomendación de porción: ${f.notes || "al gusto"})`,
        );

      const forbidden = foods
        .filter((f) => f.status === "prohibido")
        .map((f) => f.name);

      const allForbidden = Array.from(
        new Set([...forbidden, ...(plan?.forbiddenGeneral || [])]),
      );

      const inFridge = fridge.map((f) => f.name);

      if (inFridge.length === 0) {
        alert(
          "Tu refrigerador está completamente vacío. No puedes crear platillos si no tienes alimentos.",
        );
        setIsGenerating(false);
        return;
      }

      const wantToBuy = window.confirm(
        "¿Deseas ir a comprar al mercado lo que te falte (se generarán platillos ideales) o prefieres preparar algo EXCLUSIVAMENTE con lo que hay en tu refrigerador?\n\n- ACEPTAR: Ir al mercado por lo que falta.\n- CANCELAR: Preparar solo con lo que hay.",
      );
      const strategy = wantToBuy ? "market_allowed" : "strict_fridge";

      const suggestions = await getNutritionalSuggestions(
        allowed,
        allForbidden,
        plan?.portions || INITIAL_PORTIONS,
        selectedMealType,
        inFridge,
        strategy,
        prepTime,
      );

      if (typeof suggestions === "string") {
        alert(suggestions);
        setIsGenerating(false);
        return;
      }

      if (Array.isArray(suggestions) && suggestions.length > 0) {
        // Si el usuario eligió "solo con lo que hay", el platillo debe ir directo a la cocina.
        // Si eligió "ir al mercado", se comporta como sugerencia normal (agrega a templates y lista de mercado).
        setSuggestedDishes(
          suggestions.map((s: any) => ({ ...s, isFromFridge: !wantToBuy })),
        );

        if (wantToBuy) {
          alert(
            "¡Platillos generados! Como decidiste ir al mercado por lo que falta, estos platillos se guardarán como templates y lo faltante se enviará a tu Lista del Mercado al añadirlos.",
          );
        } else {
          alert(
            "¡Platillos generados! Estas opciones usan solo lo que tienes, y se enviarán directamente a tu cocina.",
          );
        }
      } else {
        alert(
          "Hubo un error al generar las sugerencias. Por favor, asegúrate de tener suficientes alimentos permitidos y vuelve a intentar.",
        );
      }
    } catch (err) {
      console.error("Error generating suggestions from fridge:", err);
    }
    setIsGenerating(false);
  };

  const handleSaveSuggestedDish = async (
    dish: any,
    isFromFridge: boolean = false,
  ) => {
    setIsSaving(true);
    let newDish: any = null;
    try {
      if (isFromFridge) {
        // Enviar a la cocina exactamente el mismo proceso que cuando mandamos del refri
        const matchedFridgeItems: FridgeItem[] = [];
        const dishIngredients = dish.ingredients || [];

        for (const ing of dishIngredients) {
          const ingName = typeof ing === "string" ? ing : ing.name;
          const fItem = fridge.find(
            (f) =>
              f.name.toLowerCase() === ingName.toLowerCase() &&
              (!f.dishName || f.dishName === "Básicos"),
          );
          if (fItem) matchedFridgeItems.push(fItem);
        }

        if (matchedFridgeItems.length > 0) {
          // Si encontramos ingredientes en el refri, mandamos directo a cocina
          await sendDishToKitchen(
            dish.name,
            matchedFridgeItems,
            dish.instructions,
          );
          setSuggestedDishes((prev) =>
            prev.filter((d) => d.name !== dish.name),
          );
        } else {
          // Si no hay ingredientes que coincidan (raro si es isFromFridge), lo mandamos directo
          const batch = writeBatch(db);
          const dishRef = doc(
            collection(db, "users", user.uid, "nutritionalDishes"),
          );
          const dishData = {
            userId: user.uid,
            name: dish.name,
            ingredients: dishIngredients.map((i: any) => ({
              name: typeof i === "string" ? i : i.name,
              quantity: typeof i === "string" ? "" : i.quantity,
            })),
            instructions: dish.instructions || "",
            status: "preparando",
            createdAt: serverTimestamp(),
          };
          batch.set(dishRef, dishData);
          await batch.commit();
          setDishes((prev) => [
            ...prev,
            { id: dishRef.id, ...dishData } as NutritionalDish,
          ]);
          setSuggestedDishes((prev) =>
            prev.filter((d) => d.name !== dish.name),
          );
          setActiveTab("cocina");
        }
      } else {
        const docRef = await addDoc(
          collection(db, "users", user.uid, "nutritionalDishes"),
          {
            userId: user.uid,
            name: dish.name,
            ingredients: dish.ingredients,
            instructions: dish.instructions,
            status: "template",
          },
        );
        newDish = {
          id: docRef.id,
          userId: user.uid,
          name: dish.name,
          ingredients: dish.ingredients,
          instructions: dish.instructions,
          status: "template",
        };
        setSuggestedDishes((prev) => prev.filter((d) => d.name !== dish.name));
      }
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        `users/${user.uid}/nutritionalDishes`,
      );
    }
    if (newDish) {
      await verifyAndAddDishIngredientsToShoppingList(newDish);
    }
    await fetchData();
    setIsSaving(false);
  };

  // Placeholder stats
  const dailyWater = 0;
  const dailyCalories = 0;

  const TabButton = ({
    id,
    label,
    icon: Icon,
  }: {
    id: Tab;
    label: string;
    icon: any;
  }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 p-3 sm:px-6 sm:py-3 rounded-2xl text-[9px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-widest transition-all min-w-[80px] sm:min-w-0 transition-all active:scale-95",
        activeTab === id
          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105 sm:scale-100"
          : "text-text-muted hover:bg-surface hover:text-text-main",
      )}
    >
      <Icon className="w-4 h-4 shrink-0 transition-transform" />
      <span className="leading-none text-center">
        {label === "Refrigerador" ? "Refri" : label}
      </span>
    </button>
  );

  return (
    <div className="space-y-6 md:space-y-8 max-w-6xl mx-auto pb-24 px-2 sm:px-0">
      {/* Navigation Tabs */}
      <div className="w-full flex justify-center mb-10 mt-4">
        <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center justify-center gap-1 sm:gap-2 bg-surface p-1.5 sm:p-2 rounded-[2.5rem] border border-border shadow-lg max-w-full sm:w-fit">
          <TabButton id="mercado" label="Mercado" icon={ListChecks} />
          <TabButton id="cocina" label="Cocina" icon={Sparkles} />
          <TabButton id="refrigerador" label="Refri" icon={Package} />
          <TabButton id="alimentos" label="Alimentos" icon={Utensils} />
          <TabButton id="platillos" label="Platillos" icon={BookOpen} />
          <TabButton id="plan" label="Mi Plan" icon={ClipboardList} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "mercado" && (
          <motion.div
            key="mercado"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6 lg:gap-8"
          >
            {/* Catálogo de Alimentos (Izquierda) */}
            <div className="w-full lg:w-[350px] shrink-0 bg-surface p-5 sm:p-6 rounded-[32px] border border-border shadow-sm flex flex-col h-[600px] lg:h-[750px]">
              <div className="mb-6 space-y-4 text-center sm:text-left">
                <div>
                  <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-1">
                    Catálogo
                  </h3>
                  <p className="text-[10px] text-text-muted leading-tight">
                    Selecciona alimentos para tu lista
                  </p>
                </div>

                {/* Buscador */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Buscar alimento..."
                    value={marketSearch}
                    onChange={(e) => setMarketSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-2xl text-xs font-bold focus:border-primary/40 focus:ring-0 transition-all outline-none"
                  />
                </div>

                {/* Botón para Añadir Personalizado si no hay resultados */}
                {marketSearch &&
                  !foods.some((f) =>
                    f.name.toLowerCase().includes(marketSearch.toLowerCase()),
                  ) && (
                    <button
                      onClick={() => {
                        handleManualAddToMarket(marketSearch);
                        setMarketSearch("");
                      }}
                      className="w-full p-3 bg-primary/10 border border-primary/20 text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Añadir "{marketSearch}" como
                      nuevo
                    </button>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {FOOD_CATEGORIES.map((cat) => {
                  // Combinamos alimentos de la DB con los iniciales si no están en la DB
                  const dbGroup = foods.filter(
                    (f) => f.category === cat && f.status !== "prohibido",
                  );

                  // Filtrado por buscador
                  const filteredGroup = dbGroup.filter((f) =>
                    f.name.toLowerCase().includes(marketSearch.toLowerCase()),
                  );

                  if (filteredGroup.length === 0) return null;

                  return (
                    <div key={cat} className="space-y-2">
                      <h4 className="text-[9px] font-black text-text-muted/40 uppercase tracking-[0.2em]">
                        {cat}
                      </h4>
                      <div className="grid grid-cols-1 gap-1">
                        {filteredGroup.map((food) => {
                          const inFridge = fridge.some(
                            (f) => f.foodId === food.id,
                          );
                          const inShopping = shoppingList.some(
                            (s) => s.foodId === food.id,
                          );
                          return (
                            <div
                              key={food.id}
                              className={cn(
                                "w-full flex items-center justify-between p-3 bg-background border border-border rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all text-left group gap-2",
                                inFridge && "opacity-40",
                                inShopping && "border-primary/30 bg-primary/5",
                              )}
                            >
                              <div
                                className="flex flex-col flex-1 min-w-0"
                                onClick={() => addToShoppingList(food)}
                              >
                                <span
                                  className={cn(
                                    "text-xs font-bold text-text-main group-hover:text-primary transition-colors truncate",
                                    inShopping && "text-primary",
                                  )}
                                >
                                  {food.name}
                                </span>
                                {inFridge && (
                                  <span className="text-[8px] font-black text-emerald-500 uppercase">
                                    En casa 🏡
                                  </span>
                                )}
                              </div>

                              {!inShopping && (
                                <div className="flex flex-col gap-1 shrink-0">
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="number"
                                      placeholder="Ct."
                                      value={marketQuantities[food.id] || ""}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setMarketQuantities((prev) => ({
                                          ...prev,
                                          [food.id]: e.target.value,
                                        }));
                                      }}
                                      className="w-10 px-1 py-1 bg-white border border-border rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-primary outline-none"
                                    />
                                    <select
                                      value={marketUnits[food.id] || "kg"}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        setMarketUnits((prev) => ({
                                          ...prev,
                                          [food.id]: e.target.value,
                                        }));
                                      }}
                                      className="bg-white border border-border rounded-lg text-[9px] font-bold py-1 px-0.5 outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="kg">kg</option>
                                      <option value="L">L</option>
                                      <option value="g">g</option>
                                      <option value="ml">ml</option>
                                      <option value="pza">pza</option>
                                    </select>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToShoppingList(food);
                                      }}
                                      className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-all"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {inShopping && (
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lista de Compras (Post-its) - Derecha */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDropShopping}
              className="flex-1 bg-surface p-6 sm:p-10 rounded-[40px] border border-border shadow-sm flex flex-col min-h-[500px] lg:h-[750px] relative w-full overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 mb-8 text-center sm:text-left">
                <div className="flex flex-col items-center sm:items-start">
                  <h3 className="text-xl font-black text-text-main tracking-tight">
                    Lista del Mercado
                  </h3>
                  <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                    {shoppingList.length} productos en el carrito
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isOnline) {
                        alert("La IA requiere conexión a internet para sugerencia semanal. Reintenta cuando vuelvas a estar en línea.");
                        return;
                      }
                      generateWeeklyGroceries();
                    }}
                    disabled={isGeneratingMarket}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 justify-center"
                  >
                    {isGeneratingMarket ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Sugerencia Semanal IA
                  </button>
                  <button
                    onClick={clearBoughtItems}
                    className="px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center gap-2 justify-center"
                  >
                    <ShoppingBag className="w-4 h-4" /> Finalizar Compra
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <div className="columns-1 md:columns-2 gap-6">
                  {Object.entries(
                    shoppingList.reduce(
                      (acc, item) => {
                        const groupKey = item.dishName || "Básicos";
                        if (!acc[groupKey]) acc[groupKey] = [];
                        acc[groupKey].push(item);
                        return acc;
                      },
                      {} as Record<string, ShoppingItem[]>,
                    ),
                  ).length > 0 ? (
                    Object.entries(
                      shoppingList.reduce(
                        (acc, item) => {
                          const groupKey = item.dishName || "Básicos";
                          if (!acc[groupKey]) acc[groupKey] = [];
                          acc[groupKey].push(item);
                          return acc;
                        },
                        {} as Record<string, ShoppingItem[]>,
                      ),
                    ).map(([groupName, items], index) => {
                      const postItColors = [
                        "bg-[#fef3c7] border-[#fde68a] text-[#78350f]", // amber
                        "bg-[#dcfce7] border-[#bbf7d0] text-[#14532d]", // green
                        "bg-[#e0f2fe] border-[#bae6fd] text-[#0c4a6e]", // sky
                        "bg-[#fce7f3] border-[#fbcfe8] text-[#831843]", // pink
                        "bg-[#f3e8ff] border-[#e9d5ff] text-[#581c87]", // purple
                      ];
                      const colorClass =
                        postItColors[index % postItColors.length];
                      const rotations = [
                        "rotate-1",
                        "-rotate-1",
                        "rotate-2",
                        "-rotate-2",
                        "rotate-0",
                      ];
                      const rotation = rotations[index % rotations.length];

                      return (
                        <motion.div
                          key={groupName}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={cn(
                            "inline-block w-full mb-6 p-6 rounded-br-3xl shadow-[2px_10px_20px_rgba(0,0,0,0.06)] border-t border-l transition-all hover:translate-y-[-2px] hover:shadow-[2px_15px_30px_rgba(0,0,0,0.1)]",
                            colorClass,
                            rotation,
                          )}
                        >
                          <div className="flex justify-between items-center border-b border-black/10 pb-3 mb-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.1em]">
                              {groupName}
                            </h4>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  moveGroupToFridge(groupName, items)
                                }
                                className="p-2 bg-white/40 rounded-xl hover:bg-white hover:text-primary transition-all shadow-sm"
                                title="Mover todo al refrigerador"
                              >
                                <Package className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  deleteGroupFromShoppingList(groupName)
                                }
                                className="p-2 bg-white/40 rounded-xl hover:bg-white hover:text-rose-600 transition-all shadow-sm"
                                title="Eliminar grupo completo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                onClick={() =>
                                  toggleBought(item.id, item.bought)
                                }
                                className={cn(
                                  "flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer group/item",
                                  item.bought
                                    ? "bg-black/5 opacity-60"
                                    : "hover:bg-black/5",
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      "w-5 h-5 flex-shrink-0 rounded-lg border border-black/20 flex items-center justify-center transition-all bg-white/60",
                                      item.bought &&
                                        "bg-current border-current text-white",
                                    )}
                                  >
                                    {item.bought && (
                                      <CheckCircle2 className="w-4 h-4" />
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      "text-sm font-bold leading-tight",
                                      item.bought && "line-through opacity-80",
                                    )}
                                  >
                                    {item.name}{" "}
                                    {item.quantity && (
                                      <span className="text-primary font-black ml-1 text-xs">
                                        ({item.quantity})
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeFromShoppingList(item.id);
                                  }}
                                  className="p-1.5 opacity-40 hover:opacity-100 hover:text-red-600 transition-all sm:opacity-0 sm:group-hover/item:opacity-40 sm:hover:opacity-100"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="h-[400px] flex flex-col items-center justify-center opacity-30 text-center col-span-full">
                      <ShoppingBag className="w-20 h-20 mb-4 stroke-[1.5px]" />
                      <h4 className="text-sm font-black uppercase tracking-widest mb-1">
                        Lista vacía
                      </h4>
                      <p className="text-xs font-bold max-w-[200px]">
                        Selecciona alimentos del catálogo para planificar tu
                        compra.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "cocina" && (
          <motion.div
            key="cocina"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border pb-8 mb-8 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-[20px] flex items-center justify-center text-primary border border-primary/20">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-text-main tracking-tight">
                      La Cocina
                    </h3>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                      Preparación de platillos autorizados
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dishes
                  .filter((d) => d.status === "preparando")
                  .map((dish) => (
                    <div
                      key={dish.id}
                      className="bg-white p-6 rounded-[32px] border border-primary/20 shadow-md shadow-primary/5 flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-black text-text-main leading-tight">
                          {dish.name}
                        </h4>
                        <div className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> En Preparación
                        </div>
                      </div>
                      <div className="flex-1 space-y-6 mb-6">
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Ingredientes listos:
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {dish.ingredients.map((ing, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase border bg-green-50 border-green-100 text-green-700"
                              >
                                {typeof ing === "string" ? ing : ing.name}
                              </span>
                            ))}
                          </div>
                        </div>

                        {dish.instructions && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-primary" />{" "}
                              Pasos de preparación:
                            </p>
                            <div className="space-y-2.5">
                              {(dish.instructions.includes("1.")
                                ? dish.instructions.split(/(?=\d+\.)/)
                                : dish.instructions.split("\n")
                              )
                                .filter((s) => s.trim().length > 0)
                                .map((step, idx) => {
                                  const stepMatch =
                                    step.match(/(\d+)\.\s*(.*)/);
                                  const stepNumber = stepMatch
                                    ? stepMatch[1]
                                    : (idx + 1).toString();
                                  const stepText = stepMatch
                                    ? stepMatch[2]
                                    : step;

                                  // Extract time if present (e.g., (10 min de cocción))
                                  const timeMatch = stepText.match(
                                    /\(([^)]*(?:min|minutos|hr|hora|h|seg|segundos|cocción|preparación)[^)]*)\)/i,
                                  );
                                  const timeText = timeMatch
                                    ? timeMatch[1]
                                    : null;
                                  const cleanStepText = timeText
                                    ? stepText.replace(timeMatch[0], "").trim()
                                    : stepText;

                                  return (
                                    <div
                                      key={idx}
                                      className="flex gap-3 bg-surface/50 p-3 rounded-2xl border border-border/50 group"
                                    >
                                      <div className="flex-shrink-0 w-6 h-6 bg-primary/10 rounded-lg flex items-center justify-center text-[10px] font-black text-primary border border-primary/20">
                                        {stepNumber}
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-xs text-text-main font-medium leading-relaxed">
                                          {cleanStepText}
                                        </p>
                                        {timeText && (
                                          <div className="mt-1.5 flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded-lg w-fit border border-primary/10">
                                            <Clock className="w-2.5 h-2.5 text-primary" />
                                            <span className="text-[9px] font-black text-primary uppercase tracking-tighter">
                                              {timeText}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const relatedFridgeItems = fridge.filter((f) =>
                            dish.fridgeItemIds?.includes(f.id),
                          );
                          if (relatedFridgeItems.length > 0) {
                            setVerifyingKitchen({
                              dishName: dish.name,
                              items: relatedFridgeItems,
                              dishId: dish.id, // New field in state to identify the dish
                            } as any);
                          } else {
                            // Si no tiene ingredientes vinculados (raro), finalizamos normal
                            deleteItem("nutritionalDishes", dish.id);
                          }
                        }}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Finalizar
                        Preparación
                      </button>
                    </div>
                  ))}

                {dishes.filter((d) => d.status === "preparando").length ===
                  0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-center col-span-full">
                    <Sparkles className="w-16 h-16 text-text-muted opacity-20 mb-4" />
                    <h5 className="text-sm font-bold text-text-muted uppercase tracking-widest">
                      Cocina en espera
                    </h5>
                    <p className="text-xs text-text-muted mt-2 max-w-xs">
                      Palomea los ingredientes en tu Refrigerador para enviarlos
                      aquí.
                    </p>
                    <button
                      onClick={() => setActiveTab("refrigerador")}
                      className="mt-6 px-6 py-3 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
                    >
                      Ir al Refrigerador
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "refrigerador" && (
          <motion.div
            key="refrigerador"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-border pb-8 mb-8 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-[20px] flex items-center justify-center text-primary border border-primary/20">
                    <Package className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-text-main tracking-tight">
                      Mi Refrigerador
                    </h3>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                      {fridge.length} artículos disponibles
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("cocina")}
                  className="px-6 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-dark transition-all flex items-center gap-2"
                >
                  <Utensils className="w-4 h-4" /> Ver Cocina
                </button>
              </div>

              <div className="space-y-12">
                {fridge.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-border rounded-[40px]">
                    <Package className="w-16 h-16 text-text-muted opacity-20 mx-auto mb-4" />
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                      El refrigerador está vacío.
                    </p>
                    <button
                      onClick={() => setActiveTab("mercado")}
                      className="mt-4 px-6 py-3 bg-surface border border-border rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all"
                    >
                      Ir al Mercado
                    </button>
                  </div>
                ) : (
                  Object.entries(
                    fridge.reduce(
                      (acc, item) => {
                        const group = (item as any).dishName || "Básicos";
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(item);
                        return acc;
                      },
                      {} as Record<string, FridgeItem[]>,
                    ),
                  ).map(([dishName, items]) => {
                    const isDish = dishName !== "Básicos";
                    const allChecked = items.every((i) => i.confirmed);

                    return (
                      <div
                        key={dishName}
                        className="bg-white p-8 rounded-[32px] border border-border shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-4 mb-6 text-center sm:text-left">
                          <div className="flex flex-col items-center sm:items-start">
                            <h4 className="text-lg font-black text-text-main tracking-tight capitalize">
                              {dishName}
                            </h4>
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                              {items.length} Ingredientes
                            </p>
                          </div>
                          <div className="flex flex-wrap justify-center sm:justify-end gap-2 text-center">
                            <button
                              onClick={async () => {
                                try {
                                  setIsSaving(true);
                                  const batch = writeBatch(db);
                                  items.forEach((i) => {
                                    if (!i.confirmed) {
                                      batch.update(
                                        doc(
                                          db,
                                          "users",
                                          user.uid,
                                          "fridge",
                                          i.id,
                                        ),
                                        { confirmed: true },
                                      );
                                    }
                                  });
                                  await batch.commit();

                                  if (dishName !== "Básicos") {
                                    setVerifyingKitchen({ dishName, items });
                                  } else {
                                    const itemIds = new Set(
                                      items.map((i) => i.id),
                                    );
                                    setFridge((prev) =>
                                      prev.map((f) =>
                                        itemIds.has(f.id)
                                          ? { ...f, confirmed: true }
                                          : f,
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  handleFirestoreError(
                                    e,
                                    OperationType.UPDATE,
                                    `users/${user.uid}/fridge/confirmBatch`,
                                  );
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
                              disabled={allChecked || isSaving}
                              className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 disabled:opacity-30 flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-3 h-3" />{" "}
                              {dishName !== "Básicos"
                                ? "Confirmar y Enviar a Cocina"
                                : "Confirmar Todo"}
                            </button>
                            <button
                              onClick={async () => {
                                setIsSaving(true);
                                try {
                                  const batch = writeBatch(db);
                                  items.forEach((i) => {
                                    batch.delete(
                                      doc(
                                        db,
                                        "users",
                                        user.uid,
                                        "fridge",
                                        i.id,
                                      ),
                                    );
                                  });
                                  await batch.commit();
                                  setFridge((prev) =>
                                    prev.filter(
                                      (f) => !items.find((i) => i.id === f.id),
                                    ),
                                  );
                                } catch (e) {
                                  handleFirestoreError(
                                    e,
                                    OperationType.DELETE,
                                    `users/${user.uid}/fridge/clearGroup`,
                                  );
                                } finally {
                                  setIsSaving(false);
                                }
                              }}
                              className="p-2 text-text-muted hover:text-rose-500 transition-colors"
                              title="Cancelar / Eliminar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="relative group/fridge-item"
                            >
                              <button
                                onClick={() => toggleFridgeCheck(item)}
                                className={cn(
                                  "flex items-center gap-3 p-4 border rounded-2xl transition-all text-left w-full",
                                  item.confirmed
                                    ? "bg-primary/5 border-primary/20"
                                    : "bg-background border-border hover:border-primary/20",
                                )}
                              >
                                <div
                                  className={cn(
                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                    item.confirmed
                                      ? "bg-primary border-primary text-white"
                                      : "bg-white border-border text-transparent",
                                  )}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                </div>
                                <div className="flex flex-col pr-8">
                                  <span
                                    className={cn(
                                      "text-sm font-bold",
                                      item.confirmed
                                        ? "text-primary"
                                        : "text-text-main",
                                    )}
                                  >
                                    {item.name}{" "}
                                    {item.quantity && (
                                      <span className="text-primary font-black ml-1 text-[10px]">
                                        ({item.quantity})
                                      </span>
                                    )}
                                  </span>
                                  <span className="text-[9px] font-black text-text-muted uppercase tracking-tighter">
                                    {item.category}
                                  </span>
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeFromFridge(item.id);
                                }}
                                className="absolute top-1/2 -translate-y-1/2 right-3 p-2 text-text-muted opacity-40 hover:opacity-100 hover:text-rose-600 transition-all sm:opacity-0 sm:group-hover/fridge-item:opacity-100"
                                title="Eliminar de mi refrigerador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Modal de Verificación de Inventario antes de Cocina */}
        {verifyingKitchen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-surface w-full max-w-lg rounded-[40px] border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                    <Utensils className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-text-main tracking-tight">
                      Inventario de Cocina
                    </h3>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                      ¿Qué ingredientes se terminaron?
                    </p>
                  </div>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Confirma qué ingredientes vas a <b>agotar por completo</b> al
                  cocinar {verifyingKitchen.dishName}. Lo que <b>no</b>{" "}
                  selecciones se quedará en tu refrigerador.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {verifyingKitchen.items.map((item) => {
                  const isKeeping = itemsToKeepInFridge.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const newSet = new Set(itemsToKeepInFridge);
                        if (newSet.has(item.id)) {
                          newSet.delete(item.id);
                        } else {
                          newSet.add(item.id);
                        }
                        setItemsToKeepInFridge(newSet);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-3xl border transition-all text-left",
                        isKeeping
                          ? "bg-white border-border opacity-70"
                          : "bg-primary/5 border-primary shadow-sm",
                      )}
                    >
                      <div className="flex flex-col">
                        <span
                          className={cn(
                            "text-sm font-bold",
                            !isKeeping ? "text-primary" : "text-text-main",
                          )}
                        >
                          {item.name}
                        </span>
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">
                          {isKeeping
                            ? "Aún queda en el refri"
                            : "Se termina al cocinar"}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all",
                          !isKeeping
                            ? "bg-primary border-primary text-white"
                            : "border-border",
                        )}
                      >
                        {!isKeeping && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-8 border-t border-border grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setVerifyingKitchen(null);
                    setItemsToKeepInFridge(new Set());
                  }}
                  className="py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-text-muted hover:bg-surface transition-all border border-border"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      const batch = writeBatch(db);
                      const idsToRemove = verifyingKitchen.items
                        .map((i) => i.id)
                        .filter((id) => !itemsToKeepInFridge.has(id));

                      // Eliminar los ingredientes terminados
                      idsToRemove.forEach((id) => {
                        batch.delete(doc(db, "users", user.uid, "fridge", id));
                      });

                      // Si hay un dishId, significa que estamos finalizando en cocina
                      if (verifyingKitchen.dishId) {
                        batch.delete(
                          doc(
                            db,
                            "users",
                            user.uid,
                            "nutritionalDishes",
                            verifyingKitchen.dishId,
                          ),
                        );

                        await batch.commit();

                        setFridge((prev) =>
                          prev.filter((f) => !idsToRemove.includes(f.id)),
                        );
                        setDishes((prev) =>
                          prev.filter((d) => d.id !== verifyingKitchen.dishId),
                        );
                        alert(
                          "¡Buen provecho! El platillo ha sido finalizado y el inventario actualizado.",
                        );
                      } else {
                        // Flujo antiguo por si acaso
                        await batch.commit();
                        setFridge((prev) =>
                          prev.filter((f) => !idsToRemove.includes(f.id)),
                        );
                      }

                      setVerifyingKitchen(null);
                      setItemsToKeepInFridge(new Set());
                      setActiveTab("refrigerador");
                    } catch (e) {
                      handleFirestoreError(
                        e,
                        OperationType.WRITE,
                        "users/fridge/finalVerification",
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center justify-center gap-2"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirmar Consumo
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === "alimentos" && (
          <motion.div
            key="alimentos"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Selector de Categorías - Estilo Handbook */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 justify-center">
              {FOOD_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setFoodForm({ ...foodForm, category: cat });
                  }}
                  className={cn(
                    "p-3 rounded-2xl border text-[9px] font-bold uppercase tracking-tight transition-all flex flex-col items-center gap-2 text-center",
                    selectedCategory === cat
                      ? "bg-primary text-white border-primary shadow-lg shadow-primary/10"
                      : "bg-surface border-border text-text-muted hover:border-primary/30",
                  )}
                >
                  <span className="text-xl">
                    {cat === "Frutas"
                      ? "🍎"
                      : cat === "Cereales"
                        ? "🌾"
                        : cat === "Verduras"
                          ? "🥦"
                          : cat === "Leguminosas"
                            ? "🫘"
                            : cat === "Alimentos de origen animal"
                              ? "🍗"
                              : cat === "Grasas"
                                ? "🥑"
                                : cat === "Lácteos/bebida vegetal"
                                  ? "🥛"
                                  : "🥜"}
                  </span>
                  <span className="truncate w-full">{cat}</span>
                </button>
              ))}
            </div>

            <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm">
              {/* Filtros de Estado y Importación */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div className="flex bg-background p-1.5 rounded-2xl border border-border">
                  <button
                    onClick={() => setSelectedStatus("all")}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                      selectedStatus === "all"
                        ? "bg-text-main text-white"
                        : "text-text-muted hover:text-text-main",
                    )}
                  >
                    Todos
                  </button>
                  {["permitido", "moderado", "prohibido"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedStatus(s)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2",
                        selectedStatus === s
                          ? s === "permitido"
                            ? "bg-emerald-500 text-white"
                            : s === "moderado"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          : "text-text-muted hover:text-text-main",
                      )}
                    >
                      <div
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          s === "permitido"
                            ? "bg-emerald-500"
                            : s === "moderado"
                              ? "bg-amber-500"
                              : "bg-rose-500",
                          selectedStatus === s && "bg-white",
                        )}
                      />
                      {s}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {foods.length === 0 && (
                    <button
                      onClick={handleImportInitialFoods}
                      disabled={isSaving}
                      className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      Importar Guía Base
                    </button>
                  )}
                </div>
              </div>

              {/* Formulario Compacto */}
              <form
                onSubmit={handleAddFood}
                className="flex flex-col sm:flex-row gap-3 p-3 bg-background border border-border rounded-2xl mb-8"
              >
                <div className="w-full lg:flex-1 flex flex-col sm:flex-row items-center gap-3 px-3">
                  <div className="w-full flex items-center justify-center sm:justify-start gap-3">
                    <Search className="w-4 h-4 text-text-muted" />
                    <input
                      type="text"
                      placeholder={`Registrar nuevo en ${selectedCategory}...`}
                      value={foodForm.name}
                      onChange={(e) =>
                        setFoodForm({ ...foodForm, name: e.target.value })
                      }
                      className="w-full bg-transparent border-none text-sm font-bold focus:ring-0 p-0"
                    />
                  </div>
                  <div className="w-full sm:w-auto flex items-center gap-2 border-t sm:border-t-0 sm:border-l border-border pt-2 sm:pt-0 sm:pl-3">
                    <input
                      type="text"
                      placeholder="Ud. (ej. kg)"
                      value={foodForm.unit || ""}
                      onChange={(e) =>
                        setFoodForm({ ...foodForm, unit: e.target.value })
                      }
                      className="w-20 bg-transparent border-none text-xs text-text-muted font-bold focus:ring-0 p-0 sm:text-right"
                    />
                  </div>
                </div>
                <div className="flex gap-1 bg-surface p-1 rounded-xl shrink-0">
                  {["permitido", "moderado", "prohibido"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        setFoodForm({ ...foodForm, status: s as any })
                      }
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                        foodForm.status === s
                          ? s === "permitido"
                            ? "bg-emerald-500 text-white"
                            : s === "moderado"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          : "text-text-muted hover:text-text-main",
                      )}
                    >
                      {s === "permitido" ? "P" : s === "moderado" ? "M" : "X"}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={!foodForm.name || isSaving}
                  className="px-6 py-2 bg-primary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-primary-hover shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Guardar
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence mode="popLayout">
                  {foods
                    .filter(
                      (f) =>
                        f.category === selectedCategory &&
                        (selectedStatus === "all" ||
                          f.status === selectedStatus),
                    )
                    .map((food) => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={food.id}
                        className="group flex flex-col p-4 bg-background rounded-2xl border border-border hover:border-primary/20 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-text-main leading-tight mb-1">
                              {food.name}
                            </span>
                            <div className="flex flex-col gap-1 mt-1">
                              {food.notes && (
                                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                  {food.notes}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => deleteItem("foodItems", food.id)}
                            className="p-1.5 text-text-muted hover:text-rose-500 transition-all"
                            title="Eliminar alimento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border/50">
                          <span className="text-[9px] font-black uppercase tracking-[0.15em] text-text-muted opacity-40">
                            Cambiar estado
                          </span>
                          <div className="flex gap-1.5">
                            {(
                              ["permitido", "moderado", "prohibido"] as const
                            ).map((s) => (
                              <button
                                key={s}
                                onClick={() =>
                                  handleUpdateFoodStatus(food.id, s)
                                }
                                className={cn(
                                  "w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black transition-all",
                                  food.status === s
                                    ? s === "permitido"
                                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                      : s === "moderado"
                                        ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20"
                                        : "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                    : "bg-surface border border-border text-text-muted hover:border-primary/40",
                                )}
                              >
                                {s === "permitido"
                                  ? "P"
                                  : s === "moderado"
                                    ? "M"
                                    : "X"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                </AnimatePresence>
                {foods.filter(
                  (f) =>
                    f.category === selectedCategory &&
                    (selectedStatus === "all" || f.status === selectedStatus),
                ).length === 0 && (
                  <div className="col-span-full py-20 text-center">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                      <Search className="w-6 h-6 text-text-muted opacity-20" />
                    </div>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em] opacity-40">
                      Sin resultados en esta combinación
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "platillos" && (
          <motion.div
            key="platillos"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-surface p-6 rounded-3xl border border-border shadow-sm space-y-6 self-start">
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-black text-text-main tracking-tight">
                    Crear Platillo
                  </h3>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-1">
                    ¿Para qué momento?
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "desayuno", label: "Desayuno", icon: "🍳" },
                      {
                        id: "colación matutina",
                        label: "Col. Matutina",
                        icon: "🍎",
                      },
                      { id: "comida", label: "Comida", icon: "🍱" },
                      {
                        id: "colación vespertina",
                        label: "Col. Vespertina",
                        icon: "🥜",
                      },
                      { id: "cena", label: "Cena", icon: "🥣" },
                    ].map((meal) => (
                      <button
                        key={meal.id}
                        type="button"
                        onClick={() => setSelectedMealType(meal.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all border",
                          selectedMealType === meal.id
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                            : "bg-background text-indigo-600 border-indigo-100 hover:border-indigo-300",
                        )}
                      >
                        <span>{meal.icon}</span>
                        <span className="truncate">{meal.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-1">
                    Tiempo y Preparación
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {
                        id: "rápido",
                        label: "Express",
                        icon: Zap,
                        color: "text-amber-500",
                      },
                      {
                        id: "estándar",
                        label: "Estándar",
                        icon: Clock,
                        color: "text-indigo-500",
                      },
                      {
                        id: "elaborado",
                        label: "Lento",
                        icon: ChefHat,
                        color: "text-emerald-500",
                      },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setPrepTime(type.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2.5 rounded-2xl text-[8px] font-black uppercase tracking-tighter transition-all border",
                          prepTime === type.id
                            ? cn(
                                "border-transparent ring-2 ring-offset-1 shadow-lg",
                                type.id === "rápido"
                                  ? "bg-amber-500 text-white ring-amber-500"
                                  : type.id === "estándar"
                                    ? "bg-indigo-600 text-white ring-indigo-600"
                                    : "bg-emerald-600 text-white ring-emerald-600",
                              )
                            : "bg-background text-text-muted border-border hover:border-primary/40",
                        )}
                      >
                        <type.icon
                          className={cn(
                            "w-4 h-4 transition-transform",
                            prepTime === type.id
                              ? "text-white scale-110"
                              : type.color,
                          )}
                        />
                        <span>{type.label}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-text-muted font-bold italic leading-tight px-1">
                    {prepTime === "rápido" &&
                      "⚡️ Sin cocción, máximo 10 min. Ideal para prisas."}
                    {prepTime === "estándar" &&
                      "⏱️ Preparación normal y balanceada."}
                    {prepTime === "elaborado" &&
                      "👨‍🍳 Platillos más complejos y lentos."}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1 flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    Asistente IA
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isOnline) {
                          alert("La IA requiere conexión a internet. Reintenta cuando vuelvas a estar en línea.");
                          return;
                        }
                        generateDishFromFridgeIngredients();
                      }}
                      disabled={isGenerating}
                      className="w-full py-4 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generar con refri ({selectedMealType})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isOnline) {
                          alert("La IA requiere conexión a internet. Reintenta cuando vuelvas a estar en línea.");
                          return;
                        }
                        handleGenerateSuggestions();
                      }}
                      disabled={isGenerating}
                      className="w-full py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all disabled:opacity-30 flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest border border-indigo-100"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Brain className="w-4 h-4" />
                      )}
                      Sugerencia Abierta ({selectedMealType})
                    </button>
                  </div>
                  <p className="text-[10px] text-text-muted font-medium leading-tight px-1">
                    Genera platillos combinando tus alimentos con el refri o el
                    mercado según el momento seleccionado y tus porciones
                    ideales.
                  </p>
                </div>

                <div className="pt-6 border-t border-border space-y-4">
                  <h4 className="text-[10px] font-black text-text-muted uppercase tracking-widest pl-1">
                    Creación Manual
                  </h4>
                  <form onSubmit={handleAddDish} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Nombre del platillo"
                      value={dishForm.name}
                      onChange={(e) =>
                        setDishForm({ ...dishForm, name: e.target.value })
                      }
                      className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-bold"
                    />
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">
                        Ingredientes
                      </label>
                      <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-background border border-border rounded-xl">
                        {foods
                          .filter((f) => f.status !== "prohibido")
                          .map((f) => (
                            <label
                              key={f.id}
                              className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={dishForm.ingredients.some(
                                  (i) => i.name === f.name,
                                )}
                                onChange={(e) => {
                                  const ingredients = e.target.checked
                                    ? [
                                        ...dishForm.ingredients,
                                        { name: f.name, quantity: "" },
                                      ]
                                    : dishForm.ingredients.filter(
                                        (i) => i.name !== f.name,
                                      );
                                  setDishForm({ ...dishForm, ingredients });
                                }}
                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                              />
                              <span className="text-xs font-medium text-text-main">
                                {f.name}
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>
                    <textarea
                      placeholder="Instrucciones de preparación (opcional)"
                      value={dishForm.instructions}
                      onChange={(e) =>
                        setDishForm({
                          ...dishForm,
                          instructions: e.target.value,
                        })
                      }
                      className="w-full px-5 py-4 bg-background border border-border rounded-xl text-sm font-medium h-24 resize-none"
                    />
                    <button
                      type="submit"
                      disabled={
                        !dishForm.name || dishForm.ingredients.length === 0
                      }
                      className="w-full py-4 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                    >
                      Guardar Platillo
                    </button>
                  </form>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-8">
                {suggestedDishes.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] pl-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Sugerencias Personalizadas
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {suggestedDishes.map((s, i) => (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                          key={i}
                          className="relative group bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl space-y-4"
                        >
                          <button
                            onClick={() =>
                              setSuggestedDishes((prev) =>
                                prev.filter((_, idx) => idx !== i),
                              )
                            }
                            className="absolute top-3 right-3 p-1.5 text-indigo-300 hover:text-rose-500 transition-colors"
                            title="Descartar sugerencia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div>
                            <h5 className="text-sm font-black text-indigo-900 leading-tight mb-1 pr-6">
                              {s.name}
                            </h5>
                            <p className="text-[10px] text-indigo-700 font-medium italic">
                              "{s.rationale}"
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {s.ingredients.slice(0, 4).map((ing: any) => {
                              const name =
                                typeof ing === "string" ? ing : ing.name;
                              return (
                                <span
                                  key={name}
                                  className="px-2 py-0.5 bg-white border border-indigo-100 rounded-md text-[9px] font-bold text-indigo-600 uppercase"
                                >
                                  {name}
                                </span>
                              );
                            })}
                            {s.ingredients.length > 4 && (
                              <span className="text-[9px] font-bold text-indigo-400">
                                +{s.ingredients.length - 4} más
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() =>
                              handleSaveSuggestedDish(s, s.isFromFridge)
                            }
                            disabled={isSaving}
                            className={`w-full py-2 ${s.isFromFridge ? "bg-emerald-600 hover:bg-emerald-700" : "bg-indigo-600 hover:bg-indigo-700"} text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2`}
                          >
                            {isSaving ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : s.isFromFridge ? (
                              <Utensils className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3" />
                            )}
                            {s.isFromFridge
                              ? "Enviar a Cocina"
                              : "Añadir a Mis Platillos"}
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-xs font-black text-text-main uppercase tracking-[0.2em] pl-2">
                    Mis Platillos Guardados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {dishes.filter((d) => d.status !== "preparando").length ===
                    0 ? (
                      <div className="col-span-full py-20 bg-surface rounded-[40px] border border-dashed border-border flex flex-col items-center justify-center text-center px-10">
                        <Utensils className="w-12 h-12 text-text-muted opacity-20 mb-4" />
                        <p className="text-xs font-bold text-text-muted uppercase tracking-[0.2em]">
                          Aún no tienes platillos registrados
                        </p>
                      </div>
                    ) : (
                      dishes
                        .filter((d) => d.status !== "preparando")
                        .map((dish) => (
                          <div
                            key={dish.id}
                            className="group bg-surface p-6 rounded-[32px] border border-border shadow-sm hover:border-primary/30 transition-all flex flex-col"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <h4 className="text-base font-black text-text-main tracking-tight leading-tight">
                                {dish.name}
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => moveTemplateToKitchen(dish)}
                                  disabled={isSaving}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Enviar a cocina para preparar"
                                >
                                  <Zap className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    consumeDishIngredientsFromFridge(dish)
                                  }
                                  disabled={isSaving}
                                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Preparar y consumir del refri"
                                >
                                  <Utensils className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    verifyAndAddDishIngredientsToShoppingList(
                                      dish,
                                    )
                                  }
                                  disabled={isSaving}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"
                                  title="Verificar refri y agregar a mercado"
                                >
                                  <ListChecks className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    deleteItem("nutritionalDishes", dish.id)
                                  }
                                  className="p-2 text-text-muted hover:text-rose-500 transition-all"
                                  title="Eliminar platillo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-6">
                              {dish.ingredients.map((ing) => {
                                const name =
                                  typeof ing === "string" ? ing : ing.name;
                                const qty =
                                  typeof ing === "string"
                                    ? ""
                                    : ing.quantity
                                      ? " - " + ing.quantity
                                      : "";
                                return (
                                  <span
                                    key={name}
                                    className="px-2 py-1 bg-background border border-border rounded-lg text-[9px] font-bold text-text-muted uppercase"
                                  >
                                    {name}
                                    {qty}
                                  </span>
                                );
                              })}
                            </div>
                            {dish.instructions && (
                              <div className="mt-auto pt-4 border-t border-border">
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                                  Preparación
                                </p>
                                <p className="text-xs text-text-main leading-relaxed font-medium line-clamp-3">
                                  {dish.instructions}
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "plan" && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-4xl mx-auto w-full space-y-8"
          >
            <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border pb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-[20px] flex items-center justify-center text-primary border border-primary/20">
                    <ClipboardList className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-text-main tracking-tight">
                      Plan de Alimentación
                    </h3>
                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
                      Guía Médica ISSSTE • Nutrióloga
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-tighter">
                      Ayuno
                    </span>
                    <span className="text-sm font-black text-emerald-600">
                      80-130
                    </span>
                  </div>
                  <div className="bg-amber-50 px-5 py-3 rounded-2xl border border-amber-100 flex flex-col items-center">
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-tighter">
                      Post-comida
                    </span>
                    <span className="text-sm font-black text-amber-600">
                      &lt;180
                    </span>
                  </div>
                </div>
              </div>

              {/* Portion Table */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-sm font-black text-text-main uppercase tracking-[0.2em]">
                    Distribución de Porciones
                  </h4>
                  <span className="text-[10px] font-bold text-text-muted opacity-60">
                    Actualizado: 04/05/26
                  </span>
                </div>
                <div className="overflow-x-auto -mx-8 px-8">
                  <table className="w-full min-w-[600px] text-center border-collapse">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="py-4 px-4 text-left text-[10px] font-black text-text-muted uppercase tracking-widest">
                          Grupo
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-text-main uppercase bg-surface-alt rounded-t-xl">
                          Total
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-text-muted uppercase">
                          Desayuno
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-text-muted uppercase">
                          Colación 1
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-text-muted uppercase">
                          Comida
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-text-muted uppercase">
                          Colación 2
                        </th>
                        <th className="py-4 px-4 text-[10px] font-black text-text-muted uppercase">
                          Cena
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(plan?.portions || INITIAL_PORTIONS).map((p, i) => (
                        <tr
                          key={i}
                          className="border-b border-border/30 hover:bg-surface-alt/50 transition-colors"
                        >
                          <td className="py-5 px-4 text-left text-sm font-bold text-text-main flex items-center gap-2">
                            <span className="opacity-40">
                              {p.group === "Verduras"
                                ? "🥦"
                                : p.group === "Frutas"
                                  ? "🍎"
                                  : p.group === "Cereales"
                                    ? "🌾"
                                    : p.group === "A. Origen Animal"
                                      ? "🍗"
                                      : p.group === "Aceites"
                                        ? "🥑"
                                        : "🥜"}
                            </span>
                            {p.group}
                          </td>
                          <td className="py-5 px-4 text-sm font-black text-primary bg-surface-alt">
                            {p.total}
                          </td>
                          <td
                            className={cn(
                              "py-5 px-4 text-sm font-bold",
                              p.desayuno > 0
                                ? "text-text-main"
                                : "text-text-muted opacity-20",
                            )}
                          >
                            {p.desayuno || "-"}
                          </td>
                          <td
                            className={cn(
                              "py-5 px-4 text-sm font-bold",
                              p.colacion1 > 0
                                ? "text-text-main"
                                : "text-text-muted opacity-20",
                            )}
                          >
                            {p.colacion1 || "-"}
                          </td>
                          <td
                            className={cn(
                              "py-5 px-4 text-sm font-bold",
                              p.comida > 0
                                ? "text-text-main"
                                : "text-text-muted opacity-20",
                            )}
                          >
                            {p.comida || "-"}
                          </td>
                          <td
                            className={cn(
                              "py-5 px-4 text-sm font-bold",
                              p.colacion2 > 0
                                ? "text-text-main"
                                : "text-text-muted opacity-20",
                            )}
                          >
                            {p.colacion2 || "-"}
                          </td>
                          <td
                            className={cn(
                              "py-5 px-4 text-sm font-bold",
                              p.cena > 0
                                ? "text-text-main"
                                : "text-text-muted opacity-20",
                            )}
                          >
                            {p.cena || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
                {/* Recommendations */}
                <div className="space-y-6">
                  <h4 className="text-sm font-black text-text-main uppercase tracking-[0.2em] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Recomendaciones
                  </h4>
                  <div className="space-y-3">
                    {[
                      "Consumir alimentos con bajo índice glucémico.",
                      "Evitar el consumo de bebidas azucaradas y consumir abundante agua natural.",
                      "Realizar actividad física frecuentemente.",
                      "Evitar ayuno prolongado, establecer horarios de comida.",
                      "No olvides tomar tus medicamentos indicados por tu médico.",
                    ].map((rec, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-xs font-medium text-text-main leading-relaxed">
                          {rec}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hypoglycemia Box */}
                <div className="bg-rose-50/50 border border-rose-100 p-6 rounded-3xl space-y-4">
                  <h4 className="text-xs font-black text-rose-900 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                    Regla de los 15 (Hipoglucemia)
                  </h4>
                  <p className="text-[10px] font-bold text-rose-700 leading-relaxed uppercase opacity-70">
                    SÍNTOMAS: Temblores, sudoración, hambre, mareo, confusión,
                    palidez, desmayos.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-2xl border border-rose-100 flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-black text-rose-500">
                        PASO 1
                      </span>
                      <p className="text-[10px] font-bold text-text-main leading-tight">
                        Consumir 15g de carbohidratos simples.
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-rose-100 flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-black text-rose-500">
                        PASO 2
                      </span>
                      <p className="text-[10px] font-bold text-text-main leading-tight">
                        Esperar 15 min y medir glucosa.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-black text-text-main uppercase tracking-[0.2em] pl-1">
                  Notas Adicionales
                </h4>
                <textarea
                  value={planForm.indications}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, indications: e.target.value })
                  }
                  placeholder="Añade notas complementarias de tu nutrióloga aquí..."
                  className="w-full px-6 py-5 bg-background border border-border rounded-2xl text-sm font-medium h-32 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all"
                />
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleUpdatePlan}
                  disabled={isSaving}
                  className="w-full md:w-auto px-12 py-4 bg-primary text-white rounded-2xl font-extrabold text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-3"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}{" "}
                  Guardar Mi Plan Maestro
                </button>
              </div>
            </div>

            <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                <Brain className="w-6 h-6" />
              </div>
              <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                Este plan está diseñado para optimizar tu salud metabólica y
                claridad cognitiva. Los alimentos de{" "}
                <span className="font-extrabold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Bajo IG
                </span>{" "}
                son tu mejor aliado para evitar picos de insulina.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
