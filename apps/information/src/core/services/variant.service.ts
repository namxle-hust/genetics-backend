import { Service } from "@app/common/shared/service";
import { Injectable, Logger } from "@nestjs/common";
import { VariantProjection } from "../constants";
import { VariantFilterDTO } from "../dto";
import { IVariantFilter, TableFindInput, VariantFilterConditionModel } from "../models";
import { VariantRepository } from "../repository/variant.repository";

@Injectable()
export class VariantService extends Service {

    constructor() {
        super()
    }

    buildOffset(criteria: TableFindInput<IVariantFilter, IVariantFilter>) {
        return {
            $skip: criteria.skip
        }
    }

    buildLimit(criteria: TableFindInput<IVariantFilter, IVariantFilter>) {
        return {
            $limit: criteria.take
        }
    }

    buildMatchAndCondition(filter: IVariantFilter | undefined) {
        if (!filter) {
            return null
        }
        let conditions: VariantFilterConditionModel = new VariantFilterConditionModel(filter);
        let clause = Object.values(conditions)

        if (clause.length > 0) {
            return {
                $match: {
                    $and: clause
                }
            }
        }
        return null
    }

    buildCountPipe(criteria: TableFindInput<IVariantFilter, IVariantFilter>): Array<{ [key: string]: any }> {
        const $project = { $project: VariantProjection };
        const $match = this.buildMatchAndCondition(criteria.where)
        const $count = { $group: { _id: null, count: { $sum: 1 } } }

        let pipe = [];
        if ($match) {
            pipe.push($match)
        }

        pipe = [
            ...pipe,
            $project,
            $count,
        ]

        return pipe
    }

    buildSort() {
        return {
            "$sort": { CLINSIG_PRIORITY: 1 }
        }
    }

    buildClinsigPriority() {
        return {
            "$ifNull": [
                "$CLINSIG_PRIORITY",
                {
                    "$cond": {
                        "if": {
                            "$eq": ["$CLINSIG_FINAL", "drug response"]
                        },
                        "then": 0,
                        "else": {
                            "$cond": {
                                "if": {
                                    "$eq": ["$CLINSIG_FINAL", "pathogenic"]
                                },
                                "then": 1,
                                "else": {
                                    "$cond": {
                                        "if": {
                                            "$eq": ["$CLINSIG_FINAL", "likely pathogenic"]
                                        },
                                        "then": 2,
                                        "else": {
                                            "$cond": {
                                                "if": {
                                                    "$eq": ["$CLINSIG_FINAL", "uncertain significance"]
                                                },
                                                "then": 3,
                                                "else": {
                                                    "$cond": {
                                                        "if": {
                                                            "$eq": ["$CLINSIG_FINAL", "likely benign"]
                                                        },
                                                        "then": 4,
                                                        "else": {
                                                            "$cond": {
                                                                "if": {
                                                                    "$eq": ["$CLINSIG_FINAL", "benign"]
                                                                },
                                                                "then": 5,
                                                                "else": 6
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]
        };

    }

    buildPipe(criteria: TableFindInput<IVariantFilter, IVariantFilter>): Array<{ [key: string]: any }> {
        const CLINSIG_PRIORITY = this.buildClinsigPriority();
        const $project = { $project: { ...VariantProjection, CLINSIG_PRIORITY } };
        const $match = this.buildMatchAndCondition(criteria.where)
        const $offset = this.buildOffset(criteria);
        const $limit = this.buildLimit(criteria);
        const $sort = this.buildSort()

        let pipeFind = [];

        if ($match) {
            pipeFind.push($match)
        }


        pipeFind = [
            ...pipeFind,
            $project,
            $sort,
            $offset,
            $limit
        ]

        this.logger.debug(pipeFind)

        return pipeFind
    }

}