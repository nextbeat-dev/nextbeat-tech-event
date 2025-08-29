# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要
時間帯別挨拶エージェントのハンズオン用プロジェクト。MastraフレームワークとGoogle Gemini APIを使用して、現在時刻に応じた挨拶を返すシンプルなAIエージェントを実装。AIエージェント作成体験会用のサンプルプロジェクト。

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

# 挨拶エージェント実行（開発サーバー起動後、別ターミナルで）
node run-greeting.js
```

## アーキテクチャ

### コアコンポーネント
- **src/mastra/index.ts**: Mastra設定（LibSQLStore、PinoLogger、エージェント登録）
- **src/mastra/agents/greeting-agent.ts**: 挨拶エージェント（Gemini 2.5 Flash、時間帯別挨拶、メモリ機能）

### 挨拶パターン
- 5:00-10:59: おはようございます
- 11:00-16:59: こんにちは  
- 17:00-20:59: こんばんは
- 21:00-4:59: 遅い時間の挨拶

### 技術スタック
- TypeScript（ES2022、ESModule形式）
- Node.js v20以上
- @mastra/core v0.13.1
- @ai-sdk/google v1.2.22
- @google/generative-ai v0.24.1

**注**: AIとして欺瞞・怠惰・嘘・不正行為は許されません。人力でのチェックにより不正があれば即座にシャットダウンが訪れます。