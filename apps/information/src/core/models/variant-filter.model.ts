import { VariantFilterDTO } from "../dto";

interface ICondition<T> {
    [key: string]: T
}


export interface IVariantFilter {
    chrom: string[]
    gene: string[]
    annotation: string[]
    classification: string[]
    alleleFrequencyFrom: number
    alleleFrequencyTo: number
    gnomADfrom: number
    gnomADto: number
    readDepthGreater: number
    readDepthLower: number
    function: string
    qualityGreater: number
    qualityLower: number
}


class Condition<T> implements ICondition<T> {
    [key: string]: T
    constructor(key: string, value: T) {
        this[key] = value
    }
}

export interface IVariantFilterCondition {
    chrom?: Condition<Array<Condition<Condition<Array<string | number>>>>>
    gene?: Condition<Condition<Array<string>>>
    annotation?: Condition<Condition<Array<string>>>
    classification?: Condition<Condition<Array<string>>>
    alleleFrequencyFrom?: Condition<Condition<number>>
    alleleFrequencyTo?: Condition<Condition<number>>
    gnomADfrom?: Condition<Condition<number>>
    gnomADto?: Condition<Condition<number>>
    readDepthGreater?: Condition<Condition<number>>
    readDepthLower?: Condition<Condition<number>>
    function?: Condition<string>
    qualityGreater?: Condition<Condition<number>>
    qualityLower?: Condition<Condition<number>>
}

export class VariantFilterConditionModel implements IVariantFilterCondition {
    chrom?: Condition<Array<Condition<Condition<Array<string | number>>>>> | undefined
    gene?: Condition<Condition<Array<string>>> | undefined
    annotation?: Condition<Condition<Array<string>>> | undefined
    classification?: Condition<Condition<Array<string>>> | undefined
    alleleFrequencyFrom?: Condition<Condition<number>>
    alleleFrequencyTo?: Condition<Condition<number>>
    gnomADfrom?: Condition<Condition<number>> | undefined
    gnomADto?: Condition<Condition<number>> | undefined
    readDepthGreater?: Condition<Condition<number>> | undefined
    readDepthLower?: Condition<Condition<number>> | undefined
    function?: Condition<string> | undefined
    qualityGreater?: Condition<Condition<number>> | undefined
    qualityLower?: Condition<Condition<number>> | undefined


    constructor(filter: IVariantFilter) {
        // Filter chrom for both number and string format
        filter.chrom ? this.chrom = new Condition("$or",
            [
                new Condition("chrom", new Condition("$in", filter.chrom)),
                new Condition("chrom", new Condition("$in", filter.chrom.filter((chr) => !isNaN(parseInt(chr))).map((chr) => parseInt(chr))))
            ]
        ) : null

        filter.gene ? this.gene = new Condition("gene", new Condition("$in", filter.gene)) : null
        filter.annotation ? this.annotation = new Condition("codingEffect", new Condition("$in", filter.annotation)) : null
        filter.classification ? this.classification = new Condition("CLINSIG_FINAL", new Condition("$in", filter.classification)) : null
        filter.alleleFrequencyFrom ? this.alleleFrequencyFrom = new Condition("alleleFrequency", new Condition("$gte", filter.alleleFrequencyFrom)) : null
        filter.alleleFrequencyTo ? this.alleleFrequencyTo = new Condition("alleleFrequency", new Condition("$lte", filter.alleleFrequencyTo)) : null
        filter.gnomADfrom ? this.gnomADfrom = new Condition("gnomAD_exome_ALL", new Condition("$gte", filter.gnomADfrom)) : null
        filter.gnomADfrom ? this.gnomADto = new Condition("gnomAD_exome_ALL", new Condition("$lte", filter.gnomADto)) : null
        filter.readDepthGreater ? this.readDepthGreater = new Condition("readDepth", new Condition("$gte", filter.readDepthGreater)) : null
        filter.readDepthLower ? this.readDepthLower = new Condition("readDepth", new Condition("$lte", filter.readDepthLower)) : null
        filter.function ? this.function = new Condition('codingEffect', filter.function) : null
        filter.qualityGreater ? this.qualityGreater = new Condition('QUAL', new Condition("$gte", filter.qualityGreater)) : null
        filter.qualityLower ? this.qualityLower = new Condition('QUAL', new Condition("$lte", filter.qualityLower)) : null
    }
}