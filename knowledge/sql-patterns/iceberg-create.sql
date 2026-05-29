-- Template: Iceberg table creation with lakehouse layering
-- Variables: {catalog}, {database}, {layer}, {table_name}, {columns}, {partition_by}

CREATE TABLE IF NOT EXISTS {catalog}.{database}.{layer}_{table_name} (
    {columns}
)
USING iceberg
PARTITIONED BY ({partition_by})
OPTIONS (
    'format-version' = '2',
    'write.parquet.compression-codec' = 'snappy'
);
