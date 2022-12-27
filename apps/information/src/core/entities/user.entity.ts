import { ApiProperty } from '@nestjs/swagger';
import { User, Role } from '@app/prisma';
import { Exclude, Transform } from 'class-transformer';
import { DateTransform } from '../decorators';

export class UserEntity implements User {
    @ApiProperty()
    id: number;

    @ApiProperty()
    @DateTransform()
    createdAt: Date;

    @ApiProperty()
    @DateTransform()
    updatedAt: Date;

    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    @Exclude()
    hash: string;

    @ApiProperty()
    role: Role;

    @ApiProperty()
    @DateTransform()
    lastLogin: Date;

    constructor(partial: Partial<UserEntity>) {
        Object.assign(this, partial);
    }
    
}