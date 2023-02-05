import { InjectDb } from "@app/common/mongodb";
import { Injectable } from "@nestjs/common";
import { Db } from 'mongodb'
import { VariantModel } from "../models";

@Injectable({})
export class VariantRepository {
    constructor(@InjectDb() private readonly db: Db) {

    }

    async aggregate(collectionName: string, pipe: Array<{ [key: string]: any }>): Promise<any[]> {
        return await this.db.collection(collectionName).aggregate(pipe, { allowDiskUse: true }).toArray();   
    }

    async find(collectionName: string, conditions: { [key: string]: any }): Promise<any[]> {
        return await this.db.collection(collectionName).find(conditions).toArray()
    }
}