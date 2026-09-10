import fs from 'fs';
import fetch from 'node-fetch';

const env = fs.readFileSync('.env', 'utf8');
const matchId = env.match(/VITE_CF_CLIENT_ID=(.*)/);
const matchSecret = env.match(/VITE_CF_CLIENT_SECRET=(.*)/);

const clientId = matchId ? matchId[1].trim() : '';
const clientSecret = matchSecret ? matchSecret[1].trim() : '';

async function test() {
  console.log("Testando API...");
  try {
    const response = await fetch("https://api.incubebots.com/api/generate", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': clientId,
        'CF-Access-Client-Secret': clientSecret
      },
      body: JSON.stringify({
        model: "qwen3.8:latest",
        prompt: "Olá, me responda em uma palavra",
        stream: true
      })
    });

    console.log("Status:", response.status);
    
    if (response.body) {
      for await (const chunk of response.body) {
        console.log("Chunk:", chunk.toString());
      }
    }
  } catch(e) {
    console.error("Erro:", e);
  }
}

test();
