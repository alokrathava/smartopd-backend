import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health & system info',
    description:
      'Returns API status, version, environment, uptime, and a link to Swagger docs.',
  })
  @ApiOkResponse({
    description: 'API is healthy',
    schema: {
      example: {
        status: 'ok',
        app: 'SmartOPD API',
        description: 'Clinical Operating System for Indian Hospitals',
        version: '1.0.0',
        environment: 'development',
        timestamp: '2026-03-29T10:00:00.000Z',
        uptimeSeconds: 42,
        nodeVersion: 'v22.0.0',
        docs: '/api/docs',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
