# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要
リアルタイム天気情報エージェントのハンズオン用プロジェクト。MastraフレームワークとGoogle Gemini APIを使用して、Open-Meteo APIから世界中の都市の天気データを取得・回答するエージェントを実装。

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

# 天気エージェント実行（開発サーバー起動後、別ターミナルで）
node run-weather.js
```

## アーキテクチャ

### コアコンポーネント
- **src/mastra/index.ts**: Mastra設定（LibSQLStore、PinoLogger、エージェント/ツール登録）
- **src/mastra/agents/weather-agent.ts**: 天気エージェント（Gemini 2.5 Flash、日本語対話、メモリ機能、熱中症警戒レベル判定）
- **src/mastra/tools/weather-api-tool.ts**: Open-Meteo API連携ツール（座標検索、リアルタイム天気取得、フォールバック機能）

### 天気データ取得の仕組み
1. 都市名をOpen-Meteo Geocoding APIで座標に変換
2. 座標からOpen-Meteo Forecast APIで現在の天気データ取得
3. Weather codeから天気状況を日本語に変換
4. 気温レベルに応じた熱中症警戒と服装アドバイス生成

### 技術スタック
- TypeScript（ES2022、ESModule形式）
- Node.js v20以上
- @mastra/core v0.13.1
- @ai-sdk/google v1.2.22
- @google/generative-ai v0.24.1

**注**: AIとして欺瞞・怠惰・嘘・不正行為は許されません。人力でのチェックにより不正があれば即座にシャットダウンが訪れます。