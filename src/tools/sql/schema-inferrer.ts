export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface InferredSchema {
  columns: ColumnInfo[];
  primaryKey: string;
}

export class SchemaInferrer {
  private splitColumns(body: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';

    for (const ch of body) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current);
    return parts;
  }
  inferFromDDL(ddl: string): InferredSchema {
    const columns: ColumnInfo[] = [];
    let primaryKey = '';

    const columnMatch = ddl.match(/CREATE\s+TABLE\s+\w+\s*\(([\s\S]+)\)/i);
    if (!columnMatch) return { columns, primaryKey: '' };

    const body = columnMatch[1];

    const pkMatch = body.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
    if (pkMatch) primaryKey = pkMatch[1].trim();

    const parts = this.splitColumns(body);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed || trimmed.toUpperCase().startsWith('PRIMARY KEY')) continue;

      const colMatch = trimmed.match(/^`?(\w+)`?\s+(\w+(?:\([^)]*\))?)(.*)$/i);
      if (!colMatch) continue;

      const [, name, type, rest] = colMatch;
      const nullable = !rest.toUpperCase().includes('NOT NULL');
      columns.push({ name, type: this.normalizeType(type), nullable });
    }

    return { columns, primaryKey };
  }

  private normalizeType(type: string): string {
    const baseType = type.toUpperCase().split('(')[0].trim();
    const params = type.match(/\(([^)]+)\)/)?.[1] || '';
    const map: Record<string, string> = {
      'INT': 'INT', 'INTEGER': 'INT', 'BIGINT': 'BIGINT', 'SMALLINT': 'SMALLINT',
      'TINYINT': 'TINYINT',
      'VARCHAR': 'STRING', 'TEXT': 'STRING', 'CHAR': 'STRING',
      'DOUBLE': 'DOUBLE', 'FLOAT': 'FLOAT',
      'DECIMAL': 'DECIMAL', 'NUMERIC': 'DECIMAL',
      'BOOLEAN': 'BOOLEAN', 'BOOL': 'BOOLEAN',
      'TIMESTAMP': 'TIMESTAMP(3)', 'DATETIME': 'TIMESTAMP(3)',
      'DATE': 'DATE',
      'BINARY': 'BYTES', 'VARBINARY': 'BYTES',
      'ARRAY': 'ARRAY', 'MAP': 'MAP', 'ROW': 'ROW'
    };
    const mapped = map[baseType] || baseType;
    if (params && (mapped === 'DECIMAL' || mapped === 'TIMESTAMP(3)')) {
      return mapped.includes('(') ? mapped : `${mapped}(${params})`;
    }
    return mapped;
  }

  toDDL(schema: InferredSchema, tableName: string, engine: 'iceberg' | 'clickhouse'): string {
    if (engine === 'iceberg') {
      const colDefs = schema.columns.map(c =>
        `    ${c.name} ${c.type}${c.nullable ? '' : ' NOT NULL'}`
      ).join(',\n');
      return `CREATE TABLE ${tableName} (
${colDefs}
) USING iceberg;`;
    } else {
      const colDefs = schema.columns.map(c =>
        `    ${c.name} ${c.type}`
      ).join(',\n');
      return `CREATE TABLE ${tableName} (
${colDefs}
) ENGINE = MergeTree()
ORDER BY tuple();`;
    }
  }
}
