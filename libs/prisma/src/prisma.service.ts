import { Inject, Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaClient } from './generated/client'
import { PRISMA_SERVICE_OPTIONS } from './prisma.constant';


interface PrismaServiceOptions {
    /**
     * Pass options directly to the `PrismaClient`.
     * See: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference/#prismaclient
     */
    prismaOptions?: Prisma.PrismaClientOptions;

    /**
     * If "true", `PrismaClient` explicitly creates a connection pool and your first query will respond instantly.
     *
     * For most use cases the lazy connect behavior of `PrismaClient` will do. The first query of `PrismaClient` creates the connection pool.
     * See: https://www.prisma.io/docs/concepts/components/prisma-client/working-with-prismaclient/connection-management
     */
    explicitConnect?: boolean;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
    constructor(
        @Optional()
        @Inject(PRISMA_SERVICE_OPTIONS)
        private readonly prismaServiceOptions: PrismaServiceOptions = {},
    ) {
        super(prismaServiceOptions.prismaOptions);
    }

    async onModuleInit() {
        if (this.prismaServiceOptions.explicitConnect) {
            await this.$connect();
        }
    }
}
