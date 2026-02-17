export interface ICondition {
  column: string;
  operator: string;
  typeValue: string;
  stringValue?: string;
  numberValue?: number;
  arrayValue: string[];
  dateValue?: string;
  booleanValue?: boolean;
}

export enum TypeValueEnum {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  ARRAY = 'ARRAY',
  DATE = 'DATE',
  BOOLEAN = 'BOOLEAN',
}
