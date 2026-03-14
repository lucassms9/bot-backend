import { Module } from '@nestjs/common';
import { TestController } from './test.controller';
import { OddsModule } from '../odds/odds.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [OddsModule, RiskModule],
  controllers: [TestController],
})
export class TestModule {}
