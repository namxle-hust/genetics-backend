import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator"
import { SampleExists, Trim, WorkspaceExist } from "../decorators";
import { AnalysisStatus, Gender, VcfType } from "@app/prisma";
import { IAnalysisFilter } from "../models";

export class AnalysisFilterDTO implements IAnalysisFilter {
    @ApiProperty()
    @IsString()
    @IsOptional()
    workspaceId: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    sampleId: number;
    
    @ApiProperty()
    @IsString()
    @IsOptional()
    analysisType: VcfType;

    @ApiProperty()
    @IsString()
    @IsOptional()
    status: AnalysisStatus;
}

export class AnalysisCreateDTO {
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    @WorkspaceExist()
    workspaceId: number

    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    @SampleExists()
    sampleId: number

    @ApiProperty()
    @IsString()
    @IsOptional()
    @Trim()
    description: string

    @IsEnum(VcfType)
    @IsNotEmpty()
    vcfType: VcfType

    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string

    @IsEnum(Gender)
    gender: Gender
}

export class AnalysisUpdateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string
}

export class AnalysisDeleteManyDTO {
    @IsArray()
    @IsNotEmpty()
    @ApiProperty()
    ids: number[]
}