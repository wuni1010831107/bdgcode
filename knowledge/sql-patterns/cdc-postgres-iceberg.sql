-- Template: Flink CDC PostgreSQL → Iceberg
-- Variables: {pg_host}, {pg_port}, {pg_user}, {pg_password},
--            {pg_database}, {source_table}, {iceberg_catalog},
--            {warehouse}, {target_table}, {primary_key}

CREATE TABLE {target_table} (
    {columns}
    , PRIMARY KEY ({primary_key}) NOT ENFORCED
) WITH (
    'connector' = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse' = '{warehouse}',
    'write.parquet.compression-codec' = 'snappy'
);

CREATE TABLE pg_source (
    {columns}
    , PRIMARY KEY ({primary_key}) NOT ENFORCED
) WITH (
    'connector' = 'postgres-cdc',
    'hostname' = '{pg_host}',
    'port' = '{pg_port}',
    'username' = '{pg_user}',
    'password' = '{pg_password}',
    'database-name' = '{pg_database}',
    'schema-name' = 'public',
    'table-name' = '{source_table}',
    'debezium.slot.name' = 'datadev_slot',
    'debezium.publication.name' = 'datadev_pub'
);

INSERT INTO {target_table} SELECT * FROM pg_source;
