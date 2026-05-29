import * as path from 'path';
import { KnowledgeLoader, KnowledgeItem } from '../knowledge/loader';
import { Session } from './session';

export interface DataSourceInfo {
  name: string;
  type: string;
  tables: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface TableInfo {
  name: string;
  layer: string;
  columns: ColumnInfo[];
  partitionBy?: string;
}

export interface UserPreferences {
  preferredLayer: string;
  namingConvention: string;
  defaultCatalog: string;
}

export interface ProjectContext {
  projectPath: string;
  dataSources: DataSourceInfo[];
  existingTables: TableInfo[];
  userPreferences: UserPreferences;
}

export class Memory {
  private knowledge: KnowledgeLoader;
  private context: ProjectContext;
  private maxContextMessages: number = 20;

  constructor(knowledgePath: string, projectPath: string) {
    this.knowledge = new KnowledgeLoader(knowledgePath);
    this.context = {
      projectPath,
      dataSources: [],
      existingTables: [],
      userPreferences: {
        preferredLayer: 'dwd',
        namingConvention: '{layer}_{domain}_{subject}_{granularity}',
        defaultCatalog: 'iceberg'
      }
    };
  }

  getContext(): ProjectContext {
    return this.context;
  }

  addDataSource(source: DataSourceInfo): void {
    this.context.dataSources.push(source);
  }

  addTable(table: TableInfo): void {
    this.context.existingTables.push(table);
  }

  getRelevantKnowledge(query: string): string {
    const results = this.knowledge.search(query);
    if (results.length === 0) return '';

    return results.slice(0, 3).map((r: KnowledgeItem) => `## ${r.name}\n${r.content}`).join('\n\n');
  }

  trimMessages(messages: Session['messages']): Session['messages'] {
    if (messages.length <= this.maxContextMessages) {
      return messages;
    }
    return messages.slice(-this.maxContextMessages);
  }

  getKnowledgeForTask(taskType: string): string {
    const categoryMap: Record<string, string> = {
      'iceberg-create': 'sql-patterns',
      'cdc-sync': 'sql-patterns',
      'security-scan': 'security',
      'clickhouse-sync': 'sql-patterns'
    };

    const category = categoryMap[taskType];
    if (!category) return '';

    const keyword = taskType.split('-')[0];
    const items = this.knowledge.loadCategory(category).filter((item: KnowledgeItem) =>
      path.basename(item.name, path.extname(item.name)).includes(keyword)
    );
    return items.slice(0, 2).map((item: KnowledgeItem) => item.content).join('\n\n');
  }
}
