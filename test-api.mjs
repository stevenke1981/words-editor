/**
 * Quick API connectivity test for Qwen Token Plan.
 * Usage: node test-api.mjs
 * It reads the key from localStorage backup or prompts via env var.
 */

const API_URL = 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/chat/completions';

// Try to read key from env or hardcoded test
const key = process.env.QWEN_API_KEY || '';

if (!key) {
  console.log('請設定環境變數 QWEN_API_KEY 後再執行：');
  console.log('  set QWEN_API_KEY=sk-xxx && node test-api.mjs');
  process.exit(1);
}

console.log('Testing endpoint:', API_URL);
console.log('Key prefix:', key.slice(0, 8) + '...');
console.log('Model: qwen3-max-preview');
console.log('---');

try {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: 'qwen3-max-preview',
      messages: [{ role: 'user', content: 'Say hello in one word.' }],
      max_tokens: 20,
    }),
  });

  const text = await resp.text();
  console.log(`HTTP Status: ${resp.status}`);
  console.log(`Response: ${text.slice(0, 800)}`);

  if (resp.ok) {
    const data = JSON.parse(text);
    if (data.choices?.[0]?.message?.content) {
      console.log('\n✅ SUCCESS! Model replied:', data.choices[0].message.content);
    } else {
      console.log('\n⚠️ Response OK but unexpected format');
    }
  } else {
    console.log('\n❌ API returned error');
  }
} catch (e) {
  console.log('❌ FETCH ERROR:', e.message);
  console.log('This might be a network/DNS/TLS issue.');
}
