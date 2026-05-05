import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getNeuropsychologistInterpretation(logs: any[]) {
  if (!process.env.GEMINI_API_KEY) return "Configuración de IA necesaria.";
  
  const prompt = `Actúa como un experto neuropsicólogo especializado en regulación emocional. Basado en estos registros emocionales del usuario: ${JSON.stringify(logs)}, proporciona un análisis breve, clínico, empático y constructivo. Incluye: (1) Interpretación de tendencias, (2) Sugerencias prácticas (trabajo cognitivo/conductual), (3) Una pregunta reflexiva. Usa un tono profesional pero cercano, evitando tecnicismos excesivos.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text || "No se pudo generar la interpretación.";
}

export async function getAIDiaryDraft(logs: any[]) {
  if (!process.env.GEMINI_API_KEY) return "No se pudo generar el borrador.";
  
  const prompt = `Actúa como un diario introspectivo inteligente. Basado en los registros emocionales recientes del usuario: ${JSON.stringify(logs)}, escribe un primer borrador de una entrada de diario en primera persona. El tono debe ser reflexivo, honesto y terapéutico. Ayuda al usuario a poner en palabras lo que pudo haber sentido, dejando espacio para que él lo complete o corrija. No uses títulos ni formatos de carta, solo el cuerpo del texto del diario. Máximo 150 palabras.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  return response.text || "Error al redactar el borrador.";
}

export async function getNutritionalSuggestions(allowedFoods: string[], portionPlan: any, mealType: string, fridgeItems: string[]) {
  if (!process.env.GEMINI_API_KEY) return "Configuración de IA necesaria.";

  const prompt = `Actúa como un experto neuropsicólogo con especialidad en nutrición metabólica para perfiles TDAH/Autismo y Diabetes.
  
  CONTEXTO DEL USUARIO:
  - Alimentos SIEMPRE permitidos: ${allowedFoods.join(', ')}
  - Alimentos ACTUALMENTE en su REFRIGERADOR (usar estos prioritariamente): ${fridgeItems.join(', ') || 'El refrigerador está vacío'}
  - Patrón de porciones diarias: ${JSON.stringify(portionPlan)}
  
  OBJETIVO: El usuario quiere preparar específicamente un(a): ${mealType.toUpperCase()}.
  
  TAREA: Sugiere 3 platillos creativos para ${mealType.toUpperCase()}.
  - PRIORIDAD 1: Intenta crear platillos que usen mayoritariamente lo que ya hay en el REFRIGERADOR.
  - PRIORIDAD 2: Si no hay suficientes ingredientes en el refrigerador, sugiere platillos que usen la lista de "Alimentos SIEMPRE permitidos" aunque deba comprarlos.
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
  
  CRÍTICO: En el arreglo "ingredients", en "name" DEBES usar los NOMBRES EXACTOS Y LITERALES de la lista de permitidos. En "quantity", DEBES proponer la cantidad consultando el plan y la recomendación (ej: "1/2 taza", "2 piezas"). Nunca omitas "quantity".
  
  Responde SOLO con el JSON, sin texto adicional.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  try {
    const text = response.text || "[]";
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Error parsing AI response:", e);
    return [];
  }
}
