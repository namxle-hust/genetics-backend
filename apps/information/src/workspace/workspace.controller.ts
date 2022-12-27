import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUser } from '../core/decorators';
import { WorkspaceUpdateDTO, WorkspaceCreateDTO, TableDTO } from '../core/dto';
import { TableOutputEntity, WorkspaceEntity } from '../core/entities';
import { JwtGuard } from '../core/guards';
import { WorkspaceService } from '../core/services';

@UseGuards(JwtGuard)
@Controller('workspace')
@ApiTags('workspace')
export class WorkspaceController {
    constructor(private readonly workspaceService: WorkspaceService) { }


    @Get('all')
    @ApiCreatedResponse({ type: WorkspaceEntity, isArray: true })
    async getAll(@GetUser('id') userId: number) {
        const data = await this.workspaceService.getWorkspaceByUserId(userId);
        return data;
    }

    @Post('find')
    @ApiCreatedResponse({ type: TableOutputEntity })
    async getWorkspaces(@GetUser('id') userId: number, @Body() dto: TableDTO) {
        const data =  await this.workspaceService.getWorkspaces(dto, userId);
        return new TableOutputEntity<WorkspaceEntity>(data)
    }

    @Get(':id')
    @ApiOkResponse({ type: WorkspaceEntity })
    async getWorkspace(@GetUser('id') userId: number, @Param('id', ParseIntPipe) id) {
        const data = await this.workspaceService.getWorkspace(id, userId);
        return new WorkspaceEntity(data)
    }


    @Post('update/:id')
    @ApiCreatedResponse({ type: WorkspaceEntity })
    async updateWorkspace(@GetUser('id') userId: number, @Body() dto: WorkspaceUpdateDTO, @Param('id', ParseIntPipe) id) {
        const data = await this.workspaceService.updateWorkspace(dto, userId, id);
        return new WorkspaceEntity(data);
    }

    @Post('create')
    @ApiCreatedResponse({ type: WorkspaceEntity })
    async createWorkspace(@GetUser('id') userId: number, @Body() dto: WorkspaceCreateDTO) {
        const data = await this.workspaceService.createWorkspace(dto, userId);
        return new WorkspaceEntity(data);
    }
}
