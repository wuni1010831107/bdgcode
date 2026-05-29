-- Template: Real-time window aggregation
-- Variables: {source_table}, {target_table}, {group_by_columns}, {time_column}, {window_size}, {value_column}, {warehouse}

CREATE TABLE {target_table} (
    {group_by_columns}
    , window_start TIMESTAMP(3)
    , window_end TIMESTAMP(3)
    , cnt BIGINT
    , sum_val DOUBLE
) WITH (
    'connector' = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse' = '{warehouse}'
);

INSERT INTO {target_table}
SELECT
    {group_by_columns},
    window_start,
    window_end,
    COUNT(*) AS cnt,
    SUM({value_column}) AS sum_val
FROM TABLE(
    TUMBLE(
        TABLE {source_table},
        DESCRIPTOR({time_column}),
        INTERVAL '{window_size}'
    )
)
GROUP BY
    {group_by_columns},
    window_start,
    window_end;
