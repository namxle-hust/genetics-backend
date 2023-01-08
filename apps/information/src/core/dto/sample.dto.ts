import { ApiProperty } from "@nestjs/swagger";
import { ArrayNotEmpty, IsArray, IsEnum, IsNotEmpty, IsNumber, IsString, ValidateIf, ValidateNested } from "class-validator"
import { Trim } from "../decorators";
import { SampleType } from "@app/prisma";
import { Type } from "class-transformer";
import { FileCreateWithSampleDTO } from "./file.dto";
import { ISampleFilter } from "../models";

export class SampleFilterDTO implements ISampleFilter {
    
}

export class SampleCreateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;

    @IsEnum(SampleType)
    type: SampleType

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => FileCreateWithSampleDTO)
    files: FileCreateWithSampleDTO[]

}

export class SampleUpdateDTO {
    @IsString()
    @IsNotEmpty()
    @Trim()
    @ApiProperty()
    name: string;
}

export class SampleDeleteManyDTO {
    @IsArray()
    @IsNotEmpty()
    @ApiProperty()
    ids: number[]
}