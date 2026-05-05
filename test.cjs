const parseConversionInfo = (notes) => {
    if (!notes) return null;
    const match = notes.match(/(?:Porción:\s*)?([\d\s\/]+)(?:de\s+)?(taza|cucharada|cucharadita|pieza|lata)(?:s)?\s*(?:\(~([\d\.]+)(g|ml)[^\)]*\))?/i);
    // console.log("MATCH", notes, match);
    if (!match) return null;
    
    let qtyStr = match[1].trim();
    let qty = 0;
    if (qtyStr.includes(' ')) {
        const [whole, frac] = qtyStr.split(' ');
        const [n, d] = frac.split('/');
        qty = parseInt(whole) + parseInt(n)/parseInt(d);
    } else if (qtyStr.includes('/')) {
        const [n, d] = qtyStr.split('/');
        qty = parseInt(n)/parseInt(d);
    } else {
        qty = parseFloat(qtyStr);
    }
    
    let unit = match[2].toLowerCase();
    let g_ml = match[3] ? parseFloat(match[3]) : 0;
    let g_ml_unit = match[4] || '';
    return { qty, unit, g_ml, g_ml_unit };
  };

  const getShoppingFinalName = (food, quantityInput) => {
    if (!quantityInput || !quantityInput.trim()) return food.name;
    const input = quantityInput.trim();
    const baseName = food.name.trim();
    
    const conv = parseConversionInfo(food.notes || '');
    if (!conv) {
      return `${input} de ${baseName}`;
    }

    // Try to parse the number they inputted
    const numMatch = input.match(/^([\d\.\s\/]+)/);
    let userQty = 0;
    if (numMatch) {
        let qStr = numMatch[1].trim();
        if (qStr.includes(' ')) {
            const [whole, frac] = qStr.split(' ');
            if (frac.includes('/')) {
              const [n, d] = frac.split('/');
              userQty = parseInt(whole) + parseInt(n)/parseInt(d);
            } else {
              userQty = parseFloat(whole); // Fallback
            }
        } else if (qStr.includes('/')) {
            const [n, d] = qStr.split('/');
            userQty = parseInt(n)/parseInt(d);
        } else {
            userQty = parseFloat(qStr);
        }
    }

    // Check if the user mentioned a unit
    let userUnit = '';
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('taza')) userUnit = 'taza';
    else if (lowerInput.includes('cucharada')) userUnit = 'cucharada';
    else if (lowerInput.includes('cucharadita')) userUnit = 'cucharadita';
    else if (lowerInput.includes('pieza')) userUnit = 'pieza';
    else if (lowerInput.includes('lata')) userUnit = 'lata';

    // If they just typed numbers, assume they meant portions based on their food unit
    if (userQty > 0) {
      // If user typed '2 tazas' and the food uses 'taza', we convert!
      if (userUnit && userUnit === conv.unit && conv.g_ml > 0) {
         let totalGml = (userQty / conv.qty) * conv.g_ml;
         return `${input} (~${Math.round(totalGml)}${conv.g_ml_unit}) de ${baseName}`;
      }
      
      // If no unit typed but we can infer they meant the recipe unit
      if (!userUnit && conv.unit) {
         let unitStr = userQty === 1 ? conv.unit : conv.unit + 's';
         if (conv.g_ml > 0) {
            let totalGml = (userQty / conv.qty) * conv.g_ml;
            return `${userQty} ${unitStr} (~${Math.round(totalGml)}${conv.g_ml_unit}) de ${baseName}`;
         }
         return `${userQty} ${unitStr} de ${baseName}`;
      }
    }

    return `${input} de ${baseName}`;
  };

console.log(getShoppingFinalName({ name: 'Arroz integral', notes: 'Porción: 1/3 de taza (~65g)' }, '1/2 taza'));
