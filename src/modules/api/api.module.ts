import { Module } from '@nestjs/common';
import { ApiController } from './api.controller';
import { BankrollModule } from '../bankroll/bankroll.module';

@Module({
  imports: [BankrollModule],
  controllers: [ApiController],
})
export class ApiModule {}
