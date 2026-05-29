-- Template: Sync data from Iceberg to ClickHouse
-- Variables: {iceberg_table}, {clickhouse_table}, {columns}

INSERT INTO {clickhouse_table} ({columns})
SELECT {columns}
FROM iceberg.{database}.{iceberg_table}
WHERE dt >= '{{yesterday}}';
