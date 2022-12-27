import { PrismaService, User } from "@app/prisma";
import { PrismaClientKnownRequestError } from "@app/prisma";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { IUserCreateInput, UserFindCriteria } from "../models";

@Injectable()
export class UserRepository {
    constructor(private prisma: PrismaService) { }

    async create(data: IUserCreateInput): Promise<User> {
        try {   
            const user = await this.prisma.user.create({
                data: data
            })
            return user;
        } catch (error) {
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === 'P2002') { // Duplicate fields
                    throw new ForbiddenException('Credentials taken')
                }
            }
            throw error;
        }
    }

    async findById(id: number): Promise<User> {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: id }
        })

        return user;
    }

    async findMany(criteria: UserFindCriteria): Promise<User[]> {
        const users = await this.prisma.user.findMany({
            where: criteria
        })
        return users
    }

    async findFirstOrThrow(criteria: UserFindCriteria): Promise<User> {
        const user = await this.prisma.user.findFirstOrThrow({
            where: criteria
        })
        return user;
    }

    async findFirst(criteria: UserFindCriteria): Promise<User> {
        const user = await this.prisma.user.findFirst({
            where: criteria
        })
        return user;
    }

    async findUnique(criteria: UserFindCriteria): Promise<User> {
        const user = await this.prisma.user.findUnique({
            where: criteria
        })
        return user;
    }


    async update(id: number, data: User) {
        const user = await this.prisma.user.update({
            where: { id: id }, data: data
        })
        return user;
    }
}