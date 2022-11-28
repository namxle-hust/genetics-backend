import { ModuleMetadata } from "@nestjs/common";
import { Prisma } from 'prisma'


export interface PrismaModuleOption extends Pick<ModuleMetadata, 'imports'> {
    isGlobal?: boolean;
    useFactory?: (
        ...args: any[]
    ) => Promise<Prisma.PrismaServiceOptions> | Prisma.PrismaServiceOptions;
    inject?: any[];
}
