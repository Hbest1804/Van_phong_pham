import 'dotenv/config';
import { env } from '../config/env.js';

async function main() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error('Lỗi khi gọi API:', await res.text());
      return;
    }
    const json = await res.json();
    console.log('--- DANH SÁCH MODEL KHẢ DỤNG ---');
    json.models.forEach(m => {
      console.log(`- ID: ${m.name} | Methods: ${m.supportedGenerationMethods.join(', ')}`);
    });
  } catch (err) {
    console.error('Lỗi kết nối:', err);
  }
}

main();
