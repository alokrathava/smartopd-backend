import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  // Ensure uploads directory exists
  mkdirSync(join(process.cwd(), 'uploads', 'logos'), { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Security: HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );

  // Compression
  app.use(compression());

  // Serve static uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — restrict to known origins in production
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Facility-ID'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: false,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger — only in non-production or with explicit flag
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('SmartOPD API')
      .setDescription(
        `Clinical Operating System for Indian Hospitals\n\n` +
          `**Base URL:** \`/api/v1\`\n\n` +
          `**Auth:** All protected endpoints require \`Authorization: Bearer <token>\`\n\n` +
          `**Multi-tenancy:** Include \`X-Facility-ID\` header where required.`,
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'JWT',
      )
      .addTag('Auth', 'Authentication & Authorization')
      .addTag('Users', 'User & Facility Management')
      .addTag('Patients', 'Patient Registration & Consent')
      .addTag('Visits', 'OPD Visit Lifecycle & Queue')
      .addTag('Nurse', 'Vitals, Triage & MAR')
      .addTag('Doctor', 'Consultations & Prescriptions')
      .addTag('Pharmacy', 'Dispensing & Inventory')
      .addTag('Equipment', 'Equipment Leasing & Maintenance')
      .addTag('Payment', 'Billing & Revenue')
      .addTag('CRM', 'Patient Relationship Management')
      .addTag('Notifications', 'SMS, Email & WhatsApp')
      .addTag('Reports', 'Analytics & DHIS Dashboard')
      .addTag('Rooms', 'Ward & Bed Management')
      .addTag('Admissions', 'Inpatient Lifecycle')
      .addTag('OT', 'Operation Theatre Scheduling')
      .addTag('Operations CRM', 'Staffing, Insurance & Consumables')
      .addTag('ABDM', 'ABHA & Health Record Integration')
      .addTag('NHCX', 'Insurance Claim Processing')
      .addTag('Lab', 'Lab Orders & Results')
      .addTag('Audit', 'Compliance Audit Trail')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'method',
      },
    });
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`SmartOPD API running on: http://localhost:${port}/api/v1`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger docs at:         http://localhost:${port}/api/docs`);
  }
}
bootstrap();
