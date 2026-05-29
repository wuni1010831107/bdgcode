-- Template: ClickHouse table creation
-- Variables: {table_name}, {columns}, {engine}

CREATE TABLE IF NOT EXISTS {table_name} (
    {columns}
) ENGINE = {engine}()
ORDER BY tuple()
SETTINGS index_granularity = 8192;
