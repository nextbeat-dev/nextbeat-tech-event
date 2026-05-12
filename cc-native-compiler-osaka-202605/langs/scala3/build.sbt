ThisBuild / scalaVersion := "3.5.0"
ThisBuild / version      := "0.1.0"

lazy val root = (project in file("."))
  .settings(
    name := "nblang",
    Compile / mainClass := Some("nblang.Main"),
  )
