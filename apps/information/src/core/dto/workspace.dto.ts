import { ApiProperty } from "@nestjs/swagger";
import { AtLeastOnePropertyOf } from "@app/common"
import { IsEmail, IsNotEmpty, IsNumber, IsString, ValidateIf } from "class-validator"
import { Trim } from "../decorators";
import { IWorkspaceFilter } from "../models";

export class WorkspaceFilterDTO implements IWorkspaceFilter {
    
}

export class WorkspaceCreateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;
}

export class WorkspaceUpdateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()         
    @ApiProperty()
    name: string;
}

