# 湖仓分层规范

## ODS (Operational Data Store) — 原始数据层
- 直接接收源系统数据，不做转换
- 保留原始字段和原始类型
- 分区策略：按数据来源 + 日期
- 保留策略：180 天

## DWD (Data Warehouse Detail) — 明细数据层
- 数据清洗：去重、去空、格式标准化
- 维度关联：关联 dim 表补充业务含义
- 字段命名： snake_case，业务语义清晰
- 分区策略：按业务日期分区

## DWS (Data Warehouse Summary) — 汇总数据层
- 按维度聚合的汇总表
- 常用维度预聚合，加速查询
- 粒度：按业务需求定义
- 保留策略：长期保留

## ADS (Application Data Store) — 应用数据层
- 面向具体业务场景的宽表
- 直接支撑报表/API/算法
- 高度定制化，与业务强耦合

## DIM (Dimension) — 维度表
- 缓慢变化维（SCD）管理
- 包含维度属性的全量历史
- 主键唯一，变更留痕
