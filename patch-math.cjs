const fs = require('fs');
let fileContent = fs.readFileSync('src/components/NutritionModule.tsx', 'utf8');

const oldFunc = `    // Try to parse the number they inputted
    const numMatch = input.match(/^^([\\d\\.]+)/);
    let userQty = numMatch ? parseFloat(numMatch[1]) : 0;`;

const newFunc = `    // Try to parse the number they inputted
    const numMatch = input.match(/^([\\d\\.\\s\\/]+)/);
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
    }`;

fileContent = fileContent.replace(oldFunc, newFunc);
fs.writeFileSync('src/components/NutritionModule.tsx', fileContent);
