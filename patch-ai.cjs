const fs = require('fs');

let fileContent = fs.readFileSync('src/services/aiService.ts', 'utf8');
fileContent = fileContent.replace(
  '"ingredients": ["Nombre Exacto 1", "Nombre Exacto 2"]',
  '"ingredients": [ { "name": "Nombre Exacto 1", "quantity": "cantidad en tazas/piezas/cucharadas" } ]'
);
fileContent = fileContent.replace(
  'CRÍTICO: En el arreglo "ingredients", DEBES usar los NOMBRES EXACTOS Y LITERALES de los alimentos proporcionados, IGNORANDO el texto en paréntesis "(Recomendación de porción: ...". Por ejemplo, si ves "Arroz integral (Recomendación...)", el ingrediente debe ser estrictamente "Arroz integral".',
  'CRÍTICO: En el arreglo "ingredients", en "name" DEBES usar los NOMBRES EXACTOS Y LITERALES, ignorando notas en paréntesis. En "quantity", DEBES proponer la cantidad consultando el plan y la recomendación (ej: "1/2 taza", "2 piezas"). Nunca omitas "quantity".'
);

fs.writeFileSync('src/services/aiService.ts', fileContent);
