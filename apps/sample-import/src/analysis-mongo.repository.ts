import { InjectDb } from "@app/common/mongodb";
import { Injectable } from "@nestjs/common";
import { Db } from 'mongodb'

@Injectable()
export class AnalysisMongo {
    constructor(@InjectDb() private readonly db: Db) {

    }

    async count(collectionName: string, conditions: { [key: string]: any }): Promise<any> {
        return await this.db.collection(collectionName).count(conditions);
    }

    
}