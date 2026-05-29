# DataDev Agent — 使用说明

> 版本：v0.1.0  
> 日期：2026-05-29

---

## 1. 简介

DataDev Agent 是一个面向数据工程师的 CLI 智能助手，通过自然语言对话帮你完成湖仓开发、SQL 生成、安全扫描等数据工程任务。

## 2. 环境要求

- **Node.js** >= 18.x
- **Anthropic API Key**（Claude API）
- **Java 8+**（如需执行生成的 Spark SQL）
- **Spark / Flink / ClickHouse**（目标执行环境，Agent 生成代码后由你自行执行）

## 3. 安装

```bash
cd datadev-agent
npm install
```

## 4. 配置

复制示例配置文件并编辑：

```bash
cp datadev-config.yaml.example datadev-config.yaml
```

```yaml
# datadev-config.yaml
llm:
  provider: anthropic        # anthropic | openai | local
  api_key: sk-ant-xxx        # 你的 Anthropic API Key
  model: claude-sonnet-4-6

telemetry:
  enabled: true              # 是否采集使用数据（仅本地存储）

security:
  sensitive_patterns_path: knowledge/security/sensitive-patterns.json
  masking_enabled: true
  audit_log_path: ~/.datadev-agent/audit.log

knowledge_path: knowledge
```

环境变量方式：

```bash
export ANTHROPIC_API_KEY=sk-ant-xxx
```

## 5. 启动

```bash
npm run dev
```

启动后你会看到：

```
🚀 DataDev Agent Ready

Type your data engineering task, or /help for commands

datadev>
```

## 6. 基本使用

### 6.1 生成 Iceberg 建表 SQL

```
datadev> 创建一个 DWD 层的用户行为事件表，包含 user_id, event_time, event_name 字段，按 event_time 分区
```

Agent 会：
1. 调用 LLM 分析你的需求
2. 生成 Iceberg DDL
3. 将 SQL 文件写入当前目录
4. 显示生成的 SQL 内容

输出示例：
```
Generated Iceberg DDL for dwd_user_behavior_event:

CREATE TABLE IF NOT EXISTS iceberg.warehouse.dwd_user_behavior_event (
    user_id STRING NOT NULL,
    event_time TIMESTAMP(3) NOT NULL,
    event_name STRING
)
USING iceberg
PARTITIONED BY (days(event_time))
OPTIONS (
    'format-version' = '2',
    'write.parquet.compression-codec' = 'snappy'
);

Saved to: /your/project/dwd_user_behavior_event_iceberg.sql
```

### 6.2 生成 ClickHouse 建表 SQL

```
datadev> 在 ClickHouse 中创建一张 DWS 层的用户日汇总表，包含 user_id String, event_count UInt64, dt Date
```

### 6.3 安全扫描

```
datadev> /security users
```

对指定表扫描敏感字段（手机号、身份证、邮箱、银行卡等），输出风险等级和脱敏建议。

### 6.4 查看统计

```
datadev> /stats
```

查看 Agent 使用统计（会话数、任务数、工具调用数）。

### 6.5 通用数据任务

直接用自然语言描述需求：

```
datadev> 把 MySQL 的 orders 表通过 CDC 同步到 Iceberg ODS 层
datadev> 生成 Flink CDC 作业代码，从 MySQL 同步 user 表到 Iceberg
datadev> 写一个数据质量校验 SQL，对比 ODS 和 DWD 的行数
datadev> 生成 Airflow DAG，每天凌晨同步用户数据
```

## 7. 斜杠命令

| 命令 | 说明 | 示例 |
|-----|------|------|
| `/help` | 显示帮助信息 | `/help` |
| `/sql <任务描述>` | 生成 SQL（等同于直接输入任务） | `/sql 创建用户行为宽表` |
| `/security <表名>` | 扫描敏感数据 | `/security user_profile` |
| `/stats` | 查看使用统计 | `/stats` |
| `/exit` 或 `/quit` | 退出 Agent | `/exit` |

## 8. 工作流程

典型的数据开发工作流：

```
1. 建表 →  "创建 Iceberg 用户行为表"        → 生成 DDL → 写入文件 → 你在 Spark 中执行
2. ETL  →  "写 Spark SQL 关联 dim_user"      → 生成 SQL → 写入文件 → 你在 Spark 中执行
3. 同步 →  "生成 ClickHouse 建表 + 同步 SQL"  → 生成 DDL + INSERT → 执行
4. 扫描 →  "/security users"                 → 敏感字段报告 → 脱敏建议
5. 调度 →  "生成 Airflow DAG 串联以上任务"    → 生成 Python DAG 文件
```

## 9. 知识库

Agent 内置知识库位于 `knowledge/` 目录：

```
knowledge/
├── sql-patterns/          # SQL 模板
│   ├── iceberg-create.sql
│   ├── cdc-sync.sql
│   ├── clickhouse-ddl.sql
│   └── lakehouse-to-olap.sql
├── security/              # 安全规则
│   └── sensitive-patterns.json
├── errors/                # 错误手册
│   └── spark-errors.json
├── standards/             # 规范
│   ├── naming-convention.md
│   └── layering-rules.md
└── prompts/               # Prompt 策略
    └── planner.md
```

你可以根据需要扩展这些模板和规则。

## 10. 自观测数据

Agent 使用过程中会采集匿名化的使用数据，存储在：

```
~/.datadev-agent/
├── sessions/              # 会话记录
├── telemetry/             # 使用统计
│   ├── sessions.jsonl
│   ├── tool-calls.jsonl
│   └── task-outcomes.jsonl
└── audit.log              # 操作审计日志
```

这些数据仅用于改进 Agent 质量，不会上传到任何服务器。

## 11. 数据安全

- Agent 生成的 SQL 在写入文件前会进行基本的标识符转义
- 涉及敏感数据的操作会触发安全扫描提醒
- 所有文件写入受限于当前工作目录（防止路径遍历）
- 操作审计日志记录所有生成和扫描操作

## 12. 故障排查

### API 调用失败

```
❌ Error: API rate limit exceeded
```

- 检查 Anthropic API Key 是否有效
- 检查网络连接
- 稍后重试

### 知识库找不到

确认 `knowledge/` 目录存在且包含模板文件。Agent 会在配置的 `knowledge_path` 下搜索。

### 文件未生成

确认当前目录有写入权限。生成的 SQL 文件默认保存在当前工作目录。

## 13. 开发

```bash
# 运行测试
npm test

# 构建
npm run build

# 开发模式（带热重载）
npm run dev
```

## 14. 项目结构

```
datadev-agent/
├── src/
│   ├── cli/              REPL + 入口
│   ├── agent/            Session + Memory + Planner + Executor + Telemetry
│   ├── llm/              LLM Provider 抽象层
│   ├── tools/            SQL Generator + Security Scanner + File Tools + MCP Client
│   ├── knowledge/        KnowledgeLoader
│   └── config/           配置管理
├── knowledge/            内置知识库
├── mcp-servers/          内置 MCP Servers
├── tests/                测试套件
└── package.json
```
