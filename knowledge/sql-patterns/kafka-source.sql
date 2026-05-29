-- Template: Flink Kafka Source
-- Variables: {topic}, {bootstrap_servers}, {target_table}, {columns}, {key_column}

CREATE TABLE {target_table} (
    {columns}
    , PRIMARY KEY ({key_column}) NOT ENFORCED
) WITH (
    'connector' = 'kafka',
    'topic' = '{topic}',
    'properties.bootstrap.servers' = '{bootstrap_servers}',
    'properties.group.id' = 'datadev-group',
    'scan.startup.mode' = 'latest-offset',
    'format' = 'json'
);
