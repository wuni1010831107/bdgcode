-- Template: Real-time deduplication
-- Variables: {source_table}, {target_table}, {key_column}, {time_column}, {warehouse}

CREATE TABLE {target_table} (
    {columns}
    , PRIMARY KEY ({key_column}) NOT ENFORCED
) WITH (
    'connector' = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse' = '{warehouse}'
);

INSERT INTO {target_table}
SELECT *
FROM (
    SELECT *,
        ROW_NUMBER() OVER (
            PARTITION BY {key_column}
            ORDER BY {time_column} DESC
        ) AS rn
    FROM {source_table}
)
WHERE rn = 1;
