
import 'dotenv/config';

import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

import { docsAgent } from './agents/docs-agent';
import { docsSearchTool } from './tools/docs-search-tool';

export const mastra = new Mastra({
  agents: { docsAgent },
  tools: { docsSearchTool },
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
