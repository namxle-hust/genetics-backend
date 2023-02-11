import { Analysis, PrismaService, Sample } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { AnalysisFilterDTO } from "../dto";
import { IAnalysisCreateInput, IAnalysisFilter, IAnalysisFindInput, IAnalysisRemoveInput, IAnalysisUpdateInput, TableFindInput } from "../models";

@Injectable()
export class AnalysisRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: IAnalysisCreateInput): Promise<Analysis> {
        try {
            const analysis = await this.prisma.analysis.create({
                data: data
            })
            return analysis;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This analysis already existed!')
                }
            }
            throw error;
        }
    }

    async findSampleByAnalysis(id: number): Promise<Sample> {
        const analysis = await this.prisma.analysis.findUnique({
            where: { id: id },
            include: {
                sample: true,
                workspace: {
                    select: {
                        name: true
                    }
                }
            },
        })

        return analysis.sample;
    }

    async findById(id: number): Promise<Analysis> {
        const analysis = await this.prisma.analysis.findUnique({
            where: { id: id },
            include: {
                sample: {
                    select: {
                        id: true,
                        name: true,
                        userId: true
                    }
                },
                workspace: {
                    select: {
                        name: true
                    }
                }
            },
        })

        return analysis;
    }
    async findByIdOrFail(id: number) {
        const analysis = await this.prisma.analysis.findUniqueOrThrow({
            where: { id: id },
            include: {
                sample: {
                    select: {
                        id: true,
                        name: true,
                        userId: true,
                        type: true
                    }
                },
                workspace: {
                    select: {
                        name: true
                    }
                }
            },
        })

        return analysis;
    }

    async count(criteria: TableFindInput<IAnalysisFindInput, IAnalysisFilter>): Promise<number> {
        const total = await this.prisma.analysis.count({
            where: criteria.where,
        })
        return total
    }

    async findMany(criteria: TableFindInput<IAnalysisFindInput, IAnalysisFilter>): Promise<Analysis[]> {
        const analysis = await this.prisma.analysis.findMany({
            where: criteria.where,
            orderBy: criteria.orderBy,
            skip: criteria.skip,
            take: criteria.take,
            include: {
                sample: {
                    select: {
                        name: true
                    }
                },
                workspace: {
                    select: {
                        name: true
                    }
                }
            },
        })
        return analysis
    }

    async update(id: number, data: IAnalysisUpdateInput | IAnalysisRemoveInput): Promise<Analysis> {
        try {
            const analysis = await this.prisma.analysis.update({
                where: { id: id }, data: data
            })
            return analysis;
        }
        catch (error) {
            throw error;
        }
    }
}