---
marp: true
theme: gaia
paginate: true
header: 'ゼロから始めるScala体験会'
footer: ' ' # フッターは任意で設定
---

<style>
  section {
    font-size: 28px;
  }
</style>


# ゼロから始めるScala体験会 in 大阪

## 2025年5月20日（火）
## 株式会社ネクストビート

---

## 本日のゴールと対象者

* **ターゲット:**
    * Scalaに興味がある方
    * プログラミング経験はあるが、Scalaは初心者レベル
* **ゴール:** 1時間30分で...
    * Scalaの魅力（特に **型安全性**, **表現力**, **関数型** の考え方）の一端を体験
    * `opaque type` や `Either`、関数合成を使って **堅牢なコード** を書くメリットを体感してもらう
    * `given`/`using`を使った型クラスの作り方を体験してもらう

---
<!-- トーク内容 -->
このセッションでは、Scalaを全く知らない方や、少し触ったことがある程度の初心者の方を対象にしています。Scalaの強力な型システムや関数型プログラミングの考え方に触れていただき、Scalaでコードを書くことの楽しさやメリットを感じていただくことを目指します。特に、実務でも役立つ「堅牢なコードを書く」という点に焦点を当てて、具体的なコード例を通して学んでいきます。

---

## ツールと進め方

* **ツール:** **Scastie** (ブラウザで動くScala環境)
    * URL: [https://scastie.scala-lang.org/](https://scastie.scala-lang.org/)
    * デフォルトでScala 3モードで動きます
* **形式:**
    * 説明とデモが中心
    * ときどき、Scastieで簡単なコードを試す **演習時間** を設けます

---
<!-- トーク内容 -->
本日の体験会では、特別な環境構築は不要です。ブラウザ上でScalaのコードを書いて実行できる便利なツール「Scastie」を使用します。インターネットに繋がっていれば、すぐにScalaのコードを試すことができます。セッションの形式としては、私が画面を共有しながら説明とデモを行い、途中で皆さんに実際にコードを書いて手を動かしていただく時間を設けます。分からないことがあれば、遠慮なく質問してください。

---

## 時間配分（目安）

- Scalaの紹介と導入（10分）: 18:40-18:50
- 値オブジェクト：case class VS. opaque type（10分）: 18:50-19:00
- Eitherを使った値オブジェクトのバリデーション（10分）: 19:00-19:10
- 値オブジェクトの型安全な生成（10分）: 19:10-19:20
- 休憩（10分）: 19:20-19:30
- given/usingを使った型クラスの作り方（15分）: 19:30-19:45
- まとめ・プロダクションコード・質疑応答（15分）: 19:45-20:00
- 20:00〜懇親会（🍣）

※Scastieの使い方とScalaの基本的な構文は[補足資料](https://github.com/nextbeat-dev/nextbeat-tech-event/blob/main/scala-trial-202505/shared.pdf)をご覧ください。

---
<!-- トーク内容 -->
こちらが本日の大まかなタイムスケジュールです。各トピックに10分から15分程度の時間を設けていますが、参加者の皆さんの理解度に合わせて多少前後する可能性があります。休憩時間も設けていますので、リフレッシュしながら進めましょう。もし、Scalaの基本的な書き方などに不安がある方は、事前に補足資料をご確認いただくと、よりスムーズに進められるかと思います。

---

## Scalaの紹介と導入

---
<!-- トーク内容 -->
それでは、まずはScalaの紹介から始めます。Scalaがどのようなプログラミング言語なのか、その特徴についてお話しします。

---

## Scalaとは？ (1/2)

* JVM (Java Virtual Machine) 上で動作する **静的型付け** 言語
* Javaとの高い **相互運用性**
    * Java のライブラリをそのまま利用できる
* **オブジェクト指向** + **関数型プログラミング** の融合
    * 両方の良いところを活用できる！
* 強力な **型システム**
    * コンパイル時にエラーを発見しやすく、堅牢なコードを書ける
    * **今日、このメリットを体験します！**

---
<!-- トーク内容 -->
ScalaはJavaと同じJVM上で動作するため、Javaの豊富なライブラリをそのまま利用できるという大きな利点があります。また、オブジェクト指向と関数型プログラミングの両方のパラダイムをサポートしており、それぞれの良い部分を組み合わせて柔軟な開発が可能です。特にScalaの強力な型システムは、コンパイル時に多くのエラーを発見できるため、実行時エラーを減らし、より堅牢なアプリケーションを開発するのに役立ちます。本日はこの型安全性のメリットを実際にコードを書きながら体験していただきます。

---

## Scalaとは？ (2/2)

* **今日の焦点:**
    * Scalaの **型安全性**
    * **関数型プログラミング** の考え方の一部
* **体験するメリット:**
    * **堅牢性:** バグりにくいコード
    * **表現力:** やりたいことを明確にコードで表現できる
    * **組み立てやすさ:** 部品を組み合わせて安全なプログラムを作る

---
<!-- トーク内容 -->
本日の体験会では、Scalaの全ての機能を網羅するわけではありません。特に「型安全性」と「関数型プログラミング」の考え方に焦点を当てて、これらを活用することでどのようなメリットが得られるのかを体験していただきます。具体的には、バグりにくい堅牢なコードを書くこと、コードで意図を明確に表現すること、そして小さな部品を組み合わせて安全なプログラムを構築することの楽しさを感じていただければと思います。

---

## Hello, Scala! (Scastieで試そう！)

まずは定番の "Hello, World!"

```scala
// このコードをScastieに貼り付けて実行してみましょう！
println("Hello, World!")
```

---
<!-- トーク内容 -->
それでは、早速Scastieを使ってScalaのコードを書いてみましょう。まずはプログラミングの第一歩として、画面に「Hello, World!」と表示させるコードです。Scastieの画面を開いて、このコードを貼り付けて実行ボタンを押してみてください。

---

## ちょっとScalaらしいコード

フィボナッチ数列を生成する例 (雰囲気を掴むだけでOK)

```scala
val fibs: LazyList[BigInt] = {
  BigInt(0) #:: BigInt(1) #:: fibs.zip(fibs.tail).map { case (a, b) =>
    a + b
  }
}
println(fibs.take(10).toList)
// 出力: List(0, 1, 1, 2, 3, 5, 8, 13, 21, 34)
```

* `LazyList`: 必要になるまで計算しないリスト
* `.map`: 関数型らしいデータ変換

---
<!-- トーク内容 -->
次に、少しScalaらしいコードとして、フィボナッチ数列を生成する例を見てみましょう。ここでは`LazyList`という、必要になるまで計算を遅延させるデータ構造や、関数型プログラミングでよく使われる`map`というメソッドが登場します。このコードの詳しい内容は理解できなくても大丈夫です。Scalaでこのような簡潔かつ表現力豊かなコードが書けるという雰囲気を掴んでいただければ十分です。

---

## 値オブジェクト：case class VS. opaque type

---
<!-- トーク内容 -->
ここからは、より実践的な内容に入っていきます。まずは「値オブジェクト」という概念と、それをScalaでどのように表現するかについて学びます。

---

## 値オブジェクト：メールアドレスを「型」で表す

**問題:** メールアドレスをただの `String` で扱うと？

```scala
def sendEmail(email: String, subject: String): Unit = ???

// こんな呼び出し方ができてしまう...
sendEmail("これはメールアドレスじゃない", "テスト")
sendEmail("", "件名") // 空文字列も渡せる
sendEmail("user@domain.com", "user-name") // 引数の順番ミスにも気づきにくい
```

**課題:**
* 不正な値（空文字列、形式が違う文字列）を **代入できてしまう**
* 引数が `String` だと、 **何を表す文字列なのか分かりにくい**

**解決策:** メールアドレス専用の **型** を作る！ => **値オブジェクト**

---
<!-- トーク内容 -->
ソフトウェア開発において、メールアドレスのような特定の意味を持つデータを単なる文字列（String）として扱うことはよくあります。しかし、これは様々な問題を引き起こす可能性があります。例えば、不正な形式の文字列や空文字列をメールアドレスとして扱ってしまったり、関数に複数のString型の引数がある場合に、意図しない順番で値を渡してしまったりする可能性があります。このような問題を解決するために、「値オブジェクト」という考え方が有効です。これは、特定の値をその意味に応じた専用の「型」として定義するものです。

---

## 方法1: `case class` による値オブジェクトの表現

`case class` を使うと、簡単に独自の型を定義できます。

```scala
// Emailという名前の case class を定義
case class Email(value: String)
// Email型として値を保持
val email: Email = Email("test@example.com")
println(email)        // 出力: Email(test@example.com)
println(email.value)  // 出力: test@example.com
// 型が違うので、Stringを直接代入できない！ (コンパイルエラー)
// val wrong: Email = "test@example.com"
```

* **メリット:** 簡単、シンプル
* **デメリット:** 実行時に `Email` オブジェクト生成のオーバーヘッド

---
<!-- トーク内容 -->
Scalaで値オブジェクトを表現する最も簡単な方法の一つが`case class`を使うことです。`case class`を使うと、このように`Email`という新しい型を簡単に定義できます。`Email`型として定義することで、String型とは区別され、コンパイル時に型の不一致によるエラーを検出できるようになります。ただし、`case class`は通常のクラスと同様に実行時にオブジェクトを生成するため、わずかながらオーバーヘッドが発生します。

---

## 方法2: `opaque type` による値オブジェクトの表現

実行時オーバーヘッドなしで型安全性を実現！(Scala 3 の機能)

* **`opaque type Email = String`**
  * `Email` 型を作るが、実行時は `String` として扱われる
  * 定義したスコープ内では `Email` と `String` は同じ型として扱われる

```scala
object Email {
  // opaque type を定義 (実体は String)
  opaque type Email = String
  // ファクトリメソッド (同じスコープであれば、String と Email は同じ扱い)
  def from(value: String): Email = value
  // 拡張メソッド (内部の値へのアクセス用)
  extension (self: Email) def value: String = self
}
```

---
<!-- トーク内容 -->
Scala 3で導入された`opaque type`を使うと、`case class`のような実行時のオーバーヘッドなしに型安全な値オブジェクトを実現できます。`opaque type Email = String`と定義することで、コンパイル時には`Email`と`String`は異なる型として扱われますが、実行時には`String`そのものとして扱われます。これにより、型安全性を保ちつつ、パフォーマンスのオーバーヘッドをゼロにすることができます。`opaque type`を使う場合は、値を生成するためのファクトリメソッドや、内部の値にアクセスするための拡張メソッドを定義するのが一般的です。

---

## `opaque type` の特徴と比較

* **メリット:**
  * **実行時オーバーヘッドゼロ！**
  * **コンパイル時** に `String` と `Email` の混同を防げる（型安全性）
* **デメリット:**
  * `case class` より少し記述が増える

```scala
import Email.*
val e: Email = Email.from("test@example.com")
println(e) // 出力: test@example.com
println(e.getClass) // 出力: class java.lang.String (実行時は String として扱われる)
// 直接 String は代入できない！(コンパイルエラー)
// val eBad: Email = "test@example.com"
```
---
<!-- トーク内容 -->
`opaque type`の最大のメリットは、実行時のオーバーヘッドがないことです。これは、パフォーマンスが重要な場面で非常に有効です。また、`case class`と同様にコンパイル時に型安全性を確保できます。一方で、`case class`に比べて定義に必要な記述が少し増えるという側面もあります。どちらを使うかは、プロジェクトの要件やチームのコーディング規約によって判断すると良いでしょう。

---

# 値オブジェクトの型安全な生成

---
<!-- トーク内容 -->
`opaque type`を使って`Email`型を定義できるようになりましたが、まだ課題が残っています。それは、不正な文字列からでも`Email`型の値を生成できてしまうという点です。

---

## 値オブジェクトの型安全な生成

opaque type によって、`Email` 型を作ることができました。
しかし、`Email` の値を不正な文字列 (例: `""`, `"not-email"`) から生成することができてしまいます。

```scala
val invalidE1: Email = Email.from("") // 空文字列を渡してもコンパイルエラーにならない
val invalidE2: Email = Email.from("not-email") // 不正なメールアドレスも渡せてしまう
println(invalidE1) // 出力: ""
println(invalidE2) // 出力: "not-email"
```

---
<!-- トーク内容 -->
先ほど定義した`Email.from`メソッドは、どんな文字列を受け取っても`Email`型に変換してしまいます。これでは、せっかく型を定義しても、不正な値がシステムに入り込んでしまう可能性があります。そこで、`Email`型の値を生成する際に、入力値が正しい形式であるかを検証（バリデーション）し、不正な値からは`Email`を生成できないようにする必要があります。

---

# Eitherを使った値オブジェクトのバリデーション

**目標:** `opaque type Email` を、 **不正な文字列** (例: `""`, `"not-email"`) からは **生成できない** ようにしたい。

**アイデア:**

1.  `Email` を生成する前に、入力文字列を **バリデーション** する
2.  バリデーションの結果を `Either` で返すようにする
    * 成功: `Right(検証済み文字列)`
    * 失敗: `Left(エラーメッセージ)`
3.  成功時に`opaque type Email` として値を返す **安全なファクトリメソッド** を作る。

---
<!-- トーク内容 -->
不正な値から`Email`を生成できないようにするために、バリデーション処理を導入します。バリデーションの結果は、「成功」または「失敗」のどちらかになります。このような「成功か失敗か」を型で表現するのに便利なのが、Scalaの標準ライブラリに含まれる`Either`型です。`Either`を使うことで、関数の戻り値の型を見れば、その関数が失敗する可能性があるかどうかを明確にすることができます。

---

## 成功 or 失敗 を表す型: `Either`

結果が **成功** か **失敗** のどちらか一方であることを **型** で表現します。

* `Either[L, R]` という型
    * `L`: Left（左側）の型。慣習的に **失敗** 時の情報を入れる
    * `R`: Right（右側）の型。慣習的に **成功** 時の値を入れる

```scala
// 成功例: Right を使う。Int型の値 100 を持つ
val success: Either[String, Int] = Right(100)
// 失敗例: Left を使う。String型の "エラー発生" を持つ
val failure: Either[String, Int] = Left("エラー発生")
println(success) // 出力: Right(100)
println(failure) // 出力: Left(エラー発生)
```

---
<!-- トーク内容 -->
`Either[L, R]`型は、`Left`と`Right`という2つのケースを持つ型です。慣習として、`Left`には処理が失敗した際のエラー情報を、`Right`には処理が成功した際の正常な値を格納します。このように型で成功と失敗を区別することで、コードを読む人がその関数の振る舞いを理解しやすくなります。

---

## バリデーション関数の準備

今回はシンプルなチェック関数を自作します。
(実務ではバリデーションライブラリを使うことが多いです)

* **作るチェック関数:**
    1.  `nonEmpty`: 空文字列 (`""` や `" "`) でないか？
    2.  `containsAtMark`: `@` マークを含んでいるか？

* **シグネチャ:** `String => Either[String, String]`
    * 入力: `String`
    * 出力: `Either[エラーメッセージ, 検証済み文字列]`

---
<!-- トーク内容 -->
今回は例として、メールアドレスのバリデーションとして「空文字列でないこと」と「@マークが含まれていること」の2つのチェックを行う関数を作成します。これらの関数は、入力の文字列を受け取り、チェックが成功すればその文字列を`Right`で包んで返し、失敗すればエラーメッセージを`Left`で包んで返します。関数のシグネチャ（型）を見れば、この関数が`String`を受け取って、`String`型のエラーメッセージか、あるいは検証済みの`String`を返す可能性があることが分かります。

---

## 演習：バリデーション関数 (10分)

- [Scastieへのリンク](https://scastie.scala-lang.org/kmizu/K5JfdHyVRNWrVKyBp90RMA/6)

```scala
// object Email { ... の中に追加

  // 空文字列 (`""` や `" "`) でなければ Right、空文字列であれば Left
  def nonEmpty(value: String): Either[String, String] = {
    // value.trim で前後の空白を除去してから isEmpty でチェック
    ???
  }
  // `@` マークを含んでいれば Right、含んでいなければ Left
  def containsAtMark(value: String): Either[String, String] = {
    // value.contains でチェック
    ???
  }

// }
```

---
<!-- トーク内容 -->
それではここで、最初の演習です。Scastieを開いて、先ほど説明した`nonEmpty`関数と`containsAtMark`関数を実装してみましょう。`object Email`の中にこれらの関数を追加する形で書いてみてください。ヒントとして、文字列の前後の空白を取り除く`trim`メソッドや、特定の文字列を含むかチェックする`contains`メソッドを使うと良いでしょう。10分程度時間を取りますので、ぜひ挑戦してみてください。

---

## 演習：バリデーション関数 (回答例)

```scala
// object Email { ... の中に追加
  def nonEmpty(value: String): Either[String, String] = {
    // value.trim で前後の空白を除去してから isEmpty でチェック
    if (value.trim.isEmpty) {
      Left("Email cannot be empty") // 失敗 -> Left
    } else {
      Right(value) // 成功 -> Right
    }
  }

  def containsAtMark(value: String): Either[String, String] = {
    if (value.contains('@')) {
      Right(value) // 成功 -> Right
    } else {
      Left("Email must contain '@'") // 失敗 -> Left
    }
  }
// }
```

---
<!-- トーク内容 -->
こちらがバリデーション関数の回答例です。`nonEmpty`関数では、`trim`で空白を除去した後に`isEmpty`で空文字列かチェックし、空であればエラーメッセージと共に`Left`を、そうでなければ入力値を`Right`で返しています。`containsAtMark`関数では、`contains('@')`で@マークが含まれているかチェックし、含まれていれば入力値を`Right`で、そうでなければエラーメッセージと共に`Left`を返しています。皆さんのコードと比べてみてください。

---

## バリデーションの「合成」

`nonEmpty` と `containsAtMark` の **両方** を **順番に** 適用したい。

* `nonEmpty` で **失敗したら、処理を中断** して `Left` を返したい。
* `nonEmpty` が **成功したら、結果を使って** `containsAtMark` を実行したい。

ここで `Either` の **関数合成** が役立ちます！
とくに `for` 式 (for comprehension) を使うと宣言的に書けます。

---
<!-- トーク内容 -->
次に、これらのバリデーション関数を組み合わせて、複数のチェックを順番に行う方法を考えます。メールアドレスが有効であるためには、「空文字列でない」かつ「@マークが含まれている」の両方の条件を満たす必要があります。もし最初の「空文字列でない」チェックで失敗したら、その後の「@マークが含まれている」チェックは行う必要はありません。このように、前の処理が成功した場合にのみ次の処理に進む、という流れを表現するのに`Either`の関数合成が非常に役立ちます。特にScalaでは`for`式を使うと、このような一連の処理を非常に分かりやすく記述できます。

---

## 安全なファクトリメソッド `from` の実装

`for` 式を使って、複数のバリデーションを **合成** します。
`Either` に対する `for` 式は、途中で `Left` になったら、その後ろの処理は実行されずに、その `Left` が最終結果となります。

```scala
// object Email { ... の中に追加

  // 複数のバリデーションを合成する関数
  def from(value: String): Either[String, Email] = {
    for {
      s1 <- nonEmpty(value)      // 1. nonEmpty を実行。失敗(Left)ならここで終了
      s2 <- containsAtMark(s1)   // 2. s1が成功(Right)の場合のみ実行。失敗ならここで終了
      // 他のチェックもここに追加できる
      // s3 <- checkDomain(s2)
    } yield s2 // 3. 全てのチェックが成功(Right)した場合、最後の結果(s2)が Right で包まれて返る
  }

// }
```

---
<!-- トーク内容 -->
こちらが`for`式を使った安全なファクトリメソッド`from`の実装です。`for`式の中では、まず`nonEmpty(value)`を実行し、その結果が`Right`であればその値が`s1`に束縛され、次の`containsAtMark(s1)`が実行されます。もし`nonEmpty(value)`の結果が`Left`であれば、その時点で`for`式全体の評価が中断され、その`Left`が`from`メソッドの戻り値となります。このように、`for`式を使うことで、複数の`Either`を返す処理を、あたかも通常のシーケンシャルな処理のように記述でき、非常に読みやすいコードになります。全てのバリデーションが成功した場合、`yield`の後の値が`Right`で包まれて返されます。

---

## 全体のコード (Email オブジェクト)

```scala
object Email {
  opaque type Email = String

  // --- バリデーション関数 (※privateに変更: Email オブジェクトからのみアクセスできる) ---
  private def nonEmpty(value: String): Either[String, String] =
    if (value.trim.isEmpty) Left("Email cannot be empty") else Right(value)

  private def containsAtMark(value: String): Either[String, String] =
    if (value.contains('@')) Right(value) else Left("Email must contain '@'")

  // --- 安全なファクトリメソッド (バリデーション合成) ---
  def from(value: String): Either[String, Email] =
    for {
      s1 <- nonEmpty(value)
      s2 <- containsAtMark(s1)
    } yield s2

  // --- 拡張メソッド ---
  extension (self: Email) def value: String = self
}
```

---
<!-- トーク内容 -->
これが、`opaque type`と`Either`、そして`for`式を使って実装した`Email`オブジェクトの全体像です。バリデーション関数は`private`にして、`Email`オブジェクトの外からは直接呼び出せないようにしています。これにより、`Email`型の値を生成する唯一の方法が、バリデーション済みの値を返す安全なファクトリメソッド`Email.from`だけになります。

---

## 試してみよう！

安全なファクトリメソッド `Email.from` を使ってみましょう。

```scala
import Email.* // Email オブジェクトの中身を使えるようにする

val validEmailResult   = Email.from("test@example.com")
val emptyEmailResult   = Email.from("")
val noAtMarkResult     = Email.from("testexample.com")
val emptyThenNoAtMark  = Email.from("   ") // 空白のみ

println(s"Valid: $validEmailResult")
println(s"Empty: $emptyEmailResult")
println(s"No '@': $noAtMarkResult")
println(s"Empty then No '@': $emptyThenNoAtMark")
```

---
<!-- トーク内容 -->
それでは、今作った安全なファクトリメソッド`Email.from`を実際に使って、様々な入力値で試してみましょう。正しいメールアドレス、空文字列、@マークを含まない文字列、空白のみの文字列など、いくつかのパターンで実行結果を確認してみてください。

---

## 実行結果

```
Valid: Right(test@example.com)
Empty: Left(Email cannot be empty)
No '@': Left(Email must contain '@')
Empty then No '@': Left(Email cannot be empty) // 最初の nonEmpty で失敗
```

---
<!-- トーク内容 -->
実行結果はこのようになります。正しいメールアドレスからは`Right`で包まれた値が返ってきていますが、不正な文字列からはそれぞれのバリデーションエラーメッセージと共に`Left`が返されていることが分かります。空白のみの文字列の場合は、最初の`nonEmpty`で失敗しているため、その後の`containsAtMark`は実行されずに`nonEmpty`のエラーメッセージが返されています。このように、`Either`と`for`式を使うことで、エラーハンドリングを含めた一連の処理を安全かつ簡潔に記述できます。

---

# 値オブジェクトを使った型安全な処理

---
<!-- トーク内容 -->
安全なファクトリメソッドを使って`Email`型の値を生成できるようになりました。次に、この`Email`型を関数の引数として使うことで、どのように型安全な処理を実現できるかを見ていきましょう。

---

## 型安全な関数の定義

`Email.from` で **安全に生成された** `Email` 型だけを受け取る関数を定義してみましょう。

```scala
def sendEmail(email: Email, subject: String): Unit = {
  // Email.from によってバリデーション済みであることが保証されている！
  println(s"$email にメールを送信します。件名: $subject")
}

// こんな呼び出し方はできない！
// sendEmail("これはメールアドレスじゃない", "テスト")
// sendEmail("", "件名")
// sendEmail("user@domain.com", "user-name") // 引数の順番ミスにも気づける
```

---
<!-- トーク内容 -->
メール送信関数`sendEmail`の引数の型を`String`から`Email`に変更しました。このようにすることで、この関数は`Email.from`によってバリデーション済みの`Email`型の値しか受け付けなくなります。もし誤って`String`型の値を渡そうとすると、コンパイルエラーが発生します。これにより、不正なメールアドレスがこの関数に渡されることをコンパイル時に防ぐことができます。また、引数の型が`Email`と`String`になったことで、それぞれの引数が何を表しているのかがより明確になり、引数の順番間違いなども防ぎやすくなります。

---

## 型安全な関数を使う

`Email.from` の型は `Either[String, Email]` なので、そのまま渡すことはできません。 `Either` の結果は、 `match` 式を使って取り出すことができます。

```scala
val validEmailResult = Email.from("test@example.com")
val invalidEmailResult = Email.from("invalid-email")

validEmailResult match {
  case Right(emailInstance) => sendEmail(emailInstance, "テスト件名")
  case Left(error)          => println(s"Match Failed: $error")
}
// 出力: test@example.com にメールを送信します。件名: テスト件名

invalidEmailResult match {
  case Right(emailInstance) => sendEmail(emailInstance, "テスト件名")
  case Left(error)          => println(s"Match Failed: $error")
}
// 出力: Match Failed: Email must contain '@'
```

---
<!-- トーク内容 -->
`Email.from`メソッドの戻り値は`Either[String, Email]`型なので、そのまま`sendEmail`関数に渡すことはできません。`Either`型の中身を取り出すには、`match`式を使うのが一般的です。`match`式を使うことで、結果が`Right`の場合と`Left`の場合で異なる処理を記述できます。`Right`の場合は、中に含まれる`Email`インスタンスを取り出して`sendEmail`関数に渡し、`Left`の場合はエラーメッセージを表示する、といった処理を記述しています。このように、`match`式を使うことで、`Either`の成功ケースと失敗ケースのどちらの処理も漏れなく記述することをコンパイラが保証してくれます。

---

## `Either` の結果を安全に使う (`fold`)

`match` の代わりに `fold` メソッドもよく使われます。

```scala
println("\nUsing fold:")

validEmailResult.fold(
  error => println(s"Fold Failed: $error"),  // 第1引数: Left の場合の処理
  email => sendEmail(email, "テスト件名")    // 第2引数: Right の場合の処理
)
// 出力: test@example.com にメールを送信します。件名: テスト件名

invalidEmailResult.fold(
  error => println(s"Fold Failed: $error"),
  email => sendEmail(email, "テスト件名") // こちらは実行されない
)
// 出力: Fold Failed: Email must contain '@'
```

---
<!-- トーク内容 -->
`match`式の代わりに、`Either`型が提供する`fold`メソッドを使うこともよくあります。`fold`メソッドは2つの関数を引数に取ります。最初の関数は`Left`の場合に実行され、2番目の関数は`Right`の場合に実行されます。`match`式と同様に、`fold`を使うことで`Either`の成功と失敗の両方のケースに対する処理を記述でき、処理漏れを防ぐことができます。どちらを使うかは好みの問題ですが、`fold`の方がより簡潔に書ける場合が多いです。

---

## まとめ: 体験したこと ✨

* **値オブジェクト:** ドメインの概念（例: Email）を **型** で表現する手法。
    * `case class` (シンプル) vs **`opaque type`** (実行時コストゼロ！)
* **`Either[L, R]`:** **成功(Right)** または **失敗(Left)** を型レベルで表現。
* **関数合成 (`for`式):** 複数の処理（バリデーションなど）を宣言的かつ安全に **組み合わせる**。途中で失敗したら中断できる！
* **型安全性:**
    * `opaque type` で `String` と `Email` の混同を **コンパイル時に** 防ぐ。
    * 関数の引数型 (`def f(e: Email)`) で意図を明確にし、不正な利用を **コンパイル時に** 防ぐ。
    * `Either` の `match` や `fold` で、成功/失敗の処理漏れを **コンパイル時に** 防ぐ。

---
<!-- トーク内容 -->
ここまでの内容をまとめます。値オブジェクトを`opaque type`で表現することで、実行時のオーバーヘッドなしに型安全なコードを書けることを学びました。また、`Either`型を使って処理の成功と失敗を型レベルで表現し、`for`式を使って複数のバリデーション処理を安全に合成する方法を学びました。これらのScalaの機能を使うことで、コンパイル時に多くのエラーを検出できるようになり、バグりにくい堅牢なコードを書くことができます。

---

# given/usingを使った型クラスの作り方

---
<!-- トーク内容 -->
後半は、Scala 3でより使いやすくなった「型クラス」について学びます。型クラスは、特定の操作をサポートする型を抽象化するための強力なパターンです。

---

## given/usingを使った型クラスの作り方

型クラスは、特定の操作（メソッド）をサポートする型を抽象化するデザインパターンです。Scala 3では `given` と `using` を使って型クラスをより扱いやすく記述できます。

- **型クラスの定義:**
  - 共通の操作を定義する `trait` を使います。

- **型クラスインスタンスの定義 (`given`):**
  - 特定の型が型クラスの操作をどのように実装するかを `given` を使って定義します。

- **型クラスの利用 (`using`):**
  - 型クラスのインスタンスが必要な関数やメソッドの引数に `using` を付けます
  * コンパイラが適切な `given` インスタンスを自動で見つけて渡してくれます。

---
<!-- トーク内容 -->
型クラスを理解するためのキーワードは「操作の抽象化」と「インスタンスの自動解決」です。まず、`trait`を使って型クラスとして共通の操作を定義します。次に、特定の型（例えばInt型やString型）がその操作をどのように実現するかを`given`を使って定義します。これを「型クラスインスタンス」と呼びます。そして、その操作を使いたい関数やメソッドの引数に`using`を付けると、コンパイラがスコープ内から適切な`given`インスタンスを自動で見つけてきてくれます。これにより、コードが非常に簡潔になります。

---

## given/usingを使った型クラスの作り方（コード例）

例として、値を文字列に変換する `Show` という型クラスを考えます。

```scala
// 1. 型クラスの定義 (Show トレイト)
trait Show[A] {
  def show(value: A): String
}
// 2. Int型とString型に対するShowインスタンスの定義 (given)
given intShow: Show[Int] with {
  def show(value: Int): String = value.toString
}
given stringShow: Show[String] with {
  def show(value: String): String = s""""$value"""" // 文字列は引用符で囲む
}
// 3. 型クラスを利用する関数 (using)
def display[A](value: A)(using s: Show[A]): Unit = {
  println(s.show(value))
}
// 4. 型クラスの利用
display(123)      // 出力: 123 (Intのgivenインスタンスが使われる)
display("hello")  // 出力: "hello" (Stringのgivenインスタンスが使われる)
```

---
<!-- トーク内容 -->
具体的な例として、任意の型の値を文字列に変換する`Show`という型クラスを考えます。まず、`Show[A]`という`trait`で`show`というメソッドを定義します。これが型クラスの定義です。次に、`Int`型と`String`型に対して、それぞれ`Show`のインスタンスを`given`を使って定義します。`Int`の場合は`toString`を使い、`String`の場合は前後に引用符を付けています。そして、この`Show`型クラスを利用する`display`関数を定義します。`display`関数の引数リストに`using s: Show[A]`と書くことで、「この関数を実行するには、型`A`に対する`Show`のインスタンスが必要です」ということを示しています。`display(123)`と呼び出すと、コンパイラは`Int`型に対する`given Show[Int]`インスタンスを自動で見つけてきて、それを`s`として`display`関数に渡してくれます。同様に、`display("hello")`の場合は`String`型に対するインスタンスが使われます。

---

## given/usingを使った型クラスの作り方（コード例） - 補足

- givenインスタンスは名前を省略することも多いです

```scala
// 1. 型クラスの定義 (Show トレイト)
trait Show[A] {
  def show(value: A): String
}
// 2. Int型に対するShowインスタンスの定義 (given)
given Show[Int] with {
  def show(value: Int): String = value.toString
}
// 3. String型に対するShowインスタンスの定義 (given)
given Show[String] with {
  def show(value: String): String = s""""$value"""" // 文字列は引用符で囲む
}
...
```

- `given Show[Int]` のようにすれば名前を省略できます。

---
<!-- トーク内容 -->
`given`インスタンスを定義する際に、インスタンス名を省略して`given Show[Int]`のように書くこともよくあります。この場合でも、コンパイラは型情報をもとに適切なインスタンスを自動で解決してくれます。

---

## given/usingを使った新しい型クラスの作り方

- `Boolean`型に対する `Show` インスタンスを使って定義します。

```scala
given Show[Boolean] with {
  def show(value: Boolean): String = value match {
    case true => "True"
    case false => "False"
  }
}

display(true) // True
display(false) // False
```

---
<!-- トーク内容 -->
`Show`型クラスに対して、新しく`Boolean`型のためのインスタンスを定義してみましょう。`Boolean`の値に応じて"True"または"False"という文字列を返すように実装します。このように、既存の型クラスに対して、後から新しい型のためのインスタンスを追加していくことができます。これが型クラスの柔軟性の一つです。

---

## 型クラスの別の例: Monoid

`Monoid` は、ある型 `A` に対して、以下の2つの条件を満たす操作を定義する型クラスです。

1.  **結合律 (Associativity):** `(a combine b) combine c` は `a combine (b combine c)` と等しい。
2.  **単位元 (Identity Element):** ある特別な要素 `empty` が存在し、`a combine empty` も `empty combine a` も `a` と等しい。

数値の加算 (`+`) と `0`、文字列の結合 (`++`) と `""`、リストの連結 (`++`) と `Nil` などが Monoid の例です。

---
<!-- トーク内容 -->
型クラスの別の例として、`Monoid`というものがあります。`Monoid`は、ある型に対して「要素を組み合わせる操作（combine）」と「何と組み合わせても元の要素が変わらない特別な要素（empty）」という2つの条件を満たす操作を定義する型クラスです。例えば、数値の足し算における`+`と`0`、文字列の結合における`++`と`""`などが`Monoid`の例として挙げられます。

---

## 演習：Monoid型クラスのインスタンス定義（10分）

- `Monoid` 型クラスに対して、`given` インスタンスを定義してみましょう。
  - [Scastieへのリンク](https://scastie.scala-lang.org/IVVbCVJVQUujKtbxvxWhxQ)

```scala
trait Monoid[A] {
  def combine(x: A, y: A): A // 要素を組み合わせる操作
  def empty: A // 単位元
}
given Monoid[Int] with {
  def combine(x: Int, y: Int): Int = ???
  def empty: Int = ???
}
given Monoid[String] with {
  def combine(x: String, y: String): String = ???
  def empty: String = ???
}
given Monoid[List[A]] with {
  def combine(x: List[A], y: List[A]): List[A] = ???
  def empty: List[A] = ???
}
```

---
<!-- トーク内容 -->
それでは、2つ目の演習です。`Monoid`型クラスに対して、`Int`型、`String`型、そして任意の型のリスト`List[A]`のための`given`インスタンスを定義してみましょう。それぞれの型にとっての`combine`操作と`empty`要素は何になるかを考えて実装してみてください。こちらも10分程度時間を取ります。

---

## 演習：Monoid型クラスのインスタンス定義（回答）

```scala
trait Monoid[A] {
  def combine(x: A, y: A): A // 要素を組み合わせる操作
  def empty: A // 単位元
}
given Monoid[Int] with {
  def combine(x: Int, y: Int): Int = x + y
  def empty: Int = 0
}
given Monoid[String] with {
  def combine(x: String, y: String): String = x + y
  def empty: String = "" // Stringの単位元は空文字列
}
given Monoid[List[A]] with {
  def combine(x: List[A], y: List[A]): List[A] = x ++ y
  def empty: List[A] = Nil
}
```

---
<!-- トーク内容 -->
こちらが`Monoid`型クラスのインスタンス定義の回答例です。`Int`の場合は足し算と0、`String`の場合は文字列結合と空文字列、`List[A]`の場合はリストの連結と空リスト（`Nil`）がそれぞれ`combine`と`empty`に対応します。`String`の`empty`が抜けていましたね、正しくは空文字列`""`になります。失礼しました。（※ここで回答例のコードを修正する）

---

## Monoid型クラスの利用とusing

```scala
// Monoid[A] が利用可能であれば、List[A] を畳み込める関数
def combineAll[A](list: List[A])(using m: Monoid[A]): A = {
  list.foldLeft(m.empty)(m.combine) // foldLeftを使って畳み込む
}
// List[Int]を畳み込む (合計)
val numbers = List(1, 2, 3, 4, 5)
println(s"Sum: ${combineAll(numbers)}") // Sum: 15

// List[String]を畳み込む (結合)
val words = List("Hello", ", ", "World", "!")
println(s"Combined words: ${combineAll(words)}") // Hello, World!

// List[Int]のリストを畳み込む (連結)
val listOfLists = List(List(1, 2), List(3), List(4, 5))
println(s"lists: ${combineAll(listOfLists)}")
// 出力: Combined lists: List(1, 2, 3, 4, 5)
```

---
<!-- トーク内容 -->
`Monoid`型クラスのインスタンスを定義すると、その型に対して`Monoid`の操作を利用できるようになります。例えば、`List`の要素を`Monoid`の操作を使って一つにまとめる`combineAll`関数を定義できます。この関数は`using m: Monoid[A]`という引数を取ることで、「型`A`に対する`Monoid`インスタンスが必要である」ことを示しています。`combineAll(numbers)`のように呼び出すと、コンパイラは`List[Int]`の要素型である`Int`に対する`given Monoid[Int]`インスタンスを自動で見つけてきて、それを使ってリストの要素を合計してくれます。同様に、`List[String]`の場合は文字列が結合され、`List[List[Int]]`の場合はリストが連結されます。このように、型クラスを使うことで、異なる型に対して共通の操作を抽象化し、再利用性の高いコードを書くことができます。

---

## まとめ: 体験したこと ✨

今日体験した機能はScalaの魅力のほんの一部です。

* **堅牢性:** 型システムや `Either` などが、バグを未然に防ぎ、信頼性の高いコードを書く助けになる。
* **表現力:** `opaque type` や `for` 式のように、プログラマの意図をコードで明確に表現しやすい。
* **組み立てやすさ:** 小さな関数（バリデーション）や型（`Either`）を組み合わせて、安全で複雑な処理を構築できる（関数型プログラミングの考え方）。

皆さんのScalaへの興味を深めるきっかけになれば幸いです！

---
<!-- トーク内容 -->
本日の体験会を通して、Scalaの型安全性や関数型プログラミングの一端に触れていただきました。`opaque type`による値オブジェクト、`Either`を使ったエラーハンドリング、`for`式による関数合成、そして`given`/`using`を使った型クラスといった機能が、どのように堅牢で表現力豊か、そして組み立てやすいコードを書くのに役立つかを体験していただけたかと思います。これらはScalaの魅力のほんの一部ですが、皆さんがScalaにさらに興味を持つきっかけになれば嬉しいです。

---

## （任意）次のステップ

- **Scala公式サイト:**
  - Scala 3 Book: [https://docs.scala-lang.org/scala3/book/introduction.html](https://docs.scala-lang.org/scala3/book/introduction.html)
  -  Tour of Scala: [https://docs.scala-lang.org/tour/tour-of-scala.html](https://docs.scala-lang.org/tour/tour-of-scala.html)
- **オンライン学習:**
  - Scala Exercises: [https://www.scala-exercises.org/](https://www.scala-exercises.org/)
- **Scastieで色々試してみる！**
  - [https://scastie.scala-lang.org/](https://scastie.scala-lang.org/)

---
<!-- トーク内容 -->
もし今日の内容でScalaに興味を持たれた方は、ぜひこれらのリソースを活用して学習を続けてみてください。Scalaの公式サイトには豊富なドキュメントがありますし、Scala Exercisesのようなインタラクティブな学習サイトもあります。そして何より、Scastieを使って色々なコードを試してみるのが一番の近道だと思います。

---

## 実際のコードを見てみましょう

---
<!-- トーク内容 -->
（※このスライドは、もし実際のプロダクションコードを見せる時間があれば使う想定です。今回は時間の都合上スキップするかもしれません。）

---

## 質疑応答

---
<!-- トーク内容 -->
これで本日のコンテンツは終了です。何か質問があれば、遠慮なく聞いてください。Scalaのことでも、ネクストビートのことでも構いません。
