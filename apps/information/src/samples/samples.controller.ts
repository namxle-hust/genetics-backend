import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import { SampleCreateDTO, SampleDeleteManyDTO, SampleFilterDTO, SampleUpdateDTO, TableDTO, VariantFilterDTO } from '../core/dto';
import { SampleEntity, TableOutputEntity, VariantEntity, VariantQCUrlEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { VariantModel } from '../core/models';
import { SampleService } from '../core/services';
import { SampleDetailService } from '../core/services/sample-detail.service';

@Controller('samples')
@UseGuards(JwtGuard)
@ApiTags('samples')
export class SamplesController {
    constructor(private sampleService: SampleService, private sampleDetailService: SampleDetailService) {
        
    }

    @Get(':id/detail')
    @ApiOkResponse({ type: SampleEntity })
    async getSampleDetail(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data: SampleEntity = await this.sampleService.getSampleDetail(userId, id);
        return data
    }


    @Post('variants/:id/find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getVarients(@Param('id', ParseIntPipe) id, @Body() dto: TableDTO<VariantFilterDTO>) {
        const data = await this.sampleDetailService.getVariant(id, dto);
        return new TableOutputEntity<VariantEntity>(data)
    }

    @Get('variants/:id/qc')
    @ApiOkResponse({ type: VariantQCUrlEntity })
    async getVarientQcUrl(@Param('id', ParseIntPipe) id) {
        const data = await this.sampleDetailService.getSampleQcUrl(id);
        return data;
    }

    @Post('find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getAll(@GetUser('id') userId: number, @Body() dto: TableDTO<SampleFilterDTO>) {
        const data = await this.sampleService.getSamples(dto, userId);
        return new TableOutputEntity<SampleEntity>(data)
    }

    @Get(':id')
    @ApiOkResponse({ type: SampleEntity })
    async getById(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.sampleService.getSample(id);
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
