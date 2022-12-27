import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { InjectDb } from '@app/common/mongodb/mongo.decorators';
import { Db } from 'mongodb'

@Injectable()
export class SampleImportService {

    constructor(private prisma: PrismaService, @InjectDb() private readonly db: Db) {

    }

    getHello(): string {
        return 'Hello World!';
    }

    async test2(): Promise<string> {
        console.log(123);
        const count = await this.db.collection("samples").find();
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                return resolve(true);
            }, 10000)
        })
        return 'users count:' + count;
    }

    async test(): Promise<any> {
        // const user = await this.prisma.user.create({
        //     data: {
        //         email: 'namledz707@gmail.com',
        //         hash: "abc"
        //     }
        // })
        // return user;
    }
}
