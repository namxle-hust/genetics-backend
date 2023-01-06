import { PrismaService, User, Workspace } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { IWorkspaceFilter, TableFindInput } from "../models";
import { IWorkspaceCreateInput, IWorkspaceFindInput, IWorkspaceUpdateInput } from "../models";

@Injectable()
export class WorkspaceRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: IWorkspaceCreateInput): Promise<Workspace> {
        try {
            const workspace = await this.prisma.workspace.create({
                data: data
            })
            return workspace;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This workspace already existed!')
                }
            }
            throw error;
        }
    }

    async findById(id: number): Promise<Workspace> {
        const workspace = await this.prisma.workspace.findUnique({
            where: { id: id },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
        })

        return workspace;
    }

    async count(criteria: TableFindInput<IWorkspaceFindInput, IWorkspaceFilter>): Promise<number> {
        const total = await this.prisma.workspace.count({
            where: criteria.where,
        })
        return total
    }

    async findByUserId(userId: number): Promise<Workspace[]> {
        return await this.prisma.workspace.findMany({
            where: {
                userId: userId
            }
        })
    }

    async findMany(criteria: TableFindInput<IWorkspaceFindInput, IWorkspaceFilter>): Promise<Workspace[]> {
        const workspaces = await this.prisma.workspace.findMany({
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
        return workspaces
    }

    async update(id: number, data: IWorkspaceUpdateInput): Promise<Workspace> {
        try {
            const workspace = await this.prisma.workspace.update({
                where: { id: id }, data: data
            })
            return workspace;
        }
        catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('This workspace already existed!')
                }
            }
            throw error;
        }
    }
}