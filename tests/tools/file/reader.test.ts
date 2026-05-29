import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileReader, FileWriter, FileScanner } from '../../../src/tools/file';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import * as os from 'os';

describe('FileReader', () => {
  const testDir = '/tmp/datadev-file-test';

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    writeFileSync(`${testDir}/test.txt`, 'Hello, World!');
    writeFileSync(`${testDir}/data.json`, '{"key": "value"}');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should read file content', async () => {
    const reader = new FileReader();
    const content = await reader.readFile(`${testDir}/test.txt`);
    expect(content).toBe('Hello, World!');
  });

  it('should read file lines', async () => {
    const reader = new FileReader();
    const lines = await reader.readLines(`${testDir}/test.txt`);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('Hello, World!');
  });

  it('should check file existence', async () => {
    const reader = new FileReader();
    expect(await reader.exists(`${testDir}/test.txt`)).toBe(true);
    expect(await reader.exists(`${testDir}/nonexistent.txt`)).toBe(false);
  });

  it('should get file info', async () => {
    const reader = new FileReader();
    const info = await reader.getFileInfo(`${testDir}/test.txt`);
    expect(info.size).toBe(13);
    expect(info.modified).toBeInstanceOf(Date);
  });
});

describe('FileWriter', () => {
  const testDir = '/tmp/datadev-file-test';

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should write file', async () => {
    const writer = new FileWriter(testDir);
    await writer.writeFile('output.sql', 'SELECT * FROM users');
    const content = await new FileReader().readFile(`${testDir}/output.sql`);
    expect(content).toBe('SELECT * FROM users');
  });

  it('should append to file', async () => {
    const writer = new FileWriter(testDir);
    await writer.writeFile('log.txt', 'Line 1\n');
    await writer.appendFile('log.txt', 'Line 2\n');
    const content = await new FileReader().readFile(`${testDir}/log.txt`);
    expect(content).toBe('Line 1\nLine 2\n');
  });
});

describe('FileScanner', () => {
  const testDir = '/tmp/datadev-file-test';

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    writeFileSync(`${testDir}/a.sql`, 'SELECT 1');
    writeFileSync(`${testDir}/b.sql`, 'SELECT 2');
    writeFileSync(`${testDir}/c.txt`, 'hello');
    writeFileSync(`${testDir}/d.json`, '{}');
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should scan directory with filter', async () => {
    const scanner = new FileScanner();
    const files = await scanner.scanDirectory(testDir, ['sql']);
    expect(files).toHaveLength(2);
    expect(files.every(f => f.extension === 'sql')).toBe(true);
  });

  it('should scan all files without filter', async () => {
    const scanner = new FileScanner();
    const files = await scanner.scanDirectory(testDir);
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it('should return file info with correct fields', async () => {
    const scanner = new FileScanner();
    const files = await scanner.scanDirectory(testDir, ['sql']);
    expect(files[0].name).toBeDefined();
    expect(files[0].path).toContain('.sql');
    expect(files[0].size).toBeGreaterThan(0);
  });
});
