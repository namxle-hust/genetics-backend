import { File, PrismaService, User } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { IFileCreateInput, IFileFilter, IFileFindInput, TableFindInput, UserFindCriteria } from "../models";

@Injectable()
export class FileRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: IFileCreateInput): Promise<File> {
        try {
            const file = await this.prisma.file.create({
                data: data
            })
            return file;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('Credentials taken')
                }
            }
            throw error;
        }
    }

    async count(criteria: TableFindInput<IFileFindInput, IFileFilter>): Promise<number> {
        const total = await this.prisma.sample.count({
            where: criteria.where,
        })
        return total
    }

    async findById(id: number): Promise<File> {
        const file = await this.prisma.file.findUniqueOrThrow({
            where: { id: id }
        })

        return file;
    }

    async findMany(criteria: TableFindInput<IFileFindInput, IFileFilter>): Promise<File[]> {
        const files = await this.prisma.file.findMany({
            where: criteria.where,
            orderBy: criteria.orderBy,
            skip: criteria.skip,
            take: criteria.take,
            include: {
                sample: {
                    select: {
                        name: true,
                        userId: true
                    }
                }
            },
        })
        return files
    }
}