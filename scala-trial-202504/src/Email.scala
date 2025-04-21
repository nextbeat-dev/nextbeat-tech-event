// --[ Email オブジェクトの定義 ]-----------------------------------------------
object Email {
  opaque type Email = String

  // --- バリデーション関数 ---
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

// --[ Email.from による値の生成 ]----------------------------------------------
import Email.* // Email オブジェクトの中身を使えるようにする

val validEmailResult   = Email.from("test@example.com")
val emptyEmailResult   = Email.from("")
val noAtMarkResult     = Email.from("testexample.com")
val emptyThenNoAtMark  = Email.from("   ") // 空白のみ

println("Email.from の結果:")
println(s"Valid: $validEmailResult")
println(s"Empty: $emptyEmailResult")
println(s"No '@': $noAtMarkResult")
println(s"Empty then No '@': $emptyThenNoAtMark")

// --[ Email 型の値を使う ]-----------------------------------------------------
def sendEmail(email: Email, subject: String): Unit = {
  // Email.from によってバリデーション済みであることが保証されている！
  println(s"$email にメールを送信します。件名: $subject")
}

// こんな呼び出し方はできない！
// sendEmail("これはメールアドレスじゃない", "テスト")
// sendEmail("", "件名")
// sendEmail("user@domain.com", "user-name") // 引数の順番ミスにも気づける

val invalidEmailResult = Email.from("invalid-email")

println("\nUsing match:")

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
