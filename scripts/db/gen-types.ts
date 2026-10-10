/**
 * Database type generator and Questionnaire catalog generator.
 *
 * Connects to the local PostgreSQL database, introspects tables, views, enums,
 * and questionnaire definitions, and generates:
 *  1. `src/lib/db/database.types.ts` (Supabase-compatible type definitions)
 *  2. `src/lib/questionnaire/catalog.generated.ts` (Questionnaire catalog & option map)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";
import { connect } from "./migrate";
import { withServer } from "./server";

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  udt_name: string;
  is_nullable: string;
  column_default: string | null;
  is_identity?: string;
}

interface EnumInfo {
  typname: string;
  enumlabel: string;
}

interface TableInfo {
  table_name: string;
  table_type: string;
}

function pgTypeToTs(col: ColumnInfo, enums: Set<string>): string {
  const udt = col.udt_name;
  const isArray = col.data_type === "ARRAY" || udt.startsWith("_");
  const baseUdt = isArray && udt.startsWith("_") ? udt.slice(1) : udt;

  let tsType = "string";
  if (enums.has(baseUdt)) {
    tsType = `Database["public"]["Enums"]["${baseUdt}"]`;
  } else {
    switch (baseUdt) {
      case "int2":
      case "int4":
      case "int8":
      case "float4":
      case "float8":
      case "numeric":
        tsType = "number";
        break;
      case "bool":
        tsType = "boolean";
        break;
      case "json":
      case "jsonb":
        tsType = "Json";
        break;
      case "bytea":
        tsType = "string"; // Buffer or base64 hex representation
        break;
      case "uuid":
      case "text":
      case "varchar":
      case "char":
      case "bpchar":
      case "date":
      case "timestamptz":
      case "timestamp":
      default:
        tsType = "string";
        break;
    }
  }

  if (isArray) {
    tsType = `${tsType}[]`;
  }

  return tsType;
}

async function generateDatabaseTypes(c: pg.Client) {
  // Query enums
  const enumsRes = await c.query<EnumInfo>(`
    select t.typname, e.enumlabel
      from pg_type t
      join pg_enum e on t.oid = e.enumtypid
      join pg_namespace n on n.oid = t.typnamespace
     where n.nspname = 'public'
     order by t.typname, e.enumsortorder;
  `);

  const enumsMap: Record<string, string[]> = {};
  for (const row of enumsRes.rows) {
    if (!enumsMap[row.typname]) enumsMap[row.typname] = [];
    enumsMap[row.typname].push(row.enumlabel);
  }
  const enumNames = new Set(Object.keys(enumsMap));

  // Query tables and views
  const tablesRes = await c.query<TableInfo>(`
    select table_name, table_type
      from information_schema.tables
     where table_schema = 'public'
     order by table_name;
  `);

  const colsRes = await c.query<ColumnInfo>(`
    select table_name, column_name, data_type, udt_name, is_nullable, column_default, is_identity
      from information_schema.columns
     where table_schema = 'public'
     order by table_name, ordinal_position;
  `);

  const colsByTable: Record<string, ColumnInfo[]> = {};
  for (const col of colsRes.rows) {
    if (!colsByTable[col.table_name]) colsByTable[col.table_name] = [];
    colsByTable[col.table_name].push(col);
  }

  const tables: Record<string, ColumnInfo[]> = {};
  const views: Record<string, ColumnInfo[]> = {};

  for (const t of tablesRes.rows) {
    if (t.table_type === "BASE TABLE") {
      tables[t.table_name] = colsByTable[t.table_name] ?? [];
    } else if (t.table_type === "VIEW") {
      views[t.table_name] = colsByTable[t.table_name] ?? [];
    }
  }

  let code = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
`;

  for (const [tName, cols] of Object.entries(tables)) {
    code += `      ${tName}: {\n`;
    code += `        Row: {\n`;
    for (const col of cols) {
      const ts = pgTypeToTs(col, enumNames);
      const nullable = col.is_nullable === "YES" ? " | null" : "";
      code += `          ${col.column_name}: ${ts}${nullable};\n`;
    }
    code += `        };\n`;

    code += `        Insert: {\n`;
    for (const col of cols) {
      const ts = pgTypeToTs(col, enumNames);
      const optional =
        col.column_default !== null || col.is_nullable === "YES" || col.is_identity === "YES" ? "?" : "";
      const nullable = col.is_nullable === "YES" ? " | null" : "";
      code += `          ${col.column_name}${optional}: ${ts}${nullable};\n`;
    }
    code += `        };\n`;

    code += `        Update: {\n`;
    for (const col of cols) {
      const ts = pgTypeToTs(col, enumNames);
      const nullable = col.is_nullable === "YES" ? " | null" : "";
      code += `          ${col.column_name}?: ${ts}${nullable};\n`;
    }
    code += `        };\n`;
    code += `        Relationships: [];\n`;
    code += `      };\n`;
  }

  code += `    };\n    Views: {\n`;

  for (const [vName, cols] of Object.entries(views)) {
    code += `      ${vName}: {\n`;
    code += `        Row: {\n`;
    for (const col of cols) {
      const ts = pgTypeToTs(col, enumNames);
      const nullable = col.is_nullable === "YES" ? " | null" : "";
      code += `          ${col.column_name}: ${ts}${nullable};\n`;
    }
    code += `        };\n`;
    code += `        Relationships: [];\n`;
    code += `      };\n`;
  }

  code += `    };\n    Functions: {\n`;
  code += `      fn_can_view_user: {\n`;
  code += `        Args: { p_target: string };\n`;
  code += `        Returns: boolean;\n`;
  code += `      };\n`;
  code += `      fn_is_active_match_with: {\n`;
  code += `        Args: { p_other: string };\n`;
  code += `        Returns: boolean;\n`;
  code += `      };\n`;
  code += `      fn_conversation_access: {\n`;
  code += `        Args: { p_conversation: string; p_active_only?: boolean };\n`;
  code += `        Returns: boolean;\n`;
  code += `      };\n`;
  code += `      fn_is_admin: {\n`;
  code += `        Args: Record<PropertyKey, never>;\n`;
  code += `        Returns: boolean;\n`;
  code += `      };\n`;
  code += `      rpc_like_user: {\n`;
  code += `        Args: { p_target: string };\n`;
  code += `        Returns: Json;\n`;
  code += `      };\n`;
  code += `      rpc_pass_user: {\n`;
  code += `        Args: { p_target: string };\n`;
  code += `        Returns: Json;\n`;
  code += `      };\n`;
  code += `      rpc_record_profile_view: {\n`;
  code += `        Args: { p_target: string };\n`;
  code += `        Returns: void;\n`;
  code += `      };\n`;
  code += `      rpc_mark_read: {\n`;
  code += `        Args: { p_conversation: string };\n`;
  code += `        Returns: number;\n`;
  code += `      };\n`;
  code += `      rpc_get_room_address: {\n`;
  code += `        Args: { p_room: string };\n`;
  code += `        Returns: string | null;\n`;
  code += `      };\n`;
  code += `      rpc_review_verification: {\n`;
  code += `        Args: { p_record: string; p_approve: boolean; p_reason?: string };\n`;
  code += `        Returns: Json;\n`;
  code += `      };\n`;
  code += `    };\n    Enums: {\n`;

  for (const [eName, labels] of Object.entries(enumsMap)) {
    code += `      ${eName}: ${labels.map((l) => JSON.stringify(l)).join(" | ")};\n`;
  }

  code += `    };\n  };\n};\n`;

  const targetDir = path.resolve(process.cwd(), "src", "lib", "db");
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(path.join(targetDir, "database.types.ts"), code, "utf8");
  console.log("Generated src/lib/db/database.types.ts");
}

async function generateQuestionnaireCatalog(c: pg.Client) {
  const catRes = await c.query(`
    select id, code, name_vi, name_en, weight, sort_order
      from public.question_categories
     order by sort_order;
  `);

  const qRes = await c.query(`
    select id, number, category_id, code, type, text_vi, text_en, sort_order, is_required, is_public
      from public.questions
     order by number;
  `);

  const optRes = await c.query(`
    select id, question_id, value, code, label_vi, label_en, sort_order, allows_other, is_proposed_label
      from public.question_options
     order by question_id, sort_order;
  `);

  const optsByQ: Record<string, any[]> = {};
  for (const opt of optRes.rows) {
    if (!optsByQ[opt.question_id]) optsByQ[opt.question_id] = [];
    optsByQ[opt.question_id].push(opt);
  }

  const catalog = {
    categories: catRes.rows,
    questions: qRes.rows.map((q) => ({
      ...q,
      options: optsByQ[q.id] ?? [],
    })),
  };

  let code = `// GENERATED FILE - DO NOT EDIT MANUALLY
// Generated by scripts/db/gen-types.ts

export interface QuestionnaireCategory {
  id: string;
  code: string;
  name_vi: string;
  name_en: string | null;
  weight: number;
  sort_order: number;
}

export interface QuestionOption {
  id: string;
  question_id: string;
  value: number;
  code: string | null;
  label_vi: string;
  label_en: string | null;
  sort_order: number;
  allows_other: boolean;
  is_proposed_label: boolean;
}

export interface QuestionDefinition {
  id: string;
  number: number;
  category_id: string;
  code: string;
  type: "scale_1_5" | "single_choice" | "multi_choice";
  text_vi: string;
  text_en: string | null;
  sort_order: number;
  is_required: boolean;
  is_public: boolean;
  options: QuestionOption[];
}

export const QUESTIONNAIRE_CATEGORIES: QuestionnaireCategory[] = ${JSON.stringify(
    catRes.rows.map((c) => ({ ...c, weight: Number(c.weight) })),
    null,
    2,
  )};

export const QUESTIONNAIRE_QUESTIONS: QuestionDefinition[] = ${JSON.stringify(catalog.questions, null, 2)};

export const QUESTION_BY_NUMBER = new Map<number, QuestionDefinition>(
  QUESTIONNAIRE_QUESTIONS.map((q) => [q.number, q])
);

export const QUESTION_BY_CODE = new Map<string, QuestionDefinition>(
  QUESTIONNAIRE_QUESTIONS.map((q) => [q.code, q])
);

export const QUESTION_BY_ID = new Map<string, QuestionDefinition>(
  QUESTIONNAIRE_QUESTIONS.map((q) => [q.id, q])
);
`;

  const targetDir = path.resolve(process.cwd(), "src", "lib", "questionnaire");
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(path.join(targetDir, "catalog.generated.ts"), code, "utf8");
  console.log("Generated src/lib/questionnaire/catalog.generated.ts");
}

async function main() {
  await withServer(async () => {
    const c = await connect(process.env.ROOMIE_DB_NAME ?? "roomie");
    try {
      await generateDatabaseTypes(c);
      await generateQuestionnaireCatalog(c);
    } finally {
      await c.end();
    }
  });
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
