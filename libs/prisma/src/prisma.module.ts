import { DynamicModule, Global, Module, ModuleMetadata } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Prisma } from 'prisma';
import { PrismaModuleOption } from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from './prisma.constant';
import { PrismaService } from './prisma.service';

@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService],
})
export class PrismaModule {
    static forRootAsync(options: PrismaModuleOption): DynamicModule {
        return {
            global: options.isGlobal,
            module: PrismaModule,
            imports: options.imports || [],
            providers: [
                {
                    provide: PRISMA_SERVICE_OPTIONS,
                    useFactory: options.useFactory,
                    inject: options.inject || [],
                },
            ],
        };
    }
}
