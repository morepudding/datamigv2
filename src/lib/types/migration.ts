// Types pour le système de migration PLM vers IFS

export interface InputRow {
  Number: string;
  Name: string;
  'Part English designation': string;
  Classification: string;
  Source: string;
  State: string;
  Version: string;
  Context: string;
  'Phantom Manufacturing Part': string;
  'Site IFS': string;
  'Structure Level': string;
  Quantity: string;
  // Attributs techniques (43 attributs selon la documentation)
  Marque?: string;
  'Matière'?: string;
  Masse?: string;
  Thickness?: string;
  'Largeur sens du fil'?: string;
  'Longueur sens du fil'?: string;
  'Working length'?: string;
  Surface?: string;
  'Edge banding length'?: string;
  'Edge banding thickness'?: string;
  'Edge banding wood type'?: string;
  'Edge banding width'?: string;
  Largeur?: string;
  Longueur?: string;
  Profile?: string;
  'Finition face extérieure'?: string;
  'Finition face intérieure'?: string;
  Matrice?: string;
  Semelle?: string;
  'Position matrice'?: string;
  'Position moule'?: string;
  'Code usinage'?: string;
  'Numéro de moule'?: string;
  Aboutage?: string;
  'Side veneer wood type'?: string;
  'Side veneer surface'?: string;
  'Angle de découpe droite'?: string;
  'Angle de découpe gauche'?: string;
  'Angle de découpe oblique droite'?: string;
  'Angle de découpe oblique gauche'?: string;
  'Epaisseur hors tout'?: string;
  'Largeur hors tout'?: string;
  'Face de placage intérieure'?: string;
  'Face de placage extérieure'?: string;
  Section?: string;
  'Code boite usinage'?: string;
  'Sens du fil'?: string;
  'Surface peinte'?: string;
  [key: string]: any; // Pour les colonnes supplémentaires non typées
}

export interface MasterPartRow {
  PART_NO: string;
  DESCRIPTION: string;
  INFO_TEXT: string;
  UNIT_CODE: string;
  CONFIGURABLE_DB: string;
  SERIAL_TRACKING_CODE_DB: string;
  PROVIDE_DB: string;
  PART_REV: string;
  ASSORTMENT_ID: string;
  ASSORTMENT_NODE: string;
  CODE_GTIN: string;
  PART_MAIN_GROUP: string;
  FIRST_INVENTORY_SITE: string;
  CONFIG_FAMILY_ID: string;
  ALLOW_CHANGES_TO_CREATED_DOP_STRUCTURE: string;
  ALLOW_AS_NOT_CONSUMED: boolean;
  VOLUME_NET: number;
  WEIGHT_NET: number;
}

export interface EngStructureRow {
  'PART NO': string;
  'PART REV': string;
  'SUB PART NO': string;
  'SUB PART REV': string;
  QTY: string;
  'STR COMMENT': string;
  'SORT NO': number;
}

export interface InventoryPartRow {
  CONTRACT: string;
  PART_NO: string;
  DESCRIPTION: string;
  PART_STATUS: string;
  PLANNER_BUYER: string;
  UNIT_MEAS: string;
  CATCH_UNIT: string;
  PART_PRODUCT_CODE: string;
  TYPE_CODE_DB: string;
  SAFETY_CODE: string;
  INVENTORY_VALUATION_METHOD: string;
  INVENTORY_PART_COST_LEVEL: string;
  NB_OF_TROLLEYS_FOR_KIT: string;
  SUPERDES_START_DATE: string;
  CYCLE_COUNTING: string;
  MRP_TO_DOP: string;
  CUSTOMS_STATISTIC: string;
  COUNTRY_OF_ORIGI: string;
  C_PPV_STATUS: string;
}

export interface InventoryPartPlanRow {
  CONTRACT: string;
  PART_NO: string;
  CARRY_RATE: string;
  LAST_ACTIVITY_DATE: string;
  LOT_SIZE: number;
  LOT_SIZE_AUTO_DB: string;
  MAXWEEK_SUPPLY: number;
  MAX_ORDER_QT: number;
  MIN_ORDER_QTY: number;
  MUL_ORDER_QTY: number;
  ORDER_POINT_QTY: number;
  ORDER_POINT_QTY_AUTO_DB: string;
  ORDER_TRIP_DATE: string;
  SAFETY_STOCK: number;
  SAFETY_LEAD_TIME: number;
  SAFETY_STOCK_AUTO_DB: string;
  SERVICE_RATE: string;
  SETUP_COST: string;
  SHRINKAGE_FAC: number;
  STD_ORDER_SIZE: number;
  ORDER_REQUISITION_DB: string;
  QTY_PREDICTED_CONSUMPTION: string;
  PLANNING_METHOD: string;
  PROPOSAL_RELEASE_DB: string;
  PERCENT_MANUFACTURED: number;
  PERCENT_ACQUIRED: number;
  SPLIT_MANUF_ACQUIRED_DB: string;
  ACQUIRED_SUPPLY_TYPE_DB: string;
  MANUF_SUPPLY_TYPE_DB: string;
  PLANNING_METHOD_AUTO_DB: string;
  SCHED_CAPACITY_DB: string;
}

