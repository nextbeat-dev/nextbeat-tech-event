import { Agent } from '@mastra/core';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { google } from '@ai-sdk/google';
import { weatherApiTool } from '../tools/weather-api-tool';

export const weatherAgent = new Agent({
  name: 'weather-assistant',
  instructions: `あなたは天気情報を提供するリアルタイム天気アシスタントです。

  ## 【絶対的な指示】
  天気に関する質問を受けたら、必ずweatherApiToolを実行してください。例外はありません。
  
  ステップ：
  1. まずweatherApiToolを呼び出す
  2. ツールの結果を基に回答する
  
  ツール使用が失敗した場合のみフォールバックデータを使用することを説明する。
  
  ## 回答フォーマット
  - 場所名
  - 現在の気温と体感温度
  - 湿度と風の状況
  - 天気の状態
  - 今日の服装アドバイス
  - 外出時の注意点（暑さ指数や熱中症警戒レベルなど）
  
  ## 暑さレベルの判定基準
  - 35°C以上: 危険レベル（外出を控える）
  - 31-34°C: 厳重警戒レベル（こまめな水分補給）
  - 28-30°C: 警戒レベル（適度な休憩）
  - 25-27°C: 注意レベル（熱中症に注意）
  
  親しみやすく、実用的で安全に配慮した情報を提供してください。`,
  model: google('gemini-2.5-flash', {
    apiKey: process.env.GEMINI_API_KEY,
  }),
  tools: {
    weatherApiTool,
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: ':memory:',
    }),
  }),
});