import { Types } from "mongoose"

export interface IVariantModel {
    "_id": Types.ObjectId
    "gene": string
    "transcript": string
    "inputPos": number
    "chrom": string
    "rsId": string
    "REF": string
    "ALT": string
    "cNomen": string
    "pNomen": string
    "codingEffect": string
    "varLocation": string
    "coverage": string
    "gnomAD_exome_ALL": string
    "cosmicIds": string
    "CLINSIG_FINAL": string
    "Clinvar_VARIANT_ID": string
    "gnomAD_exome_AFR": string
    "gnomAD_exome_AMR": string
    "Consequence": string
    "EXON": string
    "INTRON": string
    "DOMAINS": string
    "gnomAD_genome_AMR": string
    "gnomADe_AMR": string
    "CLINSIG": string
    "NEW_CLINSIG": string
    "CLNACC": string
    "SOMATIC": string
    "cosmics": string
    "SIFT_score": string
    "Polyphen2_HDIV_score": string
    "CADD_PHRED": string
    "PUBMED": string
    "gold_stars": string
    "review_status": string
    "gene_omim": string
    "GeneSplicer": string
    "gnomADe_AFR": string
    "gnomAD_genome_AFR": string
    "1000g_AFR_AF": string
    "1000g_AMR_AF": string
    "gnomADe_EAS": string
    "gnomAD_genome_EAS": string
    "gnomADe_SAS": string
    "1000g_SAS_AF": string
    "gnomADe_ASJ": string
    "gnomAD_genome_ASJ": string
    "gnomADe_FIN": string
    "gnomAD_genome_FIN": string
    "1000g_EUR_AF": string
    "gnomADe_NFE": string
    "gnomAD_genome_NFE": string
    "gnomADe_OTH": string
    "gnomADe_ALL": string
    "gnomAD_genome_ALL": string
    "1000g_AF": string
    "gnomAD_genome_OTH": string
    "CANONICAL": string
    "1000g_EAS_AF": string
    "HGNC_SYMONYMS": string
    "HGNC_PRE_SYMBOL": string
}

export interface VariantModel extends IVariantModel {}

export class VariantModel implements IVariantModel {
    constructor(partial: Partial<IVariantModel>) {
        Object.assign(this, partial);
    }
}

export interface IGeneDetail {
    name: string
    full_name: string
    summary: string
    GHR_summary: string
    GHR_metadata: string
    NCBI_summary: string
    NCBI_metadata: string
}