import { Metadata } from '@grpc/grpc-js';

export interface DataDogLogMetadata {
  timestamp: number;
  duration: number;
  http?: {
    url: string;
    method?: string;
    status_code?: number;
    useragent_details?: {
      device: {
        family: string;
      };
    };
    headers: string[] | Metadata;
    body: Record<string, any>;
  };
  rmq?: {
    handler: string;
    content: Record<string, any>;
  };
  usr?: {
    id: string | number;
    name: string;
    email: string;
  };
  network?: {
    client: {
      ip: string;
    };
  };
  responseBody?: Record<string, any>;
  error?: {
    code?: string | number;
    message: string;
    stack: any;
  };
}
