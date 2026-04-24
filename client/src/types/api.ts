export interface ParsedRoute {
  route: string;
  path: string;
  method: string;
  hasRequestBody: boolean;
  responseTypes: string[];
  parameters?: Parameter[];
  requestBodySchema?: any;
  summary?: string;
  group?: string;
  id?: number;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  schema: any;
}

export interface ParseSpecResponse {
  success: boolean;
  paths: Record<string, any>;
  info: {
    title?: string;
    version?: string;
    description?: string;
  };
  validation?: any;
}

export interface ApiError {
  error: string;
  message: string;
}

export interface RoutesResponse {
  routes: ParsedRoute[];
}

export interface RequestFormData {
  method: string;
  path: string;
  pathParams: Record<string, string>;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body: string;
}