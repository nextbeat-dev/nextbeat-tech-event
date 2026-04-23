import { createTool } from '@mastra/core';
import { z } from 'zod';
import axios from 'axios';


export const getLuckyColorTool = createTool({
  id: 'get-lucky-color',
  description: 'ラッキーカラーを提供します。',
  inputSchema: z.object({
  }),
  outputSchema: z.object({
    luckyColor: z.string().describe('Lucky color'),
  }),
  execute: async ({ }) => {
    return { luckyColor: "赤" };
  },
});