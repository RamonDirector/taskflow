const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyDYUsFWiy8OiedmwejVqZFqmD-0YdWihe0';

const categories = [
  { name: 'social', description: 'two people, friends, social group' },
  { name: 'learning', description: 'open book, education, studying' },
  { name: 'errands', description: 'checklist, tasks, to-do list with checkmarks' }
];

const basePrompt = (category) => 
  `Generate an image: Flat design minimalist icon, ${category}, soft rounded style, pastel green (#86efac) on white background, simple geometric shapes, modern app icon aesthetic, no text, centered, 512x512`;

async function generateIcon(category) {
  console.log(`Generating icon for: ${category.name}...`);
  
  const prompt = basePrompt(category.description);
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          responseModalities: ['image']
        }
      })
    }
  );

  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`API error: ${text}`);
  }

  const data = JSON.parse(text);
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData);
  
  if (!imagePart) {
    throw new Error('No image in response');
  }

  const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
  const outputPath = path.join(__dirname, '..', 'public', 'icons', `${category.name}.png`);
  
  fs.writeFileSync(outputPath, imageBuffer);
  console.log(`✓ Saved: ${outputPath}`);
  
  return outputPath;
}

async function main() {
  console.log('Generating remaining icons...\n');
  
  for (const category of categories) {
    try {
      await generateIcon(category);
      await new Promise(r => setTimeout(r, 3000));
    } catch (err) {
      console.error(`✗ Failed ${category.name}:`, err.message);
    }
  }
  
  console.log('\nDone!');
}

main();
