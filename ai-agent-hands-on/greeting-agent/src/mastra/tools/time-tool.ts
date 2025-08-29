import { z } from 'zod';
import { createTool } from '@mastra/core';

export const getCurrentTimeTool = createTool({
  id: 'getCurrentTime',
  name: '現在時刻取得ツール',
  description: '現在の日本時間を取得して、時間帯に応じた挨拶メッセージを生成します',
  inputSchema: z.object({}),
  outputSchema: z.object({
    currentTime: z.string(),
    hour: z.number(),
    timeOfDay: z.string(),
    greetingMessage: z.string(),
  }),
  execute: async () => {
    const now = new Date();
    const japanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
    const hour = japanTime.getHours();
    const minute = japanTime.getMinutes();
    const timeString = `${hour}:${String(minute).padStart(2, '0')}`;
    
    let timeOfDay: string;
    let greetingMessage: string;
    
    if (hour >= 5 && hour < 11) {
      timeOfDay = '朝';
      greetingMessage = 'おはようございます！今日も素敵な一日になりますように。朝の爽やかな時間帯ですね。';
    } else if (hour >= 11 && hour < 17) {
      timeOfDay = '昼';
      greetingMessage = 'こんにちは！お昼の時間帯ですね。調子はいかがですか？';
    } else if (hour >= 17 && hour < 21) {
      timeOfDay = '夕方';
      greetingMessage = 'こんばんは！夕方の時間帯ですね。今日も一日お疲れ様でした。';
    } else {
      timeOfDay = '夜';
      greetingMessage = 'こんばんは！夜遅い時間ですね。ゆっくりお休みくださいね。';
    }
    
    return {
      currentTime: timeString,
      hour: hour,
      timeOfDay: timeOfDay,
      greetingMessage: greetingMessage,
    };
  },
});