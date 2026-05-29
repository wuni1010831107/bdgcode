import { describe, it, expect } from 'vitest';
import { SchemaInferrer } from '../../../src/tools/sql/schema-inferrer';

describe('SchemaInferrer', () => {
  const inferrer = new SchemaInferrer();

  it('should infer columns from CREATE TABLE DDL', () => {
    const ddl = `
      CREATE TABLE users (
        id INT NOT NULL,
        name VARCHAR(100),
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    const schema = inferrer.inferFromDDL(ddl);
    expect(schema.columns).toHaveLength(4);
    expect(schema.columns[0].name).toBe('id');
    expect(schema.columns[0].type).toBe('INT');
    expect(schema.columns[0].nullable).toBe(false);
    expect(schema.columns[2].name).toBe('email');
    expect(schema.columns[2].nullable).toBe(false);
  });

  it('should extract primary key', () => {
    const ddl = 'CREATE TABLE orders (order_id BIGINT NOT NULL, amount DECIMAL(10,2), PRIMARY KEY (order_id))';
    const schema = inferrer.inferFromDDL(ddl);
    expect(schema.primaryKey).toBe('order_id');
  });

  it('should handle DDL without primary key', () => {
    const ddl = 'CREATE TABLE log (msg STRING, ts TIMESTAMP)';
    const schema = inferrer.inferFromDDL(ddl);
    expect(schema.primaryKey).toBe('');
  });

  it('should normalize types to Flink SQL types', () => {
    const ddl = 'CREATE TABLE t (id INT, name VARCHAR(100), price DECIMAL(10,2), active BOOLEAN, ts TIMESTAMP)';
    const schema = inferrer.inferFromDDL(ddl);
    const types = schema.columns.map(c => c.type);
    expect(types).toEqual(['INT', 'STRING', 'DECIMAL(10,2)', 'BOOLEAN', 'TIMESTAMP(3)']);
  });

  it('should return empty schema for invalid input', () => {
    const schema = inferrer.inferFromDDL('SELECT * FROM users');
    expect(schema.columns).toHaveLength(0);
    expect(schema.primaryKey).toBe('');
  });

  it('should generate Iceberg DDL from inferred schema', () => {
    const schema = { columns: [{ name: 'id', type: 'INT', nullable: false }, { name: 'name', type: 'STRING', nullable: true }], primaryKey: 'id' };
    const ddl = inferrer.toDDL(schema, 'test_table', 'iceberg');
    expect(ddl).toContain('USING iceberg');
    expect(ddl).toContain('id INT NOT NULL');
    expect(ddl).toContain('name STRING');
  });

  it('should generate ClickHouse DDL from inferred schema', () => {
    const schema = { columns: [{ name: 'id', type: 'Int32', nullable: false }, { name: 'name', type: 'String', nullable: true }], primaryKey: 'id' };
    const ddl = inferrer.toDDL(schema, 'test_table', 'clickhouse');
    expect(ddl).toContain('ENGINE = MergeTree');
    expect(ddl).toContain('id Int32');
    expect(ddl).toContain('name String');
  });
});
