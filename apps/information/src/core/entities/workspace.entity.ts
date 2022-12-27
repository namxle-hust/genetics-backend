import { ApiProperty } from '@nestjs/swagger';
import { Workspace, User } from '@app/prisma';
import { Exclude, Transform } from 'class-transformer';
import { DateTransform } from '../decorators';

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
    user: User

    constructor(partial: Partial<WorkspaceEntity>) {
        Object.assign(this, partial);
    }
}