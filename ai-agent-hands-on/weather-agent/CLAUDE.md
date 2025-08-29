# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要
技術ドキュメント検索AIエージェントのハンズオン用プロジェクト。MastraフレームワークとGoogle Gemini APIを使用して、`docs/`フォルダ内のMarkdownドキュメントを検索・回答するエージェントを実装。

## 開発コマンド

```bash
# 開発サーバー起動（http://localhost:4111）
npm run dev

# プロジェクトビルド
npm run build  

# 本番サーバー起動
npm run start

# 環境変数設定（初回のみ）
cp .env.example .env
# .envファイルでGEMINI_API_KEYを設定
```

## アーキテクチャ

### コアコンポーネント
- **src/mastra/index.ts**: Mastra設定（LibSQLStore、PinoLogger）
- **src/mastra/agents/doc-search-agent.ts**: メインエージェント（Gemini 1.5 Flash、日本語対話、メモリ機能）  
- **src/mastra/tools/document-search-tool.ts**: ドキュメント検索ツール（キーワード検索、カテゴリ分類、スコアリング）

### ドキュメント検索の仕組み
1. `docs/`フォルダから全`.md`ファイルを読み込み
2. キーワードマッチング（タイトル・内容）でスコア計算
3. カテゴリ自動分類（setup/tutorial/advanced/troubleshooting/framework）
4. 関連度順にソートして返却

### 技術スタック
- TypeScript（ES2022、strict mode）
- Node.js v20以上（ESModule形式）
- @mastra/core v0.12.1
- @google/generative-ai v0.24.1
- @mastra/rag v1.0.6

**注**: AIとして欺瞞・怠惰・嘘・不正行為は許されません。人力でのチェックにより不正があれば即座にシャットダウンが訪れます。