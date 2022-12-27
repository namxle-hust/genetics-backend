import { Module } from '@nestjs/common';
import { WorkspaceRepository } from '../core/repository/workspace.repository';
import { WorkspaceService } from '../core/services';
import { WorkspaceController } from './workspace.controller';

@Module({
    controllers: [WorkspaceController],
    providers: [WorkspaceService, WorkspaceRepository]

})
export class WorkspaceModule {}
