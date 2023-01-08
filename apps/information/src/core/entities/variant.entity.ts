import { VariantModel } from "../models"

export class VariantQCUrlEntity {
    url: string

    constructor(url) {
        this.url = url
    }
}

export interface IVariant {
    "id": string
    "gene": string
    "transcript_id": string
    "position": number
    "chrom": string
    "rsid": string
    "REF": string
    "ALT": string
    "cnomen": string
    "pnomen": string
    "function": string
    "location": string
    "coverage": string
    "gnomad": string
    "gnomad_ALL": string
    "cosmicID": string
    "classification": string
    "clinvar": string
    "gnomAD_AFR": string
    "gnomAD_AMR": string
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
    "Clinvar_VARIANT_ID": string
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

export interface VariantEntity extends IVariant { }

export class VariantEntity implements IVariant {
    constructor(data: VariantModel) {
        this["id"] = data._id.toString()
        this["gene"] = data.gene
        this["transcript_id"] = data.transcript
        this["position"] = data.inputPos
        this["chrom"] = data.chrom
        this["rsid"] = data.rsId
        this["REF"] = data.REF
        this["ALT"] = data.ALT
        this["cnomen"] = data.cNomen
        this["pnomen"] = data.pNomen
        this["function"] = data.codingEffect
        this["location"] = data.varLocation
        this["coverage"] = data.coverage
        this["gnomad"] = data.gnomAD_exome_ALL
        this["gnomad_ALL"] = data.gnomAD_exome_ALL
        this["cosmicID"] = data.cosmicIds
        this["classification"] = data.CLINSIG_FINAL
        this["clinvar"] = data.Clinvar_VARIANT_ID
        this["gnomAD_AFR"] = data.gnomAD_exome_AFR
        this["gnomAD_AMR"] = data.gnomAD_exome_AMR
        this["Consequence"] = data.Consequence
        this["EXON"] = data.EXON
        this["INTRON"] = data.INTRON
        this["DOMAINS"] = data.DOMAINS
        this["gnomAD_genome_AMR"] = data.gnomAD_genome_AMR
        this["gnomADe_AMR"] = data.gnomADe_AMR
        this["CLINSIG"] = data.CLINSIG
        this["NEW_CLINSIG"] = data.NEW_CLINSIG
        this["CLNACC"] = data.CLNACC
        this["SOMATIC"] = data.SOMATIC
        this["cosmics"] = data.cosmics
        this["SIFT_score"] = data.SIFT_score
        this["Polyphen2_HDIV_score"] = data.Polyphen2_HDIV_score
        this["CADD_PHRED"] = data.CADD_PHRED
        this["PUBMED"] = data.PUBMED
        this["gold_stars"] = data.gold_stars
        this["review_status"] = data.review_status
        this["Clinvar_VARIANT_ID"] = data.Clinvar_VARIANT_ID
        this["gene_omim"] = data.gene_omim
        this["GeneSplicer"] = data.GeneSplicer
        this["gnomADe_AFR"] = data.gnomADe_AFR
        this["gnomAD_genome_AFR"] = data.gnomAD_genome_AFR
        this["1000g_AFR_AF"] = data["1000g_AFR_AF"]
        this["1000g_AMR_AF"] = data["1000g_AMR_AF"]
        this["gnomADe_EAS"] = data.gnomADe_EAS
        this["gnomAD_genome_EAS"] = data.gnomAD_genome_EAS
        this["gnomADe_SAS"] = data.gnomADe_SAS
        this["1000g_SAS_AF"] = data["1000g_SAS_AF"]
        this["gnomADe_ASJ"] = data.gnomADe_ASJ
        this["gnomAD_genome_ASJ"] = data.gnomAD_genome_ASJ
        this["gnomADe_FIN"] = data.gnomADe_FIN
        this["gnomAD_genome_FIN"] = data.gnomAD_genome_FIN
        this["1000g_EUR_AF"] = data["1000g_EUR_AF"]
        this["gnomADe_NFE"] = data.gnomADe_NFE
        this["gnomAD_genome_NFE"] = data.gnomAD_genome_NFE
        this["gnomADe_OTH"] = data.gnomADe_OTH
        this["gnomADe_ALL"] = data.gnomADe_ALL
        this["gnomAD_genome_ALL"] = data.gnomAD_genome_ALL
        this["1000g_AF"] = data["1000g_AF"]
        this["gnomAD_genome_OTH"] = data.gnomAD_genome_OTH
        this["CANONICAL"] = data.CANONICAL
        this["1000g_EAS_AF"] = data["1000g_EAS_AF"]
        this["HGNC_SYMONYMS"] = data.HGNC_SYMONYMS
        this["HGNC_PRE_SYMBOL"] = data.HGNC_PRE_SYMBOL

    }
}