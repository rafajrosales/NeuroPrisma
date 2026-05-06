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
      model: "gemini-3.1-flash-lite-preview",
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
      model: "gemini-3.1-flash-lite-preview",
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
  - TIEMPO: EL USUARIO TIENE MUCHA PRISA (MODO EXPRESS).
  - REGLA DE ORO: 0 MINUTOS DE COCCIÓN. NO USAR ESTUFA, HORNO NI HERVIR AGUA.
  - INGREDIENTES: ASUME QUE TODOS LOS INGREDIENTES ESTÁN CRUDOS/NATURALES. No asumas que hay arroz cocido, papas cocidas o legumbres preparadas.
  - PROHIBIDO: No sugieras arroz, pasta, legumbres secas, papas o carnes que requieran más de 5 min de cocción.
  - PERMITIDO: Ensaladas crudas, wraps (usando tortillas frías o lechuga), batidos, yogur con semillas/fruta, tostadas de arroz/maíz con ingredientes listos (atún en lata, queso, aguacate, jamón), verduras crudas.
  - El platillo debe poder "ensamblarse" y comerse en máximo 5 minutos.`;
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

  const prompt = `Actúa como un Nutricionista Jefe experto en Salud Metabólica y Neurodiversidad (TDAH/Autismo/Diabetes).
  
  CONTEXTO:
  - Permitidos: ${allowedFoods.join(', ')}
  - Prohibidos: ${forbiddenFoods.join(', ') || 'Ninguno'}
  - En Refrigerador: ${fridgeItems.join(', ') || 'Vacío'}
  - Plan de Porciones: ${JSON.stringify(portionPlan)}
  
  META: Sugerir 3 platillos para ${mealType.toUpperCase()}.
  
  INSTRUCCIONES:
  ${strictInstructions}
  ${timeInstructions}
  - Respeta estrictamente las porciones para ${mealType.toUpperCase()} del plan.
  - Prioriza bajo índice glucémico.
  
  FORMATO JSON:
  [
    {
      "name": "Nombre del plato",
      "ingredients": [ { "name": "Ingrediente exacto", "quantity": "cantidad calculada" } ], 
      "instructions": "Pasos enumerados (1., 2...) con tiempo estimado por paso entre paréntesis.",
      "rationale": "Beneficio metabólico/cognitivo"
    }
  ]
  
  Calcula las cantidades basándote exactamente en el plan de porciones. Responde solo con el JSON.`;

  try {
    console.log("Calling Gemini 3.1 Pro for nutritional suggestions...");
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
  let prompt = `Actúa como un Nutricionista Jefe experto en Salud Metabólica.
  
  CONTEXTO:
  - Alimentos Permitidos: ${allowedFoods.join(', ')}
  - Alimentos Prohibidos: ${forbiddenFoods.join(', ') || 'Ninguno'}
  - En Refrigerador: ${fridgeItems.join(', ') || 'Vacío'}
  - Plan de Porciones: ${JSON.stringify(portionPlan)}
  
  META: Lista de mercado para 1 persona (7 días).
  
  INSTRUCCIONES:
  - Sugiere qué comprar para cubrir el Plan de Porciones semanal considerando lo que falta en el refrigerador.
  - Solo usa alimentos de la lista de Permitidos.
  - Prefiere productos frescos.
  
  FORMATO JSON (Arreglo de objetos):
  [{"name": "Producto", "quantity": "cantidad total (ej: 1 kg, 3 piezas)"}]
  
  Responde solo con el JSON.`;

  try {
    console.log("Calling Gemini 3.1 Pro for weekly groceries...");
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
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
