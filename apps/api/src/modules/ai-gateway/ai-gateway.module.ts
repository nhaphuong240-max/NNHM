import { Module } from '@nestjs/common';
import { AiCopilotModule } from '../ai-copilot/ai-copilot.module';
import { AiLegalModule } from '../ai-legal/ai-legal.module';
import { AiGatewayController } from './ai-gateway.controller';
import { AiGatewayService } from './ai-gateway.service';
import { TemplateLlmProvider } from './template-llm.provider';

@Module({
  imports: [AiCopilotModule, AiLegalModule],
  controllers: [AiGatewayController],
  providers: [AiGatewayService, TemplateLlmProvider],
  exports: [AiGatewayService],
})
export class AiGatewayModule {}
