import { ApiProperty } from '@nestjs/swagger';
import { Workspace, User } from '@app/prisma';
import { Exclude, Transform } from 'class-transformer';
import { DateTransform } from '../decorators';
import { UserEntity } from './user.entity';

export class WorkspaceEntity implements Workspace {
    @ApiProperty()
    id: number;

    @DateTransform()
    @ApiProperty({ type: String })
    createdAt: Date;

    @DateTransform()
    @ApiProperty({ type: String })
    updatedAt: Date;

    @ApiProperty()
    name: string;

    @ApiProperty({ type: Number })
    userId: number;
   
    @ApiProperty()
    user: UserEntity

    @ApiProperty()
    totalAnalysis?: number

    constructor(partial: Partial<WorkspaceEntity>) {
        Object.assign(this, partial);
    }
}