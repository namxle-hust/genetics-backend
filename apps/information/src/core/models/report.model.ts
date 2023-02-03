export interface IPgxData {
    chrom: string
    pos: string
    ref: string
    alt: string
    rsid: string
    af: number
    gene: string
    evidence: string
    related_chemicals: string
    drug_response_category: string
    annotation_text: string
}

export interface IPgxReportData {
    chrom: string
    pos: string
    ref: string
    alt: string
    af: number
    rsid: string
    drug: string
    trade_name: string
    evidence: string
    drug_response_category: string
    gene: string
    variant: string
    genotype: string
    annotation_text: any
}

export interface IReportData {
    categories: string[]
    pgxData: IPgxReportData[]
}