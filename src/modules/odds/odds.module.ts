import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OddsService } from './odds.service';
import { ParserService } from './parser.service';
import { FilterService } from './filter.service';
import { OddsController } from './odds.controller';

@Module({
  imports: [HttpModule],
  controllers: [OddsController],
  providers: [OddsService, ParserService, FilterService],
  exports: [OddsService, ParserService, FilterService],
})
export class OddsModule {}
