import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeItem {
  name: string;
  category: string;
  content: string;
  metadata: Record<string, any>;
}

export class KnowledgeLoader {
  private basePath: string;
  private cache: Map<string, KnowledgeItem[]> = new Map();

  constructor(knowledgePath: string) {
    this.basePath = path.resolve(knowledgePath);
  }

  loadCategory(category: string): KnowledgeItem[] {
    if (this.cache.has(category)) {
      return this.cache.get(category)!;
    }

    const categoryPath = path.join(this.basePath, category);
    if (!fs.existsSync(categoryPath)) {
      this.cache.set(category, []);
      return [];
    }

    const items: KnowledgeItem[] = [];
    const files = fs.readdirSync(categoryPath);

    for (const file of files) {
      const filePath = path.join(categoryPath, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const ext = path.extname(file);

      items.push({
        name: file,
        category,
        content,
        metadata: { ext, path: filePath }
      });
    }

    this.cache.set(category, items);
    return items;
  }

  loadAll(): Map<string, KnowledgeItem[]> {
    const categories = fs.readdirSync(this.basePath);
    const result = new Map<string, KnowledgeItem[]>();

    for (const category of categories) {
      result.set(category, this.loadCategory(category));
    }

    return result;
  }

  search(query: string): KnowledgeItem[] {
    const allItems = this.loadAll();
    const results: KnowledgeItem[] = [];
    const lowerQuery = query.toLowerCase();

    for (const items of allItems.values()) {
      for (const item of items) {
        if (item.content.toLowerCase().includes(lowerQuery)) {
          results.push(item);
        }
      }
    }

    return results;
  }
}
