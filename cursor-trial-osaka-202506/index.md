---
marp: true
theme: gaia
paginate: true
header: 'Cursorを使ったAIコーディング体験会'
footer: '株式会社ネクストビート'
---

<style>
  section {
    font-size: 26px;
  }
</style>

#  Cursorを使ったAIコーディング体験会
## ～AIとのペアプログラミングを体験しよう～

**2025年06月19日（木）**
**株式会社ネクストビート**

---

## 本日の流れ (18:30 - 20:00)

| 時間        | 内容                                          |
| ----------- | --------------------------------------------- |
| 18:30-18:40 | 会社紹介                                      |
| 18:40-18:50 | **講義：生成AI・AIエージェント・Cursor入門**  |
| 18:50-19:00 | **Cursor 環境設定・基本操作**                 | 
| 19:00-19:20 | **演習：簡易タスクリストアプリ - HTML/JS作成** |
| 19:20-19:30 | 休憩                                          |
| 19:30-19:50 | **演習：簡易タスクリストアプリ - 機能追加/スタイリング**       |
| 19:50-20:00 | まとめ・質疑応答                              |

---

## 第1部：講義 (18:40 - 18:50)
### 生成AI・AIエージェント・Cursor入門

---

### 1. AIコーディングの波 🌊

* LLM (大規模言語モデル) の進化により、AIがコードを生成・理解・編集する時代へ。
* ソフトウェア開発の生産性向上、新しい働き方を実現する可能性。
* **Cursor** のようなツールを使いこなし、AIを開発のパートナーに！

---

### 2. 生成AIとAIエージェント 🤖

* **生成AI (Generative AI):** 新しいコンテンツ (テキスト, 画像, **コード**) を生成するAI。
* **AIエージェント (AI Agent):** 自律的にタスクを実行するAI。コーディング支援も高度化。
  * 例: Cursor, GitHub Copilot (支援型) 〜 Claude Code, Codex, Jules, Devin (自律型)

---

### 3. Cursorとは？ ✨ AIファーストなコードエディタ

* VS Codeベースで馴染みやすいインターフェース。
* **AIとの対話 (`Ctrl+L` / `Cmd+L`)** や **インライン指示 (`Ctrl+K` / `Cmd+K`)** でコーディングを加速。
* コード生成、リファクタリング、デバッグ、ドキュメント作成などをAIがサポート。
* **無料版**でも強力な機能を体験可能！

---

## 第2部：Cursor 環境設定・基本操作 (18:50 - 19:00)

---

### Cursorの準備はOK？

* お手元のPCに **Cursor** はインストール済みですか？
    * 最初の起動まで済ませておいてください。
* Wi-Fi接続を確認してください (ゲストWi-Fiあり)。
    * Cursorの動作にはインターネット接続が必要です。
* 困ったら遠慮なくスタッフに声をかけてください！

---

### 基本的な使い方 (おさらい)

* **AIチャットを開く/閉じる:**
    * Windows: `Ctrl + L`
    * Mac: `Cmd + L`
* **選択範囲やカーソル位置でAIに指示 (インライン編集/生成):**
    * Windows: `Ctrl + K`
    * Mac: `Cmd + K`

試しにチャットでAIに「`こんにちは！今日の東京の天気を教えて`」と話しかけてみましょう。

---

### Cursorに質問した結果

- 回答は毎回変わります

<center>
<img src="img/cursor-chat-example.png" alt="Cursorのチャット例" width="25%">
</center>

---

### リポジトリをクローンする

**GitHubリポジトリ`mini-app`をクローンして、演習用のコードベースを準備します

```bash
git clone https://github.com/nextbeat-dev/mini-app.git
```

1. 「Open project」をクリック
2. クローンした`mini-app`フォルダを選択

<img src="img/cursor-start.png" alt="Cursorの起動画面" width="25%">

<img src="img/cursor-open-project.png" alt="Cursorのプロジェクトオープン" width="25%">

---

## 第3部：演習 (19:00 - 19:20)

### 簡易タスクリストアプリ

---

### 演習：目標

**HTML、CSS、JavaScriptを使ったシンプルなタスクリストアプリをCursorと一緒に作ってみましょう！**

* **機能要件：**
    1.  タスクを入力できるフォームがある。
    2.  入力されたタスクがリスト表示される。
    3.  タスクを完了状態にできる (打ち消し線など)。
    4.  タスクを削除できる。

---

### 演習：プロンプト例（HTML作成）

**HTMLの骨組み作成**

- `index.html` ファイルを作成。
- Cursorにチャットで依頼:

```
簡単なタスクリストアプリのHTML構造を考えてください。
入力フィールド、追加ボタン、タスク一覧表示エリアが必要です。
 ```

- Cursorが生成したHTMLを確認し、修正が不要なら「accept」をクリック。

---

### 演習：スクリーンショット（HTML作成プロンプト）

<img src="img/cursor-todo-html1.png" alt="HTML生成プロンプト" width="75%">

