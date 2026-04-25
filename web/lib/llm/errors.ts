export class LlmProviderError extends Error {
  readonly provider?: string;
  readonly status?: number;

  constructor(message: string, options: { provider?: string; status?: number; cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "LlmProviderError";
    this.provider = options.provider;
    this.status = options.status;
  }
}

export class LlmSchemaError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "LlmSchemaError";
  }
}

export class LlmCitationError extends Error {
  readonly citationType: "chart" | "house" | "planet";

  constructor(message: string, citationType: "chart" | "house" | "planet") {
    super(message);
    this.name = "LlmCitationError";
    this.citationType = citationType;
  }
}

export class LlmContextError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "LlmContextError";
  }
}
