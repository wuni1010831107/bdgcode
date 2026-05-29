# 表命名规范

## 格式
```
{layer}_{domain}_{subject}_{granularity}_{format}
```

## 层级前缀
- `ods_` — 原始数据层
- `dwd_` — 明细数据层
- `dws_` — 汇总数据层
- `ads_` — 应用数据层
- `dim_` — 维度表

## 示例
- `dwd_user_behavior_event_iceberg`
- `dws_user_daily_summary_iceberg`
- `dim_product_scd_iceberg`
- `ods_mysql_orders_iceberg`
