import { Workspace } from '@app/prisma';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TableDTO, WorkspaceFilterDTO } from '../dto';
import { TableFindInput } from '../models';
import { WorkspaceCreateDTO, WorkspaceUpdateDTO } from '../dto';
import { TableOutputEntity, WorkspaceEntity } from '../entities';
import { IWorkspaceCreateInput, IWorkspaceFindInput, IWorkspaceUpdateInput } from '../models';
import { WorkspaceRepository } from '../repository';

@Injectable({})
export class WorkspaceService {
    constructor(private readonly workspaceRepository: WorkspaceRepository) {}

    async getWorkspaces(dto: TableDTO<WorkspaceFilterDTO>, userId: number): Promise<TableOutputEntity<WorkspaceEntity>> {
        let result: TableOutputEntity<WorkspaceEntity> = {
            items: [],
            total: 0
        }

        let tableFindDto = new TableFindInput<IWorkspaceFindInput, WorkspaceFilterDTO>(dto, { userId: userId });
        
        const total = await this.workspaceRepository.count(tableFindDto);

        if (total > 0) {
            const workspaces = await this.workspaceRepository.findMany(tableFindDto);

            const items = workspaces.map((workspace) => new WorkspaceEntity(workspace));

            result.items = items;
            result.total = total;
        }

        return result
    }

    async getWorkspaceByUserId(userId: number): Promise<WorkspaceEntity[]> {
        const workspaces = await this.workspaceRepository.findByUserId(userId);
        return workspaces.map(workspace => new WorkspaceEntity(workspace));

    }

    async updateWorkspace(dto: WorkspaceUpdateDTO, userId: number, id: number): Promise<Workspace> {
        let data: IWorkspaceUpdateInput = {
            name: dto.name
        }

        let workspace = await this.workspaceRepository.findById(id);
        if (workspace.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }

        return await this.workspaceRepository.update(id, data);
    }


    async getWorkspace(id: number, userId: number): Promise<Workspace> {
        let workspace = await this.workspaceRepository.findById(id);
        if (workspace.userId != userId) {
            throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
        return workspace;
    }

    async createWorkspace(dto: WorkspaceCreateDTO, userId: number) {
        let data: IWorkspaceCreateInput = {
            userId: userId,
            name: dto.name
        }
        return this.workspaceRepository.create(data);
    }

    async removeWorkspace(id: number) {
        // return this.workspaceRepository.update()
    }
}
