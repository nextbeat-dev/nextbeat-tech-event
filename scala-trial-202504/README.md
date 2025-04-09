# ゼロから始めるScala体験会

このリポジトリは、Scalaの体験会用のスライドを格納しています。

- index.md: メインスライド
- shared.md: 参加者に配布用のスライド

# スライドのビルド

```bash
npx @marp-team/marp-cli@latest --allow-local-files index.md -o index.pdf
```

# 配布用スライドのビルド（参加者用）

```bash
npx @marp-team/marp-cli@latest --allow-local-files shared.md -o shared.pdf
```
