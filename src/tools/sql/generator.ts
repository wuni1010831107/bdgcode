export interface ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
  description?: string;
}

export interface IcebergTableOptions {
  catalog: string;
  database: string;
  layer: string;
  tableName: string;
  columns: ColumnDef[];
  partitionBy?: string;
  sortBy?: string;
}

export class SQLGenerator {
  generateIcebergDDL(options: IcebergTableOptions): string {
    const columns = options.columns.map(col => {
      const nullable = col.nullable === false ? ' NOT NULL' : '';
      return `    ${col.name} ${col.type}${nullable}`;
    }).join(',\n');

    const partitionBy = options.partitionBy ? `\nPARTITIONED BY (${options.partitionBy})` : '';
    const sortBy = options.sortBy ? `\nOPTIONS ('sort-order' = '${options.sortBy}')` : '';

    return `CREATE TABLE IF NOT EXISTS ${options.catalog}.${options.database}.${options.layer}_${options.tableName} (
${columns}
)
USING iceberg${partitionBy}${sortBy}
OPTIONS (
    'format-version' = '2',
    'write.parquet.compression-codec' = 'snappy'
);`;
  }

  generateClickHouseDDL(tableName: string, columns: ColumnDef[], engine: string = 'MergeTree'): string {
    const cols = columns.map(col => `    ${col.name} ${col.type}`).join(',\n');

    return `CREATE TABLE IF NOT EXISTS ${tableName} (
${cols}
) ENGINE = ${engine}()
ORDER BY tuple()
SETTINGS index_granularity = 8192;`;
  }

  generateDataQualityQuery(sourceTable: string, targetTable: string, checks: string[]): string[] {
    const queries: string[] = [];

    for (const check of checks) {
      switch (check) {
        case 'row_count':
          queries.push(`-- Row count comparison\nSELECT '${sourceTable}' as source, COUNT(*) as cnt FROM ${sourceTable}\nUNION ALL\nSELECT '${targetTable}' as source, COUNT(*) as cnt FROM ${targetTable};`);
          break;
        case 'null_check':
          queries.push(`-- Null value check on key columns\nSELECT '${targetTable}' as table_name, COUNT(*) as null_count\nFROM ${targetTable}\nWHERE user_id IS NULL OR event_time IS NULL;`);
          break;
        case 'unique_check':
          queries.push(`-- Uniqueness check on business key\nSELECT user_id, dt, COUNT(*) as cnt\nFROM ${targetTable}\nGROUP BY user_id, dt\nHAVING COUNT(*) > 1;`);
          break;
      }
    }

    return queries;
  }

  generateColumnDef(columns: ColumnDef[]): string {
    return columns.map(col => {
      const nullable = col.nullable === false ? ' NOT NULL' : '';
      const comment = col.description ? ` COMMENT '${col.description}'` : '';
      return `    ${col.name} ${col.type}${nullable}${comment}`;
    }).join(',\n');
  }
}
