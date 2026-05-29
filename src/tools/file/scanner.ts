import * as fs from 'fs/promises';
import * as path from 'path';
import { Dirent } from 'fs';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
}

export class FileScanner {
  async scanDirectory(dirPath: string, extensions?: string[]): Promise<FileInfo[]> {
    const resolved = path.resolve(dirPath);
    const files: FileInfo[] = [];
    await this.walk(resolved, extensions, files);
    return files;
  }

  private async walk(dirPath: string, extensions: string[] | undefined, files: FileInfo[]): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.walk(fullPath, extensions, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (!extensions || extensions.includes(ext)) {
          const stats = await fs.stat(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            size: stats.size,
            extension: ext
          });
        }
      }
    }
  }

  async findFiles(dirPath: string, pattern: string): Promise<string[]> {
    const resolved = path.resolve(dirPath);
    const { globby } = await import('globby');
    return globby(pattern, { cwd: resolved });
  }
}
