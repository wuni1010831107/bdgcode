-- Template: Flink Kafka Sink
-- Variables: {topic}, {bootstrap_servers}, {source_table}, {key_column}, {columns}

CREATE TABLE kafka_sink (
    {columns}
    , PRIMARY KEY ({key_column}) NOT ENFORCED
) WITH (
    'connector' = 'kafka',
    'topic' = '{topic}',
    'properties.bootstrap.servers' = '{bootstrap_servers}',
    'format' = 'json',
    'sink.partition-keys' = '{key_column}',
    'sink.partition-key-selector' = 'proctime'
);

INSERT INTO kafka_sink SELECT * FROM {source_table};
