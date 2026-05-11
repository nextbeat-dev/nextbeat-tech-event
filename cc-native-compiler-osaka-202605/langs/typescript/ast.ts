// nb-lang AST. discriminated union (kind field) で網羅性チェックを効かせる。

export type Type =
  | { kind: "TInt" }
  | { kind: "TString" }
  | { kind: "TList"; elem: Type };

export function typeToString(t: Type): string {
  switch (t.kind) {
    case "TInt":    return "int";
    case "TString": return "string";
    case "TList":   return `list<${typeToString(t.elem)}>`;
  }
}

export type Expr =
  | { kind: "IntLit";  value: bigint }
  | { kind: "StrLit";  value: string }
  | { kind: "Var";     name: string }
  | { kind: "BinOp";   op: string; left: Expr; right: Expr }
  | { kind: "Neg";     inner: Expr }
  | { kind: "Call";    name: string; args: Expr[] }
  | { kind: "Index";   arr: Expr; idx: Expr }
  | { kind: "ListLit"; elems: Expr[] };

export type Stmt =
  | { kind: "ValDef";   name: string; declared: Type | null; init: Expr }
  | { kind: "VarDef";   name: string; declared: Type | null; init: Expr }
  | { kind: "Reassign"; name: string; value: Expr }
  | { kind: "If";       cond: Expr; thenBlk: Stmt[]; elseBlk: Stmt[] }
  | { kind: "While";    cond: Expr; body: Stmt[] }
  | { kind: "Print";    value: Expr }
  | { kind: "Return";   value: Expr }
  | { kind: "ExprStmt"; value: Expr };

export type Param = { name: string; ty: Type };

export type FunDef = {
  name: string;
  params: Param[];
  retType: Type;
  body: Stmt[];
};

export type Program = {
  funcs: FunDef[];
  topStmts: Stmt[];
};
