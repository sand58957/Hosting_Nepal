export interface SagaStep {
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<any>;
}

export interface SagaResult {
  success: boolean;
  sagaId: string;
  result?: any;
  error?: string;
}