---

### 演習：スクリーンショット（HTML作成結果）

<img src="img/cursor-todo-html2.png" alt="HTML生成結果" width="75%">

---

<center>
デモ
</center>

---

### 演習：プロンプト例（.jsファイル作成）

**基本的なJavaScriptのロジック (タスク追加と表示)を作成**

- `script.js` ファイルを作成し、HTMLから読み込む（JSファイルは空）。

```html
<head>
    ...
    <script src="script.js" defer></script>
</head>
```

- Add context -> Files and Foldersから追加:
  - `index.html`, `script.js` を選択
  
- Cursorにチャットやインライン編集で依頼:

```
入力されたテキストをタスクとしてリストに追加し、表示するJavaScriptを書いて。
```

- Cursorが生成したJavaScriptを確認し、修正が不要なら「accept」をクリック。


---

### 演習：スクリーンショット（JavaScript作成プロンプト）

<img src="img/cursor-todo-js1.png" alt="JavaScript生成プロンプト" width="75%">

---

### 演習：スクリーンショット（JavaScript作成結果）

<img src="img/cursor-todo-js2.png" alt="JavaScript生成結果" width="75%">

---

<center>
デモ
</center>

---

### 演習：HTMLを開く

- `index.html` ファイルをChromeなどのブラウザで開いて、タスクリストアプリの基本的な動作を確認。

---

### 演習：スクリーンショット（タスクリストアプリの動作確認）

<img src="img/cursor-todo-app1.png" alt="タスクリストアプリの動作確認" width="75%">

---

<center>
デモ
</center>

---

## 休憩 (19:20 - 19:30)

☕️ ごゆっくりどうぞ！

---

## 第4部：演習 (19:30 - 19:50)

### 簡易タスクリストアプリ - 機能追加/スタイリング

---

### 演習：プロンプト例 (タスクの完了・削除機能)

- Cursorに機能追加を依頼:

```
タスクに完了チェックボックスを付けて、チェックされたら打ち消し線を入れるようにして。
各タスクに削除ボタンも付けて、クリックしたらそのタスクを削除できるようにして。
```

- Cursorが生成したコードを確認し、必要に応じて修正。

---


### 演習：スクリーンショット（修正プロンプト）

<img src="img/cursor-todo-revise1.png" alt="修正プロンプト" width="75%">

---

### 演習：スクリーンショット（修正結果）

<img src="img/cursor-todo-revise2.png" alt="修正結果" width="75%">

---

<center>
デモ
</center>

---

### 演習：タスクリストアプリの動作確認

- 再度 `index.html` をブラウザで開いて、タスクの完了・削除機能が動作することを確認

<img src="img/cursor-todo-app2.png" alt="修正版アプリ" width="75%">

---

### 演習：プロンプト例 (CSSでスタイリング)

- `style.css` ファイルを作成し、HTMLから読み込む
  - `<link rel="stylesheet" href="style.css">` を `<head>` 内に追加
- Add context -> Files and Foldersから追加:
  - `style.css` を選択
- Cursorにデザインを依頼:

```
このタスクリストアプリをもう少し見やすくスタイリングしてください。
モダンでシンプルな感じで。
```

**ヒント：** 生成されたコードが期待通りでなければ、AIに修正を依頼したり、自分で少し手直ししてみましょう！

---

### 演習：スクリーンショット（CSS作成プロンプト）

<img src="img/cursor-todo-css1.png" alt="CSS生成プロンプト" width="75%">

---

### 演習：スクリーンショット（CSS作成結果）

<img src="img/cursor-todo-css2.png" alt="CSS生成結果" width="75%">

---

<center>
デモ
</center>

---

### 演習：HTMLを開く

- `index.html` ファイルを再度ブラウザで開いて、タスクリストアプリの見た目や動作を確認。

---

### 演習：スクリーンショット（タスクリストアプリの動作確認）

<img src="img/cursor-todo-app3.png" alt="タスクリストアプリの動作確認" width="75%">

- 配色などが微妙に変わっているのがわかりますね！

---

<center>
デモ
</center>

---

### 本日のまとめ

* AIコーディングツール **Cursor** の基本的な使い方を体験しました。
* AIとの対話を通じて、簡単なWebアプリケーションを作成しました。
    * プロンプトによるコード生成
    * 既存コードの編集、機能追加
* AIは開発の強力な **アシスタント** になり得ます。
    * 定型作業の自動化、アイデアの壁打ち、新しい技術の学習など。

**今後の開発にもAIツールを積極的に活用してみてください！**

---

### 質疑応答 💬

イベントに関するご質問、CursorやAIコーディングに関するご質問など、どうぞ！

---

### 懇親会のご案内

- **20:00から懇親会**を開催します！ (任意参加)。

**本日はご参加いただき、ありがとうございました！**

**アンケートにご協力ください**

[アンケートはこちら](https://forms.gle/bq4n8zzUVKFBnupw5)
![QRコード](img/feedback-qr.png)