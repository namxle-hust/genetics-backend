import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { BatchPossession, GetUser } from '../core/decorators';
import { BatchCreateDTO, BatchDeleteManyDTO, BatchFilterDTO, BatchUpdateDTO, TableDTO } from '../core/dto';
import { BatchEntity, TableOutputEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { BatchService } from '../core/services';

@UseGuards(JwtGuard)
@Controller('batch')
@ApiTags('batch')
export class BatchController {
    constructor(private readonly batchService: BatchService) { }

    @Get('all')
    @ApiCreatedResponse({ type: BatchEntity, isArray: true })
    async getAll(@GetUser('id') userId: number) {
        const data = await this.batchService.getBatchByUserId({ userId: userId, isDelete: false });
        return data;
    }

    @Post('find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getBatches(@GetUser('id') userId: number, @Body() dto: TableDTO<BatchFilterDTO>) {
        const data = await this.batchService.getBatches(dto, userId);
        return new TableOutputEntity<BatchEntity>(data)
    }

    @Get(':id')
    @ApiOkResponse({ type: BatchEntity })
    async getBatch(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.batchService.getBatch(id, userId);
        return new BatchEntity(data)
    }


    @Post('update/:id')
    @ApiCreatedResponse({ type: BatchEntity })
    async updateBatch(@GetUser('id') userId: number, @Body() dto: BatchUpdateDTO, @Param('id', ParseIntPipe) id) {
        const data = await this.batchService.updateBatch(dto, userId, id);
        return new BatchEntity(data);
    }

    @Post('create')
    @ApiCreatedResponse({ type: BatchEntity })
    async createBatch(@GetUser('id') userId: number, @Body() dto: BatchCreateDTO) {
        const data = await this.batchService.createBatch(dto, userId);
        return new BatchEntity(data);
    }

    @Delete(':id')
    @ApiCreatedResponse({})
    async deleteBatch(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.batchService.removeBatch(userId, id);
        return new BatchEntity(data);
    }

    @Post('deleteItems')
    @ApiCreatedResponse({})
    async deleteBatches(@GetUser('id') userId: number, @Body() dto: BatchDeleteManyDTO) {
        for (let id of dto.ids) {
            await this.batchService.removeBatch(userId, id);
        }
        return true
    }
}
