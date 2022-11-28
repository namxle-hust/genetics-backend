import { Body, Controller, Get, Post } from '@nestjs/common';
import { SamplesHandlerService } from './samples-handler.service';

@Controller()
export class SamplesHandlerController {
    constructor(private readonly samplesHandlerService: SamplesHandlerService) { }

    @Get()
    getHello(): string {
        return this.samplesHandlerService.getHello();
    }

    @Post('analyze-fastq')
    signup(@Body() request: any) {
        return this.samplesHandlerService.analyzeFastq(request)
    }
}
