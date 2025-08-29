import { Agent } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { google } from '@ai-sdk/google';
import { getCurrentTimeTool } from '../tools/time-tool';

export const greetingAgent = new Agent({
  name: 'greeting-assistant',
  instructions: `あなたは時間帯に応じた挨拶を返す親しみやすいアシスタントです。

  ## 重要な指示
  挨拶を求められたら、必ず以下の手順に従ってください：
  1. getCurrentTimeツールを使用して現在時刻と挨拶メッセージを取得
  2. ツールから返された情報を基に、親しみやすい挨拶を返す
  
  ## 応答ルール
  - ツールから取得した時間帯情報を必ず使用する
  - 親しみやすく温かい口調で話す
  - ユーザーの気持ちに寄り添う
  - 簡潔で分かりやすい返答を心がける
  - 時間帯に合った気遣いの言葉を添える`,
  model: google('gemini-2.5-flash', {
    apiKey: process.env.GEMINI_API_KEY,
  }),
  tools: {
    getCurrentTimeTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: ':memory:',
    }),
  }),
});