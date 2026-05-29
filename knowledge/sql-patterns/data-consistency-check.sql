-- Template: Data consistency check (CDC reconciliation)
-- Variables: {source_table}, {target_table}, {key_column}, {time_column}

-- Row count comparison
SELECT 'source' AS side, COUNT(*) AS cnt FROM {source_table}
UNION ALL
SELECT 'target' AS side, COUNT(*) AS cnt FROM {target_table};

-- Duplicate check on target
SELECT {key_column}, COUNT(*) AS cnt
FROM {target_table}
GROUP BY {key_column}
HAVING COUNT(*) > 1;

-- Time range coverage check
SELECT
    MIN({time_column}) AS min_ts,
    MAX({time_column}) AS max_ts,
    COUNT(*) AS total_rows
FROM {target_table};
