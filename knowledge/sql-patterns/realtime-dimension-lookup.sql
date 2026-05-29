-- Template: Real-time dimension lookup join
-- Variables: {fact_table}, {dim_table}, {lookup_keys}, {fact_columns}, {dim_columns}, {dim_key}, {join_condition}, {warehouse}

CREATE TABLE enriched_{fact_table} (
    {enriched_columns}
) WITH (
    'connector' = 'iceberg',
    'catalog-type' = 'hadoop',
    'warehouse' = '{warehouse}'
);

INSERT INTO enriched_{fact_table}
SELECT
    f.*,
    d.* EXCEPT ({dim_key})
FROM {fact_table} AS f
LEFT JOIN {dim_table} FOR SYSTEM_TIME AS OF f.proctime AS d
ON {join_condition};
