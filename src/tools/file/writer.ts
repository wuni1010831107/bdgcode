import * as fs from 'fs/promises';
import * as path from 'path';

export class FileWriter {
  private allowedBase: string;

  constructor(allowedBase?: string) {
    this.allowedBase = allowedBase || process.cwd();
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(this.allowedBase, filePath);
    this.assertSafePath(resolved);

    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.writeFile(resolved, content, 'utf-8');
  }

  async appendFile(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(this.allowedBase, filePath);
    this.assertSafePath(resolved);

    await fs.mkdir(path.dirname(resolved), { recursive: true });
    await fs.appendFile(resolved, content, 'utf-8');
  }

  private assertSafePath(resolved: string): void {
    if (!resolved.startsWith(this.allowedBase)) {
      throw new Error(`Path traversal blocked: ${resolved} is outside ${this.allowedBase}`);
    }
  }
}
