import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import {  SampleCreateDTO, SampleDeleteManyDTO, SampleFilterDTO, SampleUpdateDTO, TableDTO } from '../core/dto';
import { SampleEntity, TableOutputEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { SampleService } from '../core/services';

@UseGuards(JwtGuard)
@Controller('samples')
@ApiTags('samples')
export class SampleController {
    constructor(private readonly sampleService: SampleService) { }

    @Get('all')
    @ApiCreatedResponse({ type: SampleEntity, isArray: true })
    async getAll(@GetUser('id') userId: number) {
        const data = await this.sampleService.getSampleByUserId({ userId: userId, isDelete: false });
        return data;
    }

    @Post('find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getSamples(@GetUser('id') userId: number, @Body() dto: TableDTO<SampleFilterDTO>) {
        const data = await this.sampleService.getSamples(dto, userId);
        return new TableOutputEntity<SampleEntity>(data)
    }

    @Get(':id')
    @ApiOkResponse({ type: SampleEntity })
    async getSample(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.sampleService.getSample(id, userId);
        return new SampleEntity(data)
    }


    @Post('update/:id')
    @ApiCreatedResponse({ type: SampleEntity })
    async update(@GetUser('id') userId: number, @Body() dto: SampleUpdateDTO, @Param('id', ParseIntPipe) id) {
        const data = await this.sampleService.updateSample(dto, userId, id);
        return new SampleEntity(data);
    }

    @Post('create')
    @ApiCreatedResponse({ type: SampleEntity })
    async create(@GetUser('id') userId: number, @Body() dto: SampleCreateDTO) {
        const data = await this.sampleService.createSample(dto, userId);
        return new SampleEntity(data);
    }

    @Delete(':id')
    @ApiCreatedResponse({})
    async delete(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.sampleService.removeSample(userId, id);
        return new SampleEntity(data);
    }

    @Post('deleteItems')
    @ApiCreatedResponse({})
    async deleteMany(@GetUser('id') userId: number, @Body() dto: SampleDeleteManyDTO) {
        for (let id of dto.ids) {
            await this.sampleService.removeSample(userId, id);
        }
        return true
    }
}
