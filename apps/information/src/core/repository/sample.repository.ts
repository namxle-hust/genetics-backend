import { PrismaService, Sample } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { ISampleCreateInput, ISampleFilter, ISampleFindInput, ISampleRemoveInput, ISampleUpdateInput, TableFindInput } from "../models";

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
                files: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
        })

        return sample;
    }

    async count(criteria: TableFindInput<ISampleFindInput, ISampleFilter>): Promise<number> {
        const total = await this.prisma.sample.count({
            where: criteria.where,
        })
        return total
    }

    async findMany(criteria: TableFindInput<ISampleFindInput, ISampleFilter>): Promise<Sample[]> {
        const samples = await this.prisma.sample.findMany({
            where: criteria.where,
            orderBy: criteria.orderBy,
            skip: criteria.skip,
            take: criteria.take,
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
        })
        return samples
    }

    async findByUserId(data: ISampleFindInput): Promise<Sample[]> {
        const samples = await this.prisma.sample.findMany({
            where: {
                userId: data.userId,
                isDelete: data.isDelete
            }
        })
        return samples;
    }

    async update(id: number, data: ISampleUpdateInput | ISampleRemoveInput): Promise<Sample> {
        try {
            const sample = await this.prisma.sample.update({
                where: { id: id }, data: data
            })
            return sample;
        }
        catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This sample already existed!')
                }
            }
            throw error;
        }
    }
}