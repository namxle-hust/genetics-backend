import { Body, Controller, Delete, Get, Logger, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import { AnalysisCreateDTO, AnalysisDeleteManyDTO, AnalysisFilterDTO, AnalysisUpdateDTO, TableDTO, VariantFilterDTO } from '../core/dto';
import { AnalysisEntity, GeneDetailEntity, IgvUrlEntity, TableOutputEntity, VariantEntity, VariantQCUrlEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { AnalysisService, AnalysisDetailService, VariantService } from '../core/services';
import { Request } from 'express';

@Controller('analysis')
@UseGuards(JwtGuard)
@ApiTags('analysis')
export class AnalysisController {
    private readonly logger = new Logger(AnalysisController.name)

    constructor(
        private analysisService: AnalysisService, 
        private analysisDetailService: AnalysisDetailService,
        private variantService: VariantService
    ) {
        
    }

    @Get(':id/detail')
    @ApiOkResponse({ type: AnalysisEntity })
    async getDetail(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data: AnalysisEntity = await this.analysisService.getAnalysisDetail(userId, id);
        return data
    }


    @Post('variants/:id/find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getVariants(@Param('id', ParseIntPipe) id, @Body() dto: TableDTO<VariantFilterDTO>) {
        const data = await this.analysisDetailService.getVariant(id, dto);
        return new TableOutputEntity<VariantEntity>(data)
    }

    @Get(':analysisId/variant-detail/:variantId')
    @ApiCreatedResponse({ type: VariantEntity })
    async getVariantDetail(@Param('analysisId', ParseIntPipe) analysisId, @Param('variantId') variantId) {
        const data = await this.analysisDetailService.getVariantDetail(analysisId, variantId)
        return new VariantEntity(data[0])
    }

    @Get(':analysisId/igv-url')
    @ApiCreatedResponse({ type: IgvUrlEntity })
    async getIgvLink(@Param('analysisId', ParseIntPipe) analysisId, @Req() request: Request) {
        const ip = request.headers['x-real-ip'] ? request.headers['x-real-ip'].toString() : request.ip ? request.ip.replace(/::ffff:/g, "") : undefined
        const data = await this.analysisDetailService.getIgvURLs(analysisId, ip)
        return new IgvUrlEntity(data)
    }

    @Get(':id/qc-url')
    @ApiOkResponse({ type: VariantQCUrlEntity })
    async getVarientQcUrl(@Param('id', ParseIntPipe) id) {
        const data = await this.analysisDetailService.getQcUrl(id);
        return new VariantQCUrlEntity(data);
    }

    @Post('find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getAll(@GetUser('id') userId: number, @Body() dto: TableDTO<AnalysisFilterDTO>) {
        const data = await this.analysisService.getAnalyses(dto, userId);
        return new TableOutputEntity<AnalysisEntity>(data)
    }

    @Get(':id')
    @ApiOkResponse({ type: AnalysisEntity })
    async getById(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.analysisService.getAnalysis(id);
        return new AnalysisEntity(data)
    }


    @Post('update/:id')
    @ApiCreatedResponse({ type: AnalysisEntity })
    async update(@GetUser('id') userId: number, @Body() dto: AnalysisUpdateDTO, @Param('id', ParseIntPipe) id) {
        const data = await this.analysisService.updateAnalysis(dto, userId, id);
        return new AnalysisEntity(data);
    }

    @Post('create')
    @ApiCreatedResponse({ type: AnalysisEntity })
    async create(@GetUser('id') userId: number, @Body() dto: AnalysisCreateDTO) {
        const data = await this.analysisService.createAnalysis(dto, userId);
        return new AnalysisEntity(data);
    }

    @Delete(':id')
    @ApiCreatedResponse({ type: AnalysisEntity })
    async delete(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.analysisService.removeAnalysis(userId, id);
        return new AnalysisEntity(data);
    }

    @Post('deleteItems')
    @ApiCreatedResponse({})
    async deleteMany(@GetUser('id') userId: number, @Body() dto: AnalysisDeleteManyDTO) {
        for (let id of dto.ids) {
            await this.analysisService.removeAnalysis(userId, id);
        }
        return true
    }

    @Get('gene-detail/:geneName')
    @ApiOkResponse({ type: AnalysisEntity })
    async getGeneInfo(@GetUser('id') userId: number, @Param('geneName') geneName: string) {
        const data = await this.analysisService.getGeneInfo(geneName);
        return new GeneDetailEntity(data);
    }


}
