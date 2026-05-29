-- Template: Flink CDC MySQL → Iceberg
-- Variables: {mysql_host}, {mysql_port}, {mysql_user}, {mysql_password},
--            {mysql_database}, {source_table}, {iceberg_catalog},
--            {warehouse}, {target_table}, {partition_by}, {primary_key}

CREATE TABLE {target_table} (
    {columns}
    , PRIMARY KEY ({primary_key}) NOT ENFORCED
) WITH (
    'connector' = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse' = '{warehouse}',
    'write.parquet.compression-codec' = 'snappy'
);

CREATE TABLE mysql_source (
    {columns}
    , PRIMARY KEY ({primary_key}) NOT ENFORCED
) WITH (
    'connector' = 'mysql-cdc',
    'hostname' = '{mysql_host}',
    'port' = '{mysql_port}',
    'username' = '{mysql_user}',
    'password' = '{mysql_password}',
    'database-name' = '{mysql_database}',
    'table-name' = '{source_table}',
    'server-time-zone' = 'Asia/Shanghai'
);

INSERT INTO {target_table} SELECT * FROM mysql_source;
