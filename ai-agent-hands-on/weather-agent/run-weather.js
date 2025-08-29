#!/usr/bin/env node

import 'dotenv/config';
import fetch from 'node-fetch';
import readline from 'readline';

// 色付き出力用
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// サーバーURL
const API_URL = 'http://localhost:4115/api/agents/weatherAgent/generate';

// コンソール入力設定
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${colors.cyan}天気> ${colors.reset}`,
});

// ウェルカムメッセージ
console.log(`${colors.bright}${colors.blue}
╔════════════════════════════════════════╗
║     🌤️  天気情報エージェント 🌤️      ║
╚════════════════════════════════════════╝${colors.reset}

${colors.yellow}使い方:${colors.reset}
- 都市名を入力して天気を確認（例: "東京の天気は？"）
- 対応都市: 世界中の都市（リアルタイム天気データ取得）
- 終了: "exit" または Ctrl+C

${colors.green}注意: Mastraサーバーが起動している必要があります${colors.reset}
${colors.cyan}別ターミナルで: npm run dev${colors.reset}
`);

// エージェントへの問い合わせ
async function askWeatherAgent(message) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.text) {
      console.log(`\n${colors.bright}${colors.green}天気情報:${colors.reset}`);
      console.log(data.text);
    } else if (data.error) {
      console.error(`${colors.bright}${colors.red}エラー:${colors.reset}`, data.error);
    } else {
      console.log('予期しないレスポンス:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error(`\n${colors.bright}${colors.yellow}⚠️  Mastraサーバーが起動していません${colors.reset}`);
      console.error(`${colors.cyan}別ターミナルで以下を実行してください:${colors.reset}`);
      console.error(`${colors.green}npm run dev${colors.reset}\n`);
    } else {
      console.error(`${colors.bright}${colors.red}エラーが発生しました:${colors.reset}`, error.message);
    }
  }
}

// メインループ
rl.prompt();

rl.on('line', async (line) => {
  const input = line.trim();
  
  if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
    console.log(`\n${colors.bright}${colors.blue}またね！良い一日を！ ☀️${colors.reset}`);
    process.exit(0);
  }
  
  if (input) {
    await askWeatherAgent(input);
  }
  
  rl.prompt();
});

rl.on('close', () => {
  console.log(`\n${colors.bright}${colors.blue}またね！良い一日を！ ☀️${colors.reset}`);
  process.exit(0);
});

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error(`${colors.bright}${colors.red}予期しないエラー:${colors.reset}`, error);
  process.exit(1);
});
