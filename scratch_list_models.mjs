import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: 'AIzaSyC9HwgATOWN_uInZPLzuoFzQEwNy5vXQlg' });

async function run() {
  try {
    const response = await ai.models.list();
    const models = response.items || response; // Sometimes response is an iterator or has items
    const names = [];
    for await (const m of models) {
      names.push(m.name);
    }
    console.log(names.filter(n => n.includes('flash') || n.includes('pro')));
  } catch (e) {
    console.error(e);
  }
}
run();
