-- Template: CDC sync from MySQL to Iceberg using Flink
-- Variables: {mysql_host}, {mysql_user}, {mysql_password}, {mysql_database}, {source_table}, {iceberg_catalog}, {target_table}

CREATE TABLE iceberg_target (
    id STRING,
    name STRING,
    event_time TIMESTAMP(3),
    PRIMARY KEY (id) NOT ENFORCED
) WITH (
    'connector' = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse' = '{iceberg_catalog}'
);

CREATE TABLE mysql_source (
    id STRING,
    name STRING,
    event_time TIMESTAMP(3),
    PRIMARY KEY (id) NOT ENFORCED
) WITH (
    'connector' = 'mysql-cdc',
    'hostname' = '{mysql_host}',
    'port' = '3306',
    'username' = '{mysql_user}',
    'password' = '{mysql_password}',
    'database-name' = '{mysql_database}',
    'table-name' = '{source_table}'
);

INSERT INTO iceberg_target SELECT * FROM mysql_source;
