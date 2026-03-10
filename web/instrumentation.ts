import { registerOTel } from '@vercel/otel';

export async function register(): Promise<void> {
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? 'layers-web',
    attributes: {
      'service.version': process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0',
      'deployment.environment': process.env.NODE_ENV ?? 'development',
    },
  });
}
