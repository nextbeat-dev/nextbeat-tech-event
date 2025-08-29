# mastra-docs-agent

Mastraフレームワークを使用したドキュメント検索エージェントです。

## 📚 機能

### Mastraドキュメント検索エージェント (`docsAgent`)
- MCP docs server使用（Mastra公式ドキュメントアクセス）
- Mastraの全領域について質問・回答対応
- ドキュメント、コード例、ブログ記事、チェンジログを検索
- TypeScriptコード例と実用的な実装ガイドを提供

## 🛠️ セットアップ

### 環境要件
- Node.js v20以上
- npm

### 1. 環境変数の設定
```bash
cp .env.example .env
```
`.env`ファイルを編集して、Gemini API キーを設定してください：
```
GEMINI_API_KEY=your-gemini-api-key-here
```

### 2. 依存関係のインストール
```bash
npm install
```

## 🚀 使い方

### ステップ1: Mastraサーバーを起動
最初にMastraサーバーを起動します（ターミナル1）：
```bash
npm run dev
```
サーバーは `http://localhost:4115` で起動します。

### ステップ2: 天気エージェントを実行
別のターミナル（ターミナル2）を開いて、天気エージェントを実行します：

```bash
node run-weather.js
```

**実行スクリプトの機能：**
- 🎨 カラフルなインタラクティブCLI
- 💬 対話形式で天気情報を取得
- 🌍 世界中の都市に対応（リアルタイムデータ）
- ⚡ Open-Meteo APIから最新データを取得
- 🔄 連続質問可能

**使用例：**
```
╔════════════════════════════════════════════════╗
║     📚  Mastraドキュメント検索エージェント 📚      ║
╚════════════════════════════════════════════════╝

使い方:
- Mastraについて質問してください（例: "エージェントの作り方は？"）
- 対応分野: Agents, Workflows, Tools, Memory, RAG, MCP, etc.
- 終了: "exit" または Ctrl+C

Mastra> エージェントの作り方は？

📚 回答:
## 概要
Mastraでエージェントを作成するには、Agentクラスを使用します。

## 詳細説明
Agentクラスを使って、指示文、モデル、ツールを設定できます。

## コード例
```typescript
import { Agent } from '@mastra/core';
import { openai } from '@ai-sdk/openai';

const agent = new Agent({
  name: 'assistant',
  instructions: 'あなたは親切なアシスタントです',
  model: openai('gpt-4'),
  tools: { /* tools */ },
});
```

## 参考リンク
- https://mastra.ai/docs/agents

Mastra> exit
またね！Mastraで素晴らしいプロジェクトを！ 🚀
```

## 📁 プロジェクト構成

```
mastra-docs-agent/
├── src/
│   └── mastra/
│       ├── index.ts                    # Mastra設定
│       ├── agents/
│       │   └── docs-agent.ts           # ドキュメント検索エージェント
│       └── tools/
│           └── docs-search-tool.ts     # MCP docs server連携ツール
├── run-docs.js        # ドキュメント検索エージェント実行スクリプト
├── .env.example       # 環境変数テンプレート
└── package.json
```

## 🔧 トラブルシューティング

### サーバーが起動しない
- Node.js v20以上がインストールされているか確認
- `.env`ファイルにGEMINI_API_KEYが設定されているか確認

### エージェントに接続できない
- Mastraサーバーが起動しているか確認（`npm run dev`）
- ポート4115が使用されていないか確認

### MCPサーバーエラー
- MCP docs serverのインストールが必要な場合があります
- インターネット接続が必要です

### API制限エラー
- Gemini APIの利用制限に達している可能性があります
- しばらく待ってから再試行してください

## 🚀 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start
```

## 📚 学習リソース

- [Mastra公式ドキュメント](https://mastra.ai/)
- [MCP docs server](https://www.npmjs.com/package/@mastra/mcp-docs-server)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Google AI Studio](https://aistudio.google.com/)
- [Gemini API ドキュメント](https://ai.google.dev/gemini-api/docs)

## ライセンス

ISC