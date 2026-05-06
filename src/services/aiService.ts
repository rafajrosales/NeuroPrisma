import { GoogleGenAI } from "@google/genai";

function getApiKey() {
  // Vite reemplazará estas variables en tiempo de compilación si están en 'define' o '.env'
  const key = (import.meta as any).env.VITE_GEMINI_API_KEY || 
              (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '') || 
              '';
  return key;
}

export async function getNeuropsychologistInterpretation(logs: any[]) {
  const currentKey = getApiKey();
  if (!currentKey) {
    return "Error C-001: No hay API Key configurada. Si estás en AI Studio, ve a 'Settings' (arriba a la derecha), busca 'Secrets' y añade una con nombre GEMINI_API_KEY. Si estás en Vercel, asegúrate de que sea VITE_GEMINI_API_KEY o actívala en 'Environment Variables'.";
  }
  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `Actúa como un experto neuropsicólogo especializado en regulación emocional. Basado en estos registros emocionales del usuario: ${JSON.stringify(logs)}, proporciona un análisis breve, clínico, empático y constructivo. Incluye: (1) Interpretación de tendencias, (2) Sugerencias prácticas (trabajo cognitivo/conductual), (3) Una pregunta reflexiva. Usa un tono profesional pero cercano, evitando tecnicismos excesivos.`;

  try {
    console.log("Calling Gemini API for interpretation...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "No se pudo generar la interpretación.";
  } catch (err) {
    console.error("Error calling Gemini API:", err);
    return `Error de conexión con la IA (C-002): ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function getAIDiaryDraft(logs: any[]) {
  const currentKey = getApiKey();
  if (!currentKey) {
    return "Error C-001: No hay API Key configurada. Si estás en AI Studio, ve a 'Settings' (arriba a la derecha), busca 'Secrets' y añade una con nombre GEMINI_API_KEY.";
  }
  
  const ai = new GoogleGenAI({ apiKey: currentKey });
  const prompt = `Actúa como un diario introspectivo inteligente. Basado en los registros emocionales recientes del usuario: ${JSON.stringify(logs)}, escribe un primer borrador de una entrada de diario en primera persona. El tono debe ser reflexivo, honesto y terapéutico. Ayuda al usuario a poner en palabras lo que pudo haber sentido, dejando espacio para que él lo complete o corrija. No uses títulos ni formatos de carta, solo el cuerpo del texto del diario. Máximo 150 palabras.`;

  try {
    console.log("Calling Gemini API for diary draft...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text || "Error al redactar el borrador.";
  } catch (err) {
    console.error("Error calling Gemini API:", err);
    return `Error de conexión con la IA (C-002): ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function getNutritionalSuggestions(
  allowedFoods: string[], 
  forbiddenFoods: string[], 
  portionPlan: any, 
  mealType: string, 
  fridgeItems: string[], 
  strategy: 'strict_fridge' | 'market_allowed' = 'market_allowed',
  prepTime: 'rápido' | 'estándar' | 'elaborado' = 'estándar'
) {
  const currentKey = getApiKey();
  if (!currentKey) {
    return "Error C-001: No hay API Key configurada. Si estás en AI Studio, ve a 'Settings' (arriba a la derecha), busca 'Secrets' and añade una con nombre GEMINI_API_KEY.";
  }

  const ai = new GoogleGenAI({ apiKey: currentKey });
  
  let timeInstructions = "";
  if (prepTime === 'rápido') {
    timeInstructions = `
  - TIEMPO: EL USUARIO TIENE PRISA. Sugiere platillos EXTREMADAMENTE RÁPIDOS (máximo 5-10 min).
  - CRÍTICO: NO deben requerir cocción (no usar estufa/horno si es posible, preferir preparaciones frías, ensaladas, wraps, batidos o cosas que solo requieran ensamblar).
  - "No cocer cosas" es la prioridad.`;
  } else if (prepTime === 'elaborado') {
    timeInstructions = `
  - TIEMPO: EL USUARIO TIENE TIEMPO. Sugiere platillos más elaborados y nutritivos que puedan requerir cocción lenta, horneado o técnicas más complejas.
  - Se permite y fomenta el uso de técnicas que tomen más de 20-30 min si eso mejora el sabor y valor nutricional.`;
  }

  let strictInstructions = "";
  if (strategy === 'strict_fridge') {
    strictInstructions = `
  - ESTRICTO: DEBES sugerir platillos usando ÚNICA Y EXCLUSIVAMENTE los ingredientes en el REFRIGERADOR.
  - NO agregues absolutamente NINGÚN ingrediente que no esté en la lista del refrigerador (ni básicos, ni condimentos extra si no están listados).
  - Si los ingredientes son insuficientes para un platillo clásico, sugiere la mejor combinación posible con lo que hay.
  - BAJO NINGUNA CIRCUNSTANCIA uses alimentos de la lista de ALIMENTOS PROHIBIDOS.`;
  } else {
    strictInstructions = `
  - PRIORIDAD 1: Intenta crear platillos que usen mayoritariamente lo que ya hay en el REFRIGERADOR.
  - PRIORIDAD 2: Si no hay suficientes ingredientes en el refrigerador, sugiere platillos que usen la lista de "Alimentos SIEMPRE permitidos" aunque deba comprarlos.
  - BAJO NINGUNA CIRCUNSTANCIA uses alimentos de la lista de ALIMENTOS PROHIBIDOS.`;
  }

  const prompt = `Actúa como un experto neuropsicólogo con especialidad en nutrición metabólica para perfiles TDAH/Autismo y Diabetes.
  
  CONTEXTO DEL USUARIO:
  - Alimentos SIEMPRE permitidos: ${allowedFoods.join(', ')}
  - Alimentos ESTRICTAMENTE PROHIBIDOS: ${forbiddenFoods.join(', ') || 'Ninguno especificado'}
  - Alimentos ACTUALMENTE en su REFRIGERADOR (usar estos prioritariamente): ${fridgeItems.join(', ') || 'El refrigerador está vacío'}
  - Patrón de porciones diarias (Mapeo de comidas: 'colacion1' = colación matutina, 'colacion2' = colación vespertina): ${JSON.stringify(portionPlan)}
  
  OBJETIVO: El usuario quiere preparar específicamente un(a): ${mealType.toUpperCase()}.
  
  TAREA: Sugiere 3 platillos creativos para ${mealType.toUpperCase()}.
  ${strictInstructions}
  ${timeInstructions}
  - CRÍTICO: DEBES RESPETAR AL 100% el plan de alimentación y las porciones (número de porciones de cada grupo) exactas correspondientes al momento (${mealType.toUpperCase()}) especificadas en el Patrón de porciones diarias proporcionado. NO INVENTES porciones ni uses grupos de alimentos que no correspondan a este momento o cuya cantidad recomendada sea 0.
  - Asegura Bajo Índice Glucémico y equilibrio nutricional.
  
  Formato de respuesta (JSON estrictamente):
  [
    {
      "name": "Nombre creativo del plato",
      "ingredients": [ { "name": "Nombre Exacto 1", "quantity": "cantidad en tazas/piezas/cucharadas" } ], 
      "instructions": "Instrucciones detalladas de preparación. DEBES ENUMERAR cada paso (1., 2., 3...) e incluir el TIEMPO ESTIMADO de cocción o preparación para cada uno de forma muy visible entre paréntesis, por ejemplo: '(15 min de cocción)' o '(5 min de preparación)'. Especifica las cantidades exactas a usar basándote en las porciones recomendadas.",
      "rationale": "Breve explicación de por qué es bueno para el cerebro/glucosa"
    }
  ]
  
  CRÍTICO: En el arreglo "ingredients", en "name" DEBES usar los NOMBRES EXACTOS Y LITERALES de la lista de permitidos. En "quantity", DEBES proponer la cantidad EXACTA Y ESTRICTA basándote matemáticamente en la recomendación de cantidad por porción multiplicada por la cantidad de porciones asignadas a ese grupo nutricional en el plan de alimentación para este momento (${mealType.toUpperCase()}). NUNCA excedas ni disminuyas lo que marca el plan de porciones. Nunca omitas "quantity".
  
  Responde SOLO con el JSON, sin texto adicional.`;

  try {
    console.log("Calling Gemini API for nutritional suggestions...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text || "[]";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error with Gemini AI or parsing response (nutritional):", e);
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function getWeeklyGrocerySuggestions(allowedFoods: string[], forbiddenFoods: string[], fridgeItems: string[], portionPlan: any) {
  const currentKey = getApiKey();
  if (!currentKey) {
    return "Error C-001: No hay API Key configurada. Si estás en AI Studio, ve a 'Settings' (arriba a la derecha), busca 'Secrets' y añade una con nombre GEMINI_API_KEY.";
  }

  const ai = new GoogleGenAI({ apiKey: currentKey });
  let prompt = `Actúa como un experto neuropsicólogo con especialidad en nutrición metabólica para perfiles TDAH/Autismo y Diabetes.
  
  CONTEXTO DEL USUARIO:
  - Alimentos SIEMPRE permitidos: ${allowedFoods.join(', ')}
  - Alimentos ESTRICTAMENTE PROHIBIDOS: ${forbiddenFoods.join(', ') || 'Ninguno especificado'}
  - Alimentos ACTUALMENTE en su REFRIGERADOR: ${fridgeItems.join(', ') || 'El refrigerador está vacío'}
  - Patrón de porciones diarias (número de porciones de cada grupo alimenticio recomendadas por comida): ${JSON.stringify(portionPlan)}
  
  OBJETIVO: El usuario necesita una lista básica sugerida de mercado para la semana para cubrir SU PLAN DE ALIMENTACIÓN.
  
  TAREA: Analiza lo que hay en el refrigerador, si está vacío o incompleto, genera una lista de los ingredientes de la lista de ALIMENTOS PERMITIDOS faltantes para poder preparar comidas de desayuno, comida y cena para toda una semana respetando estrictamente el patrón de porciones diarias.
  - El cálculo matemático de las cantidades DEBE SER RIGUROSAMENTE PARA 1 SOLA PERSONA durante 7 días.
  - Da PREFERENCIA ESTRICTA a frutas y verduras FRESCAS y DE TEMPORADA.
  - BAJO NINGUNA CIRCUNSTANCIA uses alimentos de la lista de ALIMENTOS PROHIBIDOS.
  - Genera SÓLO ingredientes individuales y especifica la CAPACIDAD O CANTIDAD TOTAL que se necesitará para una semana (ej: "1 kg", "2 litros", "30 piezas").
  - Ignora los ingredientes que el usuario ya tiene en el refrigerador a menos que creas que requieren re-stock.
  
  Formato de respuesta (JSON estrictamente, arreglo de objetos):
  [{"name": "Manzana", "quantity": "1.5 kg"}, {"name": "Pechuga de pollo", "quantity": "2 kg"}, {"name": "Leche de almendras", "quantity": "3 litros"}]
  
  Responde SOLO con el JSON, sin texto adicional ni backticks de markdown.`;

  try {
    console.log("Calling Gemini API for weekly groceries...");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const text = response.text || "[]";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanText);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error with Gemini AI or parsing response (groceries):", e);
    return `Error: ${e instanceof Error ? e.message : String(e)}`;
  }
}
