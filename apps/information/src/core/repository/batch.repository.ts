import { Batch, PrismaService } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { IBatchCreateInput, IBatchFindInput, IBatchRemoveInput, IBatchUpdateInput, TableFindInput } from "../models";

@Injectable()
export class BatchRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: IBatchCreateInput): Promise<Batch> {
        try {
            const batch = await this.prisma.batch.create({
                data: data
            })
            return batch;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This batch already existed!')
                }
            }
            throw error;
        }
    }

    async findById(id: number): Promise<Batch> {
        const batch = await this.prisma.batch.findUnique({
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

        return batch;
    }

    async count(criteria: TableFindInput<IBatchFindInput>): Promise<number> {
        const total = await this.prisma.batch.count({
            where: criteria.where,
        })
        return total
    }

    async findMany(criteria: TableFindInput<IBatchFindInput>): Promise<Batch[]> {
        const batches = await this.prisma.batch.findMany({
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
        return batches
    }

    async findBatchByUserId(data: IBatchFindInput): Promise<Batch[]> {
        const batches = await this.prisma.batch.findMany({
            where: {
                userId: data.userId,
                isDelete: data.isDelete
            }
        })
        return batches;
    }

    async update(id: number, data: IBatchUpdateInput | IBatchRemoveInput): Promise<Batch> {
        try {
            const batch = await this.prisma.batch.update({
                where: { id: id }, data: data
            })
            return batch;
        }
        catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This batch already existed!')
                }
            }
            throw error;
        }
    }
}