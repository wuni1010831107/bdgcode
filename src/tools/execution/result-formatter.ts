export class ResultFormatter {
  formatTable(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return 'No results returned.';

    const lines = trimmed.split('\n').filter(l => l.trim());
    if (lines.length === 0) return 'No results returned.';

    const rows = lines.map(l => l.split('\t'));
    if (rows.length === 1 && rows[0].length === 1) {
      return trimmed;
    }

    const colWidths = rows[0].map((_, i) =>
      Math.max(...rows.map(r => (r[i] || '').length))
    );

    const formatRow = (cells: string[]) =>
      cells.map((c, i) => c.padEnd(colWidths[i])).join('  ');

    const header = formatRow(rows[0]);
    const separator = colWidths.map(w => '-'.repeat(w)).join('  ');
    const body = rows.slice(1).map(r => formatRow(r)).join('\n');

    return `${header}\n${separator}\n${body}`;
  }

  formatSparkExplain(raw: string): string {
    const lines = raw.split('\n').filter(l => l.trim().startsWith('==') || l.trim().startsWith('*'));
    return lines.join('\n') || raw;
  }

  formatFlinkSubmission(raw: string): string {
    const jobIdMatch = raw.match(/(?:Job ID[:\s]+|with job ID\s+)([a-f0-9-]+)/i);
    if (jobIdMatch) {
      return `Flink job submitted successfully.\nJob ID: ${jobIdMatch[1]}`;
    }
    return raw;
  }

  formatError(stderr: string, exitCode: number): string {
    const lines = stderr.trim().split('\n').filter(l => l.trim());
    const relevant = lines.filter(l =>
      !l.includes('WARN') && !l.includes('Deprecated') && !l.includes('log4j')
    );
    if (relevant.length === 0) {
      return `Process exited with code ${exitCode}. No error details available.`;
    }
    return relevant.join('\n');
  }
}
