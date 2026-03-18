import fs from 'fs';
import path from 'path';

const dir = path.resolve('src', 'features', 'auth', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const importStr = `import salonImg from "../../../assets/images/salon.jpg"`;
const imgCode = `
          <img 
            src={salonImg} 
            alt="salon" 
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0" 
            style={{ zIndex: 0 }}
          />`;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip if it doesn't have a right side column pattern at all
  if (!content.includes('col-lg-7')) {
    continue;
  }

  // 1. Add import if completely missing and not commented
  if (!content.includes('import salonImg')) {
    // Insert after the first import or at the top
    const lines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx !== -1) {
      lines.splice(lastImportIdx + 1, 0, importStr);
    } else {
      lines.unshift(importStr);
    }
    content = lines.join('\n');
  } else {
    // Uncomment import if commented
    content = content.replace(/\/\/\s*import\s+salonImg/g, 'import salonImg');
  }

  // 2. Replace commented out img tags or empty divs with our absolute positioned img.
  const colLg7Regex = /<div[^>]*className="[^"]*col-lg-7[^"]*"[^>]*>/g;
  let newContent = content;
  
  // Replace the commented out image block with our new image tag
  if (newContent.includes('/* <img')) {
    newContent = newContent.replace(/\{\s*\/\*\s*<img[\s\S]*?\/>\s*\*\/\s*\}/g, imgCode);
    newContent = newContent.replace(/\{\s*\/\*\s*<img[\s\S]*?alt="Account Setup"[\s\S]*?\/>\s*\*\/\s*\}/g, imgCode);
  }

  // For pages like BusinessNamePage that just have an empty div ending with /> :
  // <div className="col-lg-7 d-none d-lg-block position-relative p-0" style={{ minHeight: "100vh" }} />
  const emptyDivRegex = /(<div[^>]*className="[^"]*col-lg-7[^"]*"[^>]*minHeight:\s*"100vh"[^>]*)\/>/g;
  newContent = newContent.replace(emptyDivRegex, `$1>${imgCode}\n        </div>`);

  // For pages that might have <div className="col-lg-7 ..."></div> (empty)
  const emptyOpenCloseRegex = /(<div[^>]*className="[^"]*col-lg-7[^"]*"[^>]*)>\s*<\/div>/g;
  newContent = newContent.replace(emptyOpenCloseRegex, `$1>${imgCode}\n        </div>`);

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`Updated ${file}`);
  }
}
