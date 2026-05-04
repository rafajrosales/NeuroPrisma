import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getNeuropsychologistInterpretation(logs: any[]) {
  if (!process.env.GEMINI_API_KEY) return "Configuración de IA necesaria.";
  
  const prompt = `Actúa como un experto neuropsicólogo especializado en regulación emocional. Basado en estos registros emocionales del usuario: ${JSON.stringify(logs)}, proporciona un análisis breve, clínico, empático y constructivo. Incluye: (1) Interpretación de tendencias, (2) Sugerencias prácticas (trabajo cognitivo/conductual), (3) Una pregunta reflexiva. Usa un tono profesional pero cercano, evitando tecnicismos excesivos.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "No se pudo generar la interpretación.";
}

export async function getAIDiaryDraft(logs: any[]) {
  if (!process.env.GEMINI_API_KEY) return "No se pudo generar el borrador.";
  
  const prompt = `Actúa como un diario introspectivo inteligente. Basado en los registros emocionales recientes del usuario: ${JSON.stringify(logs)}, escribe un primer borrador de una entrada de diario en primera persona. El tono debe ser reflexivo, honesto y terapéutico. Ayuda al usuario a poner en palabras lo que pudo haber sentido, dejando espacio para que él lo complete o corrija. No uses títulos ni formatos de carta, solo el cuerpo del texto del diario. Máximo 150 palabras.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text || "Error al redactar el borrador.";
}
