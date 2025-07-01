import { Controller, Get, Post, HttpCode } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('api/v1/reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  report() {
    return {
      'accounts.csv': this.reportsService.state('accounts'),
      'yearly.csv': this.reportsService.state('yearly'),
      'fs.csv': this.reportsService.state('fs'),
    };
  }

  @Post()
  @HttpCode(201)
  generate() {
    setTimeout(() => this.backgroundProcess(), 0)
    return { message: 'finished' };
  }

  private async backgroundProcess() {
    try {
      await this.reportsService.accounts();
      await this.reportsService.yearly();
      await this.reportsService.fs();
    } catch (error) {
      console.log(error)
    }
  }
}
