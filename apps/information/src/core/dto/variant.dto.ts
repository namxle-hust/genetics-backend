import { ParseIntPipe } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Type } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { IVariantFilter } from "../models/variant-filter.model";

export class VariantFilterDTO implements IVariantFilter {
    @ApiProperty()
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    @Type(() => String)
    @IsOptional()
    chrom: string[]


    @ApiProperty()
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => String)
    @IsOptional()
    gene: string[]

    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => String)
    @IsOptional()
    annotation: string[]
    
    @ApiProperty()
    @IsArray()
    @IsNotEmpty()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => String)
    @IsOptional()
    classification: string[]

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    alleleFrequencyFrom: number

    @ApiProperty()
    @IsNumber()
    @IsNotEmpty()
    @IsOptional()
    alleleFrequencyTo: number

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    gnomADfrom: number

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    gnomADto: number

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    readDepthGreater: number

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    readDepthLower: number

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    function: string

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    qualityGreater: number

    @IsNumber()
    @IsOptional()
    @IsNotEmpty()
    @Type(() => Number)
    qualityLower: number

}