import { describe, it, expect } from 'vitest';
import { SQLGenerator } from '../../../src/tools/sql/generator';

describe('SQLGenerator', () => {
  const generator = new SQLGenerator();

  it('should generate Iceberg DDL', () => {
    const ddl = generator.generateIcebergDDL({
      catalog: 'iceberg',
      database: 'warehouse',
      layer: 'dwd',
      tableName: 'user_behavior_event',
      columns: [
        { name: 'user_id', type: 'STRING', nullable: false },
        { name: 'event_time', type: 'TIMESTAMP(3)', nullable: false },
        { name: 'event_name', type: 'STRING', nullable: true, description: 'Event type name' }
      ],
      partitionBy: 'days(event_time)'
    });

    expect(ddl).toContain('CREATE TABLE IF NOT EXISTS');
    expect(ddl).toContain('USING iceberg');
    expect(ddl).toContain('PARTITIONED BY (days(event_time))');
    expect(ddl).toContain('user_id STRING NOT NULL');
    expect(ddl).toContain('event_name STRING');
    expect(ddl).toContain('format-version');
  });

  it('should generate ClickHouse DDL', () => {
    const ddl = generator.generateClickHouseDDL(
      'dws_user_daily',
      [
        { name: 'user_id', type: 'String' },
        { name: 'event_count', type: 'UInt64' }
      ]
    );

    expect(ddl).toContain('ENGINE = MergeTree()');
    expect(ddl).toContain('dws_user_daily');
    expect(ddl).toContain('index_granularity = 8192');
  });

  it('should generate ClickHouse DDL with custom engine', () => {
    const ddl = generator.generateClickHouseDDL(
      'test_table',
      [{ name: 'id', type: 'UInt64' }],
      'ReplacingMergeTree'
    );

    expect(ddl).toContain('ENGINE = ReplacingMergeTree()');
  });

  it('should generate data quality queries', () => {
    const queries = generator.generateDataQualityQuery(
      'ods_source',
      'dwd_target',
      ['row_count', 'null_check', 'unique_check']
    );

    expect(queries).toHaveLength(3);
    expect(queries[0]).toContain('COUNT(*)');
    expect(queries[0]).toContain('ods_source');
    expect(queries[1]).toContain('null_count');
    expect(queries[2]).toContain('HAVING COUNT(*)');
  });

  it('should handle empty quality checks', () => {
    const queries = generator.generateDataQualityQuery('a', 'b', []);
    expect(queries).toHaveLength(0);
  });

  it('should generate column definitions', () => {
    const cols = generator.generateColumnDef([
      { name: 'id', type: 'STRING', nullable: false, description: 'Primary key' },
      { name: 'name', type: 'STRING', nullable: true }
    ]);
    expect(cols).toContain('id STRING NOT NULL');
    expect(cols).toContain("name STRING");
  });
});
