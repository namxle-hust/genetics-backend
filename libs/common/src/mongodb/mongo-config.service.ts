import { MongoModuleOptions, MongoOptionsFactory } from "@app/common/mongodb/interfaces";
import { Inject, Injectable, Module, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable({ scope: Scope.DEFAULT })
export class MongoConfigService implements MongoOptionsFactory {

    constructor(@Inject(ConfigService) private readonly configService: ConfigService) { }

    async createMongoOptions(): Promise<MongoModuleOptions> {
        const uri = this.configService.get<string>('MONGODB_URI')
        const db = this.configService.get<string>('MONGODB_DATABASE')
        return {
            uri: uri,
            dbName: db,
            clientOptions: {
                useNewUrlParser: true,
                useUnifiedTopology: true
            }
        };
    }
}

@Module({
    imports: [],
    providers: [MongoConfigService],
    exports: [MongoConfigService],
})
export class DBModule { }