import { IsEnum, IsOptional } from 'class-validator';

export enum HistoryPeriod {
  TODAY = 'today',
  YESTERDAY = 'yesterday',
  WEEK = 'week',
  MONTH = '30days',
}

export class HistoryQueryDto {
  @IsOptional()
  @IsEnum(HistoryPeriod)
  period?: HistoryPeriod = HistoryPeriod.TODAY;
}
