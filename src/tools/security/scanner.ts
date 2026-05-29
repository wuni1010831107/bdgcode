import * as fs from 'fs';

export interface SensitiveField {
  name: string;
  regex: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  masking: string;
}

export interface ScanResult {
  tableName: string;
  fields: SensitiveField[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

export class SecurityScanner {
  private patterns: SensitiveField[];

  constructor(patternsPath: string) {
    this.patterns = this.loadPatterns(patternsPath);
  }

  scanTable(tableName: string, columns: { name: string; type: string }[]): ScanResult {
    const matchedFields: SensitiveField[] = [];
    const recommendations: string[] = [];

    for (const col of columns) {
      for (const pattern of this.patterns) {
        if (this.matchesPattern(col.name, pattern.regex)) {
          matchedFields.push({
            ...pattern,
            name: col.name
          });
          recommendations.push(`Apply ${pattern.masking} masking to ${col.name} (${pattern.severity})`);
          break;
        }
      }
    }

    const riskLevel = this.calculateRiskLevel(matchedFields);

    return {
      tableName,
      fields: matchedFields,
      riskLevel,
      recommendations
    };
  }

  generateMaskingSQL(tableName: string, fields: SensitiveField[]): string {
    const selectParts: string[] = [];

    for (const field of fields) {
      const maskedExpr = this.buildMaskExpression(field.name, field.masking);
      selectParts.push(`    ${maskedExpr} AS ${field.name}`);
    }

    return `-- Masked view for ${tableName}\nCREATE VIEW ${tableName}_masked AS\nSELECT\n${selectParts.join(',\n')}\nFROM ${tableName};`;
  }

  private buildMaskExpression(fieldName: string, masking: string): string {
    if (masking.includes('*')) {
      const visibleChars = masking.replace(/\*/g, '').length;
      const maskedLen = masking.length - visibleChars;
      return `CASE WHEN LENGTH(${fieldName}) > ${maskedLen} THEN CONCAT(SUBSTRING(${fieldName}, 1, ${visibleChars}), REPEAT('*', ${maskedLen})) ELSE '****' END`;
    }
    return `'${masking}'`;
  }

  private loadPatterns(path: string): SensitiveField[] {
    if (!fs.existsSync(path)) {
      return [];
    }
    const content = fs.readFileSync(path, 'utf-8');
    const data = JSON.parse(content);
    return data.patterns || [];
  }

  private matchesPattern(name: string, regex: string): boolean {
    try {
      const re = new RegExp(regex, 'i');
      return re.test(name);
    } catch {
      return false;
    }
  }

  private calculateRiskLevel(fields: SensitiveField[]): 'low' | 'medium' | 'high' | 'critical' {
    if (fields.some(f => f.severity === 'critical')) return 'critical';
    if (fields.some(f => f.severity === 'high')) return 'high';
    if (fields.some(f => f.severity === 'medium')) return 'medium';
    return 'low';
  }
}