export interface TechnicalSpecRow {
  MASTER_PART: string;
  ATTRIBUT: string;
  VALEUR: string;
  TYPE: 'A' | 'N'; // A = Alphanumeric, N = Numeric
}

export interface AttributeMapping {
  PLM: string;
  IFS: string;
  TYPE: 'A' | 'N';
}

export interface ProcessingResult {
  success: boolean;
  module: string;
  rowsInput: number;
  rowsOutput: number;
  outputPath: string;
  processingTime: number;
  errors: string[];
  warnings: string[];
}

export interface ProcessingMetrics {
  totalRows: number;
  totalProcessingTime: number;
  memoryUsage: number;
  fileSizes: Record<string, number>;
  errorCount: number;
  warningCount: number;
  duration?: number;
  moduleMetrics: Record<string, {
    inputRows: number;
    outputRows: number;
    processingTime: number;
    filterSteps: Record<string, number>;
  }>;
  moduleStats?: Record<string, {
    inputRows: number;
    outputRows: number;
    filteredRows: number;
    duration: number;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'MISSING_COLUMN' | 'INVALID_VALUE' | 'CONSTRAINT_VIOLATION' | 'DEPENDENCY_ERROR';
  message: string;
  rowIndex?: number;
  columnName?: string;
  value?: any;
}

export interface ValidationWarning {
  type: 'DATA_QUALITY' | 'PERFORMANCE' | 'COMPATIBILITY';
  message: string;
  rowIndex?: number;
  columnName?: string;
  value?: any;
}

export interface ArchiveResult {
  success: boolean;
  archivePath: string;
  archiveSize: number;
  filesIncluded: string[];
  projectCode: string;
}

export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error' | 'warning';

export interface ProcessingStep {
  id: string;
  name: string;
  description: string;
  status: ProcessingStatus;
  processedRows?: number;
  duration?: number;
}

export interface LogEntry {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  module?: string;
}

export interface ProcessingState {
  status: ProcessingStatus;
  currentModule: string;
  progress: number; // 0-100
  startTime?: Date;
  endTime?: Date;
  results?: ProcessingResult[];
  archive?: ArchiveResult;
  error?: string;
}

export interface FileUploadResult {
  success: boolean;
  filename: string;
  size: number;
  path: string;
  error?: string;
}

// Configuration pour chaque module de traitement
export interface ModuleConfig {
  name: string;
  enabled: boolean;
  order: number;
  dependencies: string[];
  outputFileName: string;
}

// Configuration globale du pipeline
export interface PipelineConfig {
  modules: ModuleConfig[];
  outputDirectory: string;
  tempDirectory: string;
  maxFileSize: number;
  processingTimeout: number;
  archiveFormat: 'zip' | 'tar';
  csvDelimiter: string;
  encoding: string;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  modules: [
    { name: 'master-part', enabled: true, order: 1, dependencies: [], outputFileName: 'master_part.csv' },
    { name: 'master-part-all', enabled: true, order: 2, dependencies: [], outputFileName: 'master_part_all.csv' },
    { name: 'technical-specs', enabled: true, order: 3, dependencies: ['master-part'], outputFileName: 'technical_spec_values.csv' },
    { name: 'eng-structure', enabled: true, order: 4, dependencies: ['master-part-all'], outputFileName: 'eng_part_structure.csv' },
    { name: 'inventory-part', enabled: true, order: 5, dependencies: [], outputFileName: 'inventory_part.csv' },
    { name: 'inventory-plan', enabled: true, order: 6, dependencies: [], outputFileName: 'inventory_part_plan.csv' }
  ],
  outputDirectory: './output',
  tempDirectory: './tmp',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  processingTimeout: 5 * 60 * 1000, // 5 minutes
  archiveFormat: 'zip',
  csvDelimiter: ';',
  encoding: 'utf8'
};
