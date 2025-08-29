import { createTool } from '@mastra/core';
import { MCPClient } from '@mastra/mcp';
import { z } from 'zod';

// MCPクライアントをシングルトンとして初期化
let mcpClient: MCPClient | null = null;

async function getMCPClient(): Promise<MCPClient> {
  if (!mcpClient) {
    mcpClient = new MCPClient({
      servers: {
        mastra: {
          command: 'npx',
          args: ['-y', '@mastra/mcp-docs-server'],
        },
      },
    });
    
    // MCPサーバーに接続
    await mcpClient.connect();
  }
  
  return mcpClient;
}

export const docsSearchTool = createTool({
  id: 'search-mastra-docs',
  description: 'Search Mastra documentation, code examples, and technical content using MCP docs server',
  inputSchema: z.object({
    query: z.string().describe('Search query or question about Mastra framework'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      title: z.string(),
      content: z.string(),
      url: z.string().optional(),
      type: z.enum(['documentation', 'example', 'blog', 'changelog']),
      relevance: z.number().min(0).max(1),
    })),
    summary: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { query } = context;
    
    console.log('=== docsSearchTool実行開始 ===');
    console.log('検索クエリ:', query);
    
    try {
      const client = await getMCPClient();
      
      // MCPサーバーから利用可能なツールを取得
      const tools = await client.getTools();
      console.log('利用可能なMCPツール:', Object.keys(tools));
      
      // 検索実行（実際のツール名は動的に取得）
      const searchToolName = Object.keys(tools).find(name => 
        name.includes('search') || name.includes('query')
      );
      
      if (!searchToolName) {
        throw new Error('検索ツールが見つかりません');
      }
      
      console.log('使用するツール:', searchToolName);
      
      // MCP経由で検索実行
      const searchResult = await client.callTool(searchToolName, { 
        query: query,
        limit: 5 
      });
      
      console.log('MCP検索結果:', searchResult);
      
      // 結果を整形
      const results = Array.isArray(searchResult?.results) ? searchResult.results.map((item: any, index: number) => ({
        title: item.title || `検索結果 ${index + 1}`,
        content: item.content || item.text || item.description || '',
        url: item.url || item.link,
        type: determineContentType(item),
        relevance: item.score || item.relevance || 0.8,
      })) : [];
      
      const response = {
        results,
        summary: generateSummary(query, results),
        success: true,
      };
      
      console.log('=== docsSearchTool成功 ===');
      console.log('検索結果件数:', results.length);
      
      return response;
      
    } catch (error) {
      console.error('MCP検索エラー:', error);
      
      // フォールバック: デモデータを返す
      const fallbackResults = getFallbackSearchResults(query);
      
      const response = {
        results: fallbackResults,
        summary: `${query}に関する情報をデモデータから取得しました。`,
        success: false,
        error: `MCP Server Error: ${error.message}`,
      };
      
      console.log('=== docsSearchTool失敗、フォールバックデータ返却 ===');
      return response;
    }
  },
});

// コンテンツタイプを判定
function determineContentType(item: any): 'documentation' | 'example' | 'blog' | 'changelog' {
  const title = (item.title || '').toLowerCase();
  const content = (item.content || item.text || '').toLowerCase();
  
  if (title.includes('example') || content.includes('example') || title.includes('tutorial')) {
    return 'example';
  }
  if (title.includes('blog') || title.includes('post')) {
    return 'blog';
  }
  if (title.includes('changelog') || title.includes('release') || title.includes('version')) {
    return 'changelog';
  }
  return 'documentation';
}

// サマリー生成
function generateSummary(query: string, results: any[]): string {
  if (results.length === 0) {
    return `「${query}」に関する情報が見つかりませんでした。`;
  }
  
  const types = [...new Set(results.map(r => r.type))];
  const typeText = types.map(type => {
    switch (type) {
      case 'documentation': return 'ドキュメント';
      case 'example': return 'コード例';
      case 'blog': return 'ブログ記事';
      case 'changelog': return 'チェンジログ';
      default: return type;
    }
  }).join('、');
  
  return `「${query}」に関する${results.length}件の情報を見つけました（${typeText}を含む）。`;
}

// フォールバックデータ（MCP接続失敗時）
function getFallbackSearchResults(query: string) {
  const queryLower = query.toLowerCase();
  
  // よくある質問のパターンマッチング
  if (queryLower.includes('agent') || queryLower.includes('エージェント')) {
    return [{
      title: 'Mastra Agents 入門',
      content: 'MastraのAgentクラスを使用してAIエージェントを作成できます。\n\n```typescript\nimport { Agent } from "@mastra/core";\nimport { openai } from "@ai-sdk/openai";\n\nconst agent = new Agent({\n  name: "assistant",\n  instructions: "あなたは親切なアシスタントです",\n  model: openai("gpt-4"),\n});\n```',
      url: 'https://mastra.ai/docs/agents',
      type: 'documentation' as const,
      relevance: 0.9,
    }];
  }
  
  if (queryLower.includes('workflow') || queryLower.includes('ワークフロー')) {
    return [{
      title: 'Mastra Workflows',
      content: 'Workflowを使用して複数のステップを連携できます。\n\n```typescript\nimport { Workflow } from "@mastra/core";\n\nconst workflow = new Workflow({\n  name: "example-workflow",\n  steps: [/* steps */]\n});\n```',
      url: 'https://mastra.ai/docs/workflows',
      type: 'documentation' as const,
      relevance: 0.9,
    }];
  }
  
  // デフォルト結果
  return [{
    title: 'Mastra 入門ガイド',
    content: 'Mastraは、TypeScriptでAIエージェントとワークフローを構築するためのフレームワークです。エージェント、ツール、メモリ、RAGなどの機能を提供します。',
    url: 'https://mastra.ai/docs/getting-started',
    type: 'documentation' as const,
    relevance: 0.7,
  }];
}