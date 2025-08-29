
import 'dotenv/config';

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

import { greetingAgent } from './agents/greeting-agent';
import { getCurrentTimeTool } from './tools/time-tool';

export const mastra = new Mastra({
  agents: { greetingAgent },
  tools: { getCurrentTimeTool },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
