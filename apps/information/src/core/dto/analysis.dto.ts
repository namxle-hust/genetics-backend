import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateIf, ValidateNested } from "class-validator"
import { SampleExists, Trim, WorkspaceExist } from "../decorators";
import { AnalysisStatus, Gender, VcfType } from "@app/prisma";
import { IAnalysisFilter } from "../models";
import { Type } from "class-transformer";

export class AnalysisFilterDTO implements IAnalysisFilter {
    @ApiProperty()
    @IsNumber()
    @IsOptional()
    workspaceId: number;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    sampleId: number[];
    
    @ApiProperty()
    @IsString()
    @IsOptional()
    analysisType: VcfType;

    @ApiProperty()
    @IsArray()
    @IsOptional()
    status: AnalysisStatus[]
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