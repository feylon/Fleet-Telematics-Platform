import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MobileModule } from './sessions/mobile.module';

export interface SwaggerGroups {
  mobileModules: Array<new (...args: never[]) => unknown>;
  deviceModules: Array<new (...args: never[]) => unknown>;
}

export const setupSwagger = (app: INestApplication, groups: SwaggerGroups): void => {
  const base = () =>
    new DocumentBuilder()
      .setVersion('1.0.0')
      .addBearerAuth()
      .addServer('/')
      .setContact('Platform Team', '', '')
      .setLicense('Proprietary', '');

  const adminDocument = SwaggerModule.createDocument(
    app,
    base().setTitle('Fleet Telematics — Internal Admin Web API').setDescription('Endpoints used by the Nuxt operations dashboard (superadmin, dispatcher, fleet manager).').build(),
    { ignoreGlobalPrefix: false },
  );
  for (const path of Object.keys(adminDocument.paths)) {
    if (path.startsWith('/api/mobile') || path.startsWith('/api/device')) delete adminDocument.paths[path];
  }
  SwaggerModule.setup('docs/admin', app, adminDocument, { jsonDocumentUrl: 'docs/admin.json' });

  const mobileDocument = SwaggerModule.createDocument(
    app,
    base().setTitle('Fleet Telematics — Mobile / External Consumer API').setDescription('Session management, driver self-service and login history for mobile clients.').build(),
    { include: [MobileModule, ...groups.mobileModules] },
  );
  for (const path of Object.keys(mobileDocument.paths)) {
    if (!path.startsWith('/api/mobile')) delete mobileDocument.paths[path];
  }
  SwaggerModule.setup('docs/mobile', app, mobileDocument, { jsonDocumentUrl: 'docs/mobile.json' });

  if (groups.deviceModules.length > 0) {
    const deviceDocument = SwaggerModule.createDocument(
      app,
      base().setTitle('Fleet Telematics — Device Telemetry API').setDescription('GPS tracker ingestion endpoints authenticated by device token.').build(),
      { include: groups.deviceModules },
    );
    for (const path of Object.keys(deviceDocument.paths)) {
      if (!path.startsWith('/api/device')) delete deviceDocument.paths[path];
    }
    SwaggerModule.setup('docs/device', app, deviceDocument, { jsonDocumentUrl: 'docs/device.json' });
  }
};
