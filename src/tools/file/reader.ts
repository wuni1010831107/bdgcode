import * as fs from 'fs/promises';
import * as path from 'path';

export class FileReader {
  async readFile(filePath: string): Promise<string> {
    const resolved = path.resolve(filePath);
    return fs.readFile(resolved, 'utf-8');
  }

  async readLines(filePath: string, maxLines: number = 100): Promise<string[]> {
    const content = await this.readFile(filePath);
    return content.split(/\r?\n/).slice(0, maxLines);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(path.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async getFileInfo(filePath: string): Promise<{ size: number; modified: Date }> {
    const stats = await fs.stat(path.resolve(filePath));
    return {
      size: stats.size,
      modified: stats.mtime
    };
  }
}
