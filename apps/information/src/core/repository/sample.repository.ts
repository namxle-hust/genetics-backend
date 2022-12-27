import { PrismaService, Sample } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ISampleCreateInput, ISampleFindInput, ISampleUpdateInput, TableFindInput } from "../models";

@Injectable()
export class SampleRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: ISampleCreateInput): Promise<Sample> {
        try {
            const sample = await this.prisma.sample.create({
                data: data
            })
            return sample;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This sample already existed!')
                }
            }
            throw error;
        }
    }

    async findById(id: number): Promise<Sample> {
        const sample = await this.prisma.sample.findUnique({
            where: { id: id },
            include: {
                batch: {
                    select: {
                        id: true,
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

        return sample;
    }

    async count(criteria: TableFindInput<ISampleFindInput>): Promise<number> {
        const total = await this.prisma.sample.count({
            where: criteria.where,
        })
        return total
    }

    async findMany(criteria: TableFindInput<ISampleFindInput>): Promise<Sample[]> {
        const sample = await this.prisma.sample.findMany({
            where: criteria.where,
            orderBy: criteria.orderBy,
            skip: criteria.skip,
            take: criteria.take,
            include: {
                batch: {
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
        return sample
    }

    async update(id: number, data: ISampleUpdateInput | ISampleFindInput): Promise<Sample> {
        try {
            const sample = await this.prisma.sample.update({
                where: { id: id }, data: data
            })
            return sample;
        }
        catch (error) {
            throw error;
        }
    }
}