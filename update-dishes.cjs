const fs = require('fs');

let fileContent = fs.readFileSync('src/components/NutritionModule.tsx', 'utf8');

// Replace NutritionalDish interface
fileContent = fileContent.replace('ingredients: string[];', 'ingredients: { name: string; quantity: string }[];');

// Replace dishForm state
fileContent = fileContent.replace(
  "const [dishForm, setDishForm] = useState({ name: '', ingredients: [] as string[], instructions: '' });",
  "const [dishForm, setDishForm] = useState({ name: '', ingredients: [] as { name: string; quantity: string }[], instructions: '' });"
);

fs.writeFileSync('src/components/NutritionModule.tsx', fileContent);
