# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要
Mastraドキュメント検索エージェントのプロジェクト。MastraフレームワークとGoogle Gemini APIを使用して、MCP docs serverからMastraの公式ドキュメント、コード例、ブログ記事、チェンジログを検索・回答するエージェントを実装。

## 開発コマンド

```bash
# 開発サーバー起動（http://localhost:4115）
npm run dev

# プロジェクトビルド
npm run build

# 本番サーバー起動
npm run start

# 環境変数設定（初回のみ）
cp .env.example .env
# .envファイルでGEMINI_API_KEYを設定
```

## 実行方法（2ターミナル必要）

1. **ターミナル1**: Mastraサーバー起動
   ```bash
   npm run dev
   ```

2. **ターミナル2**: ドキュメント検索エージェント実行
   ```bash
   node run-docs.js
   ```

## アーキテクチャ

### コアコンポーネント
- **src/mastra/index.ts**: Mastra設定（LibSQLStore、PinoLogger）、エージェントとツールの登録
- **src/mastra/agents/docs-agent.ts**: ドキュメント検索エージェント（Gemini 1.5 Flash、日本語対話、メモリ機能）
- **src/mastra/tools/docs-search-tool.ts**: MCP docs server連携ツール（Mastra公式ドキュメント検索）
- **run-docs.js**: カラフルなインタラクティブCLI実行スクリプト

### ドキュメント検索の仕組み
1. MCPクライアント経由でMastra docs serverに接続
2. ユーザーの質問からキーワードを抽出して検索実行
3. ドキュメント、コード例、ブログ記事、チェンジログから関連情報を取得
4. コンテンツタイプを自動分類（documentation/example/blog/changelog）
5. 構造化された回答（概要+詳細+コード例+参考リンク）を生成
6. MCP接続失敗時はフォールバックデータを使用

### 技術スタック
- TypeScript（ES2022、strict mode、bundler moduleResolution）
- Node.js v20以上（ESModule形式）
- @mastra/core v0.13.1
- @mastra/mcp v0.13.1
- @google/generative-ai v0.24.1
- @mastra/memory v0.12.1
- @mastra/libsql v0.13.1
- MCP docs server（@mastra/mcp-docs-server）

### 環境要件
- Node.js v20以上必須
- GEMINI_API_KEY環境変数必須（Google AI Studio取得）
- インターネット接続（MCP docs server通信用）
- @mastra/mcp-docs-serverの自動インストール対応