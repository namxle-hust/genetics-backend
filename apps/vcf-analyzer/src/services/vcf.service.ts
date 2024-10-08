import { AF_VCF_FILE, ANALYZING_FILE, ANNO_CLINVAR_FILE, ANNO_FILE, RESULT_ANNO_FILE, ANNO_VEP_FILE, RESULT_CANONICAL_FILE, ORIGIN_VEP_FILE, VARIANT_ONTOLOGY, VCF_HGMD, VCF_HGMD_CLINVAR, VCF_TRANSCRIPT_FILE } from "@app/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from 'fs'
import * as child from 'child_process'
import * as es from 'event-stream'
import { AnalysisModel } from "../models";
import { CommonService } from "./common.service";
import { CalculateService } from "./calculate.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { GetDataService } from "./get-data.service";

@Injectable()
export class VcfService {

    private readonly logger = new Logger(VcfService.name)

    private analysisId;
    private analysis: AnalysisModel;
    private analysisFolder: string;

    private tmpFolderFormat: string

    private vcfFile;
    private canonicalFile: string;
    private firstLine: boolean = true

    private vcfHGMDFile;
    private vcfHgmdClinvarFile;

    private vcfTranscriptFile;
    private originAnnoFile;
    private originVepFile;
    private annoClinvarFile;
    private annoVepFile;
    private AfVcfFile;

    private annoFile;
    private headings;

    private annoArray = [];
    private prevLine: string

    private annoStream: any
    private vcfStream: any
    private classifyStream: any

    private genomicCount = 0
    private exonicCount = 0
    private checkAF: boolean = false

    private lineIndex;

    private _transcriptDir: string
    private _hgmdTranscript: string
    private _clinvarDir: string
    private _cosmic: string
    private _clinvarBTG: string
    private _hgmdPath: string


    constructor(
        private commonService: CommonService,
        private configService: ConfigService,
        private calculateService: CalculateService,
        private getDataService: GetDataService
    ) {
        this._transcriptDir = this.configService.get<string>('TRANSCRIPT_DIR')
        this._hgmdTranscript = this.configService.get<string>('HGMD_TRANSCRIPT')
        this._clinvarDir = this.configService.get<string>('CLINVAR_DIR')
        this._clinvarBTG = this.configService.get<string>('CLINVAR_BTG')
        this._cosmic = this.configService.get<string>('COSMIC')
        this._hgmdPath = this.configService.get<string>('HGMD_PATH')

    }

    async removeFiles() {
        let command = `rm ${this.tmpFolderFormat}*`

        await this.commonService.runCommand(command);
    }



    async run(vcfFile: string, analysis: AnalysisModel, vepOutput: string) {
        try {
            this.logger.log('Run VCF')

            this.analysisId = analysis.id;
            this.analysisFolder = this.commonService.getAnalysisFolder(analysis);
            this.analysis = analysis;

            this.tmpFolderFormat = this.commonService.getTmpFolderFormat(analysis)

            this.vcfFile = vcfFile
            this.vcfHGMDFile = `${this.tmpFolderFormat}_${VCF_HGMD}`
            this.vcfHgmdClinvarFile = `${this.tmpFolderFormat}_${VCF_HGMD_CLINVAR}`

            this.canonicalFile = `${vepOutput}`

            this.vcfTranscriptFile = `${this.tmpFolderFormat}_${VCF_TRANSCRIPT_FILE}`

            this.originAnnoFile = this.vcfTranscriptFile

            this.originVepFile = `${this.tmpFolderFormat}_${ORIGIN_VEP_FILE}`

            this.annoFile = `${this.tmpFolderFormat}_${ANNO_FILE}`

            this.annoClinvarFile = `${this.tmpFolderFormat}_${ANNO_CLINVAR_FILE}`

            this.annoVepFile = `${this.tmpFolderFormat}_${ANNO_VEP_FILE}`

            this.AfVcfFile = `${this.tmpFolderFormat}_${AF_VCF_FILE}`

            this.annoStream = null
            this.vcfStream = null
            this.classifyStream = null

            await this.addTranscriptLength(vepOutput)

            await this.readVcf()

            await this.classifyVariant()

            // Upload files to s3
            await this.uploadFiles();

            // await this.removeFiles()
        } catch (error) {
            // await this.removeFiles()
            throw error
        }


        return true;
    }

    async uploadFiles() {
        let commands = [
            `cp ${this.annoVepFile} ${this.analysisFolder}/${RESULT_ANNO_FILE}`,
            `cp ${this.canonicalFile} ${this.analysisFolder}/${RESULT_CANONICAL_FILE}`
        ]

        await this.commonService.runCommand(commands.join(' && '));
    }


    async addTranscriptLength(originAnnoFile) {
        let vepStream;

        return new Promise((resolve, reject) => {
            vepStream = fs.createReadStream(originAnnoFile)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    vepStream.pause()

                    if (!vepStream.passedHeading) {

                        if (line.search('#Uploaded_variation') == 0) {
                            vepStream.passedHeading = true

                            vepStream.headings = line.split('\t')

                            vepStream.headings.push('#transcript_gene')
                            vepStream.headings.push('transcriptHGMD_gene')

                            let annoHeadings = vepStream.headings

                            fs.appendFileSync(this.originVepFile, annoHeadings.join('\t') + '\n')
                        }

                        vepStream.resume()
                    } else {
                        if (line) {
                            let lineData = line.split('\t')

                            var transcript = lineData[vepStream.headings.indexOf('Feature')].split('.')[0]

                            let varExtra = lineData[vepStream.headings.indexOf('Extra')]

                            let geneSymbol = this.calculateService.formatData(this.getDataService.getGeneSymbol(varExtra))

                            lineData.push(transcript + '_' + geneSymbol)
                            lineData.push(lineData[vepStream.headings.indexOf('Feature')] + '_' + geneSymbol)

                            fs.appendFileSync(this.originVepFile, lineData.join('\t') + '\n')

                            return vepStream.resume()

                        } else {
                            return vepStream.resume()
                        }
                    }
                }))
                .on('error', (error) => {
                    this.logger.error('Add transcript error: ', error)
                    vepStream.hasError = true
                    vepStream.destroy()
                    return reject(false);
                })
                .on('end', () => {
                    this.logger.log('Add transcript done')

                    let transcriptCommand = `awk -F"\t" 'FNR==NR{a[$1"_"$3]=$2; next}{ if (length(a[$15]) == 0) { print $0"\t0" } else { print $0"\t"a[$15] }}' ${this._transcriptDir} ${this.originVepFile} > ${this.vcfTranscriptFile} && awk -F"\t" 'FNR==NR{a[$2"_"$1]="exist"; next}{ if ( $1 == "#Uploaded_variation") { print $0"\tHGMD_transcript"} else if (a[$16] != "exist") { print $0"\t0" } else { print $0"\t"a[$16] }}' ${this._hgmdTranscript} ${this.vcfTranscriptFile} > ${this.vcfTranscriptFile}_tmp && cat ${this.vcfTranscriptFile}_tmp > ${this.vcfTranscriptFile}`;

                    child.exec(transcriptCommand, (error, stdout, stderr) => {
                        if (error) {
                            this.logger.error('Get transcript length error', error)
                            return reject(false)
                        }
                        return resolve(true)
                    })
                })
        })

    }

    async readVcf() {
        this.lineIndex = null;

        return new Promise((resolve, reject) => {
            this.vcfStream = fs.createReadStream(this.vcfFile)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    this.vcfStream.pause()

                    let eventName, extraData

                    if (this.lineIndex != null) {
                        // this.logger.debug(line);
                        // This is a data line, analyze it, and read next annotation line
                        this.lineIndex++

                        this.vcfStream.extraData = this.analyzeLine(line)

                        this.writeAfVcf(line, this.vcfStream.extraData);

                        this.resumeAnnoStream()

                    } else {
                        let lineData = line.split('\t')
                        let lineString = line;
                        if (line.search('#CHROM') == 0) {
                            // This is the heading line, let's save it for later use
                            this.lineIndex = 0
                            this.headings = line.split('\t')
                            this.logger.log(this.headings)
                            //lineData.splice(-1,1)
                            lineString = lineData.join('\t')
                        }

                        fs.appendFileSync(this.AfVcfFile, lineString + '\n')

                        this.vcfStream.extraData = []

                        // this.logger.debug(line);
                        this.vcfStream.resume()
                    }
                }))
                .on('error', (error) => {
                    this.vcfStream.hasError = true
                    this.logger.error('Read vcf error')
                    this.logger.error(error);
                    // return self.vcfEvents.emit('completed', false)
                    this.vcfStream.destroy()
                })
                .on('close', () => {
                    this.logger.log('Close readVCF')
                    if (!this.annoStream.ended) {
                        this.annoStream.ended = true
                        this.annoStream.destroy()
                    }

                    if (this.vcfStream.hasError) {
                        return reject(false);
                    } else {
                        // IF AF only 1.00 or 0.500
                        let tabixComand = '';

                        if (this.checkAF == false) {
                            let compressedFile = this.AfVcfFile + '.gz';
                            let tabixFile = this.AfVcfFile + '.gz.tbi';
                            let compressedFileDist = this.vcfFile + '.gz';
                            let tabixFileDist = this.vcfFile + '.gz.tbi';

                            tabixComand = `bgzip -f ${this.AfVcfFile} && tabix -f ${compressedFile} && rm -rf ${compressedFileDist} ${tabixFileDist} && mv -f ${compressedFile} ${compressedFileDist} && mv -f ${tabixFile} ${tabixFileDist} && `
                        }

                        let clearRefAlt = `awk -F"\t" 'BEGIN{OFS="\t"}{ref = $7;alt = $8; chrom = $5; pos = $6; gene = $16; if(index($0, "analysisId") == 1) { print $0;} else if (length(ref) == 1 || length(alt) == 1) { $83=chrom"_"pos"_"ref"_"alt"_"gene; print $0;} else if (substr(ref,length(ref),1) != substr(alt,length(alt),1)) {$83=chrom"_"pos"_"ref"_"alt"_"gene; print $0;} else {while (length(ref) != 1 && length(alt) != 1 && substr(ref,length(ref),1) == substr(alt,length(alt),1)) {ref = substr(ref, 1, length(ref)-1);alt = substr(alt, 1, length(alt)-1);}$83=chrom"_"pos"_"ref"_"alt"_"gene; print $0;}}' ${this.annoFile} >  ${this.annoFile}_temp && mv -f ${this.annoFile}_temp ${this.annoFile} && `

                        // Add ClinVar
                        let clinVarCommand = `awk -F"\t" 'FNR==NR{a[$1"_"$2"_"$3"_"$4"_"$7]=$5"\t"$6"\t"$8"\t"$9"\t"$10"\t"$11; b[$1"_"$2"_"$3"_"$4"_"$7]=$12; next}{ curation = (length(b[$83]) == 0) ? "." : b[$83]; if(index($0, "analysisId") == 1) {print $0"\tCLNACC\tCLNSIG_BTG\treview_status\tlast_evaluated\tgold_stars\tconsensus_score\tcuration"} else if (length(a[$83]) == 0) { print $0"\t.\t.\t.\t.\t.\t.\t"curation } else { print $0"\t"a[$83]"\t"curation }}' ${this._clinvarDir} ${this.annoFile}  > ${this.vcfHGMDFile} `

                        // Add Nan ClinVar
                        let BTGConcensusCommand = `&& awk -F"\t" 'FNR==NR{a[$1]=$2; next}{ if(index($0, "analysisId") == 1) {print $0"\tBTG_Concensus"} else if (length(a[$5"-"$6"-"$7"-"$8"-"$16]) == 0) { print $0"\t." } else { print $0"\t"a[$5"-"$6"-"$7"-"$8"-"$16] }}' ${this._clinvarBTG} ${this.vcfHGMDFile}  > ${this.vcfHGMDFile}_temp && mv -f ${this.vcfHGMDFile}_temp ${this.vcfHGMDFile} `

                        // Add Nan Clinvar 03 2020
                        clinVarCommand += BTGConcensusCommand;
                        // clinVarCommand += AddClinvarCommand;

                        // Add cosmic
                        let addCosmicID = `&& awk -F"\t" 'BEGIN{OFS="\t"}FNR==NR{a[$2]=$1; next}{if(length(a[$14]) == 0){ print $0; } else { if (a[$14] == $16) { print $0; } else { $14 = "."; print $0;}  } }' ${this._cosmic} ${this.vcfHGMDFile} > ${this.annoFile} `

                        // Add HGMD
                        let hgmdCommand = `&& awk -F"\t" 'BEGIN{OFS="\t"}FNR==NR{a[$1"_"$2"_"$3"_"$4"_"$5]=$6; next}{ if(index($0, "analysisId") == 1) {print $0"\tHGMD"} else if (length(a[$83]) == 0) { print $0"\t."; } else { print $0"\tDM"; }}' ${this._hgmdPath} ${this.annoFile} > ${this.vcfHgmdClinvarFile}`

                        // Move anno file from tmp dir to S3 dir
                        // Remote origin anno file

                        let removeCommand = `rm -f ${this.annoFile} && rm -f ${this.vcfTranscriptFile} && rm -f ${this.originVepFile}`

                        let command = `${tabixComand}${clearRefAlt}${clinVarCommand} ${addCosmicID} ${hgmdCommand}`


                        child.exec(command, (error, stdout, stderr) => {
                            if (error) {
                                this.logger.error('Move anno error', error)
                                return reject(false);
                            }

                            this.logger.log('Move Anno Success')
                            return resolve(true)
                        })
                    }
                })
        })
    }

    async classifyVariant() {
        let lineIndex = null
        return new Promise((resolve, reject) => {
            this.classifyStream = fs.createReadStream(this.vcfHgmdClinvarFile)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    this.classifyStream.pause()

                    let lineData = line.split('\t')
                    if (lineIndex == null) {
                        this.classifyStream.headings = line.split('\t')
                        lineIndex = 0
                        fs.appendFileSync(this.annoVepFile, line + '\n')
                    } else if (lineData.length > 5) {

                        //let CLINSIG = lineData[self.classifyStream.headings.indexOf('CLINSIG')]
                        let VARIANT_ID = lineData[this.classifyStream.headings.indexOf('Clinvar_VARIANT_ID')]
                        let codingEffect = lineData[this.classifyStream.headings.indexOf('codingEffect')]
                        let gene = lineData[this.classifyStream.headings.indexOf('gene')]
                        let CLNSIG_ID = lineData[this.classifyStream.headings.indexOf('CLNACC')]
                        let BTG_CLINSIG = lineData[this.classifyStream.headings.indexOf('CLNSIG_BTG')]
                        let HGMD = lineData[this.classifyStream.headings.indexOf('HGMD')]
                        let BTG_Concensus = lineData[this.classifyStream.headings.indexOf('BTG_Concensus')]
                        let GoldStars = lineData[this.classifyStream.headings.indexOf('gold_stars')]
                        let VAR_SCORE = lineData[this.classifyStream.headings.indexOf('VAR_SCORE')]
                        let Curation = lineData[this.classifyStream.headings.indexOf('curation')]

                        let ClinvarText = BTG_CLINSIG.split(";_").join(", ")
                        let ClinvarText2 = ClinvarText.split("_").join(" ")
                        let ClinvarText3 = ClinvarText2.split("/").join(", ")
                        let CLINSIG = ClinvarText3

                        let alleleFrequencyData = {
                            BTG_Concensus: BTG_Concensus,
                            GoldStars: GoldStars != '.' ? parseInt(GoldStars) : 0,
                            VAR_SCORE: GoldStars != '.' ? parseFloat(VAR_SCORE) : 0,
                            Curation: Curation != '.' ? Curation : '.',
                            AF: lineData[this.classifyStream.headings.indexOf('alleleFrequency')],
                            gnomAD_exome_ALL: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_ALL')],
                            gnomAD_exome_AFR: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_AFR')],
                            gnomAD_exome_AMR: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_AMR')],
                            gnomAD_exome_ASJ: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_ASJ')],
                            gnomAD_exome_EAS: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_EAS')],
                            gnomAD_exome_FIN: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_FIN')],
                            gnomAD_exome_NFE: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_NFE')],
                            gnomAD_exome_OTH: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_OTH')],
                            gnomAD_exome_SAS: lineData[this.classifyStream.headings.indexOf('gnomAD_exome_SAS')],
                            ExAC_ALL: lineData[this.classifyStream.headings.indexOf('ExAC_ALL')],
                            ExAC_AFR: lineData[this.classifyStream.headings.indexOf('ExAC_AFR')],
                            ExAC_AMR: lineData[this.classifyStream.headings.indexOf('ExAC_AMR')],
                            ExAC_EAS: lineData[this.classifyStream.headings.indexOf('ExAC_EAS')],
                            ExAC_FIN: lineData[this.classifyStream.headings.indexOf('ExAC_FIN')],
                            ExAC_NFE: lineData[this.classifyStream.headings.indexOf('ExAC_NFE')],
                            ExAC_OTH: lineData[this.classifyStream.headings.indexOf('ExAC_OTH')],
                            ExAC_SAS: lineData[this.classifyStream.headings.indexOf('ExAC_SAS')],
                            AF_1000g: lineData[this.classifyStream.headings.indexOf('AF')],
                            EAS_AF_1000g: lineData[this.classifyStream.headings.indexOf('1000g_EAS_AF')],
                            AMR_AF_1000g: lineData[this.classifyStream.headings.indexOf('1000g_AMR_AF')],
                            AFR_AF_1000g: lineData[this.classifyStream.headings.indexOf('1000g_AFR_AF')],
                            EUR_AF_1000g: lineData[this.classifyStream.headings.indexOf('1000g_EUR_AF')],
                            SAS_AF_1000g: lineData[this.classifyStream.headings.indexOf('1000g_SAS_AF')],
                            varLocation: lineData[this.classifyStream.headings.indexOf('varLocation')],
                        }

                        let classificationData = this.calculateService.calculateClinsigFinal(CLINSIG, alleleFrequencyData, codingEffect, gene, CLNSIG_ID, HGMD)

                        lineData[this.classifyStream.headings.indexOf('CLINSIG_PRIORITY')] = classificationData.CLINSIG_PRIORITY;
                        lineData[this.classifyStream.headings.indexOf('CLINSIG_FINAL')] = classificationData.CLINSIG_FINAL;
                        lineData[this.classifyStream.headings.indexOf('hasClinicalSynopsis')] = classificationData.hasClinicalSynopsis;
                        lineData[this.classifyStream.headings.indexOf('lossOfFunction')] = classificationData.lossOfFunction;
                        lineData[this.classifyStream.headings.indexOf('CLINSIG')] = CLINSIG;
                        lineData[this.classifyStream.headings.indexOf('Clinvar_VARIANT_ID')] = CLNSIG_ID;

                        if (classificationData.curation == 'Curated') {
                            lineData[this.classifyStream.headings.indexOf('curation')] = 'Curated ';
                        }

                        fs.appendFileSync(this.annoVepFile, lineData.join('\t') + '\n')
                    }

                    this.classifyStream.resume()
                }))
                .on('error', (error) => {
                    this.classifyStream.hasError = true
                    this.logger.error('classifyVariant error', error)
                    this.classifyStream.destroy()
                })
                .on('close', () => {
                    if (this.classifyStream.hasError) {
                        // this.vcfEvents.emit('completed', false)
                        return reject(false)
                    } else {
                        this.logger.log('Classify Variant completed')
                        return resolve(true);
                    }
                })
        })

    }

    analyzeLine(vcfLine) {
        if (vcfLine) {
            let modified = ''
            let data = vcfLine.split('\t')

            let altIndex = this.headings.indexOf('ALT')
            let refIndex = this.headings.indexOf('REF')
            let qualIndex = this.headings.indexOf('QUAL')
            let filterIndex = this.headings.indexOf('FILTER')
            let infoIndex = this.headings.indexOf('INFO')

            let result = this.calculateData(data)
            result.analysisId = this.analysisId
            result.REF = data[refIndex]
            result.QUAL = data[qualIndex]
            result.FILTER = data[filterIndex]
            result.INFO = data[infoIndex]

            if (result.INFO.indexOf(';CSQ=') != -1) {
                let vepRL = result.INFO.split(';CSQ=')[1];
                let geneTranscipt = vepRL.split('|')[6];
                result.MT = geneTranscipt
            }

            // Column ALT may contain multiples value seperated by a comma
            result.ALT = data[altIndex].split(',')

            let chromIndex = this.headings.indexOf('#CHROM')
            let inputPosIndex = this.headings.indexOf('POS')

            result.chrom = data[chromIndex]
            result.inputPos = data[inputPosIndex]

            return result
        }

        return false
    }

    resumeAnnoStream() {
        if (this.annoStream) {
            this.annoStream.resume()
        } else {
            this.readAnno()
        }
    }

    readAnno() {
        this.annoArray = []
        this.prevLine = '';
        this.annoStream = fs.createReadStream(this.originAnnoFile)
            .pipe(es.split())
            .pipe(es.mapSync((line) => {
                this.annoStream.pause()

                if (!this.annoStream.passedHeading) {
                    if (line.search('#Uploaded_variation') == 0) {
                        this.annoStream.passedHeading = true
                        this.annoStream.headings = line.split('\t')

                        let annoHeadings = [
                            "analysisId",
                            "readDepth",
                            "alleleFrequency",
                            "coverage",
                            "chrom",
                            "inputPos",
                            "REF",
                            "ALT",
                            "rsId",
                            "transcript",
                            "nucChange",
                            "cNomen",
                            "pNomen",
                            "cosmicIds",
                            "clinVarIds",
                            "gene",
                            "codingEffect",
                            "varLocation",
                            "ExAC_ALL",
                            "ExAC_AFR",
                            "ExAC_AMR",
                            "ExAC_EAS",
                            "ExAC_FIN",
                            "ExAC_NFE",
                            "ExAC_OTH",
                            "ExAC_SAS",
                            "gnomAD_exome_ALL",
                            "gnomAD_exome_AFR",
                            "gnomAD_exome_AMR",
                            "gnomAD_exome_ASJ",
                            "gnomAD_exome_EAS",
                            "gnomAD_exome_FIN",
                            "gnomAD_exome_NFE",
                            "gnomAD_exome_OTH",
                            "gnomAD_exome_SAS",
                            "SIFT_score",
                            "Polyphen2_HDIV_score",
                            "CADD_phred",
                            "CADD_raw",
                            "CLINSIG",
                            "1000g_AF",
                            "1000g_EAS_AF",
                            "1000g_AMR_AF",
                            "transcriptIds",
                            "cosmics",
                            "chrom_pos_ref_alt_gene",
                            "#Chr_Start_Ref_Alt_Ref.Gene",
                            "Consequence",
                            "varHGVSc",
                            "varHGVSp",
                            "EXON",
                            "INTRON",
                            "DOMAINS",
                            "1000g_AFR_AF",
                            "1000g_EUR_AF",
                            "1000g_SAS_AF",
                            "AA_AF",
                            "EA_AF",
                            "MAX_AF",
                            "MAX_AF_POPS",
                            "SOMATIC",
                            "PHENO",
                            "PUBMED",
                            "MOTIF_NAME",
                            "MOTIF_POS",
                            "HIGH_INF_POS",
                            "MOTIF_SCORE_CHANGE",
                            "CADD_PHRED",
                            "CADD_RAW",
                            "CANONICAL",
                            "CLINSIG_PRIORITY",
                            "CLINSIG_FINAL",
                            "hasClinicalSynopsis",
                            "lossOfFunction",
                            "inputPosInt",
                            "gnomAD_exome_ALL_Int",
                            "gnomAD_exome_AFR_Int",
                            "gnomAD_exome_AMR_Int",
                            "CDS_position",
                            "selected_variant",
                            "HGNC_SYMONYMS",
                            "HGNC_PRE_SYMBOL",
                            "VariantMatching",
                            "withdrawn_gene",
                            "SIFT",
                            "Polyphen2",
                            "gnomAD_genome_ALL",
                            "gnomAD_genome_AFR",
                            "gnomAD_genome_AMR",
                            "gnomAD_genome_ASJ",
                            "gnomAD_genome_EAS",
                            "gnomAD_genome_FIN",
                            "gnomAD_genome_NFE",
                            "gnomAD_genome_OTH",
                            "gnomADe_ALL",
                            "gnomADe_AFR",
                            "gnomADe_AMR",
                            "gnomADe_ASJ",
                            "gnomADe_EAS",
                            "gnomADe_FIN",
                            "gnomADe_NFE",
                            "gnomADe_OTH",
                            "gnomADe_SAS",
                            "Clinvar_VARIANT_ID",
                            "masterMind_MMID3",
                            "masterMind_MMCNT3",
                            "masterMind_GENE",
                            "GeneSplicer",
                            "IMPACT",
                            "STRAND",
                            "VARIANT_CLASS",
                            "VAR_GENE",
                            "VAR_SCORE",
                            "QUAL",
                            "FILTER",
                            "GT",
                            "Trimmed_variant",
                            "AF_hom",
                            "AF_het",
                            "pop_AF_hom",
                            "pop_AF_het"
                        ]

                        this.annoStream.firstLine = true;

                        fs.appendFileSync(this.annoFile, annoHeadings.join('\t'))
                    }

                    this.annoStream.resume()
                } else {
                    let lineData = line.split('\t')

                    if (line && this.annoStream.firstLine) {
                        this.annoStream.firstLine = false;

                        this.annoStream.currentChromPos = lineData[this.annoStream.headings.indexOf('Location')];
                        this.annoStream.currentAllele = lineData[this.annoStream.headings.indexOf('Allele')];
                        this.annoStream.currentClass = this.calculateService.getExtraData('VARIANT_CLASS', lineData[this.annoStream.headings.indexOf('Extra')]);
                        this.annoStream.currentRef = this.calculateService.getExtraData('GIVEN_REF', lineData[this.annoStream.headings.indexOf('Extra')]);

                        this.annoArray.push(line)
                        return this.annoStream.resume()
                    }

                    if (line) {

                        var lineLocation = lineData[this.annoStream.headings.indexOf('Location')]

                        let varLocation = lineLocation.split('-')

                        let vepInputPos = varLocation[0].split(':')[1];

                        let intVepInputPos = parseInt(vepInputPos) - 1

                        let varExtra = lineData[this.annoStream.headings.indexOf('Extra')]

                        if (this.vcfStream.extraData
                            && (this.vcfStream.extraData.inputPos == vepInputPos || this.vcfStream.extraData.inputPos == intVepInputPos)
                            && this.annoStream.currentChromPos == lineLocation
                            && this.annoStream.currentAllele == lineData[this.annoStream.headings.indexOf('Allele')]
                            && this.annoStream.currentClass == this.calculateService.getExtraData('VARIANT_CLASS', varExtra)
                            && (this.annoStream.currentRef == this.calculateService.getExtraData('GIVEN_REF', varExtra) || null == this.calculateService.getExtraData('GIVEN_REF', varExtra))
                        ) {
                            this.annoArray.push(line)
                            return this.annoStream.resume()
                        }

                        this.annoStream.currentChromPos = lineLocation
                        this.annoStream.currentAllele = lineData[this.annoStream.headings.indexOf('Allele')]
                        this.annoStream.currentClass = this.calculateService.getExtraData('VARIANT_CLASS', varExtra)
                        this.annoStream.currentRef = this.calculateService.getExtraData('GIVEN_REF', varExtra)

                        this.prevLine = line

                        this.filterVariant(this.annoArray, this.vcfStream.extraData);

                        this.annoArray = []
                        this.annoArray.push(line)

                        return this.vcfStream.resume()

                    } else {
                        return this.annoStream.resume()
                    }
                }
            }))
            .on('error', (error) => {
                this.logger.log('Read anno error', error)
                this.vcfStream.hasError = true
                // return this.vcfEvents.emit('completed', false)
                this.vcfStream.ended = true
                return this.vcfStream.destroy()
            })
            .on('end', () => {
                this.filterVariant(this.annoArray, this.vcfStream.extraData);

                if (!this.vcfStream.ended) {
                    this.vcfStream.ended = true
                    this.vcfStream.destroy()
                }

            })
    }

    filterVariant(annoArray, vcfExtraData) {
        let NM_Array = [];
        let NR_Array = [];
        let XM_Array = [];
        let XR_Array = [];
        let ENST_Array = [];
        let Other_Array = [];
        let Gene_Array = []

        let Gene_Name = '.';

        let line = '';
        let transcriptArray = [];

        let refseqGene = []

        for (var i in annoArray) {
            line = annoArray[i];
            let lineData = line.split('\t');
            let transcript = lineData[this.annoStream.headings.indexOf('Feature')]
            let extraColumn = lineData[this.annoStream.headings.indexOf('Extra')]

            let geneName = this.calculateService.formatData(this.getDataService.getGeneSymbol(extraColumn));

            let geneColumn = this.calculateService.formatData(lineData[this.annoStream.headings.indexOf('Gene')])

            let varHGVSc = this.calculateService.getExtraData('HGVSc', extraColumn);
            let varHGVSp = this.calculateService.getExtraData('HGVSp', extraColumn);


            let cNomen = '.';
            let pNomen = '.';

            if (varHGVSc != null) {
                let cNomenArray = varHGVSc.split(':');
                if (cNomenArray[1] != undefined) {
                    cNomen = cNomenArray[1];
                }
            }

            if (varHGVSp != null) {
                let pNomenArray = varHGVSp.split(':');
                if (pNomenArray[1] != undefined) {
                    pNomen = pNomenArray[1];
                    pNomen = pNomen.replace("%3D", "=");
                }
            }

            transcriptArray.push(transcript + ':' + geneColumn + ':' + this.calculateService.formatData(geneName) + ':' + cNomen + ':' + pNomen);

            if (transcript.indexOf('NM') != -1) {
                NM_Array.push(line)
                if (refseqGene.indexOf(geneName) == -1 && geneName.indexOf('withdrawn') == -1) {
                    refseqGene.push(geneName)
                }
            } else if (transcript.indexOf('NR') != -1) {
                NR_Array.push(line)
                if (refseqGene.indexOf(geneName) == -1 && geneName.indexOf('withdrawn') == -1) {
                    refseqGene.push(geneName)
                }
            } else if (transcript.indexOf('ENST') != -1) {
                ENST_Array.push(line)
            } else {
                Other_Array.push(line)
            }

            if (Gene_Array.indexOf(geneName) == -1) {
                Gene_Array.push(geneName)
            }
        }

        let checkAllWithdrawn = true;
        for (var i in Gene_Array) {
            if (Gene_Array[i].indexOf('withdrawn') == -1) {
                checkAllWithdrawn = false;
            }
        }

        if (Gene_Array.length == 1 || checkAllWithdrawn == true) {

            var geneLine = this.selectLongestTranscriptByGene(NM_Array, NR_Array, ENST_Array, Other_Array, Gene_Array[0]);
            vcfExtraData.gene = Gene_Array[0];
            let selectedGene = 1;
            if (geneLine == '') {
                this.logger.error('geneLine False')
                this.logger.error(JSON.stringify(vcfExtraData))
                this.logger.error('gene: ' + Gene_Array[0])
                this.logger.error('Anno Array: ')
                this.logger.error(JSON.stringify(annoArray))
            }

            if (geneLine != '') {
                this.appendToAnnoFile(geneLine, vcfExtraData, transcriptArray.join('|'), selectedGene);
            }
        } else {
            let selectedGene = 0;

            if ((vcfExtraData.chrom == 'MT' || vcfExtraData.chrom == 'M' || vcfExtraData.chrom == 'chrM' || vcfExtraData.chrom == 'chrMT') && vcfExtraData.INFO.indexOf(';CSQ=') != -1) {
                if (vcfExtraData.MT == '' || vcfExtraData.MT == null) {
                    selectedGene = 1;
                }
            } else if (refseqGene.length == 0) {
                selectedGene = 1;
            }
            for (var i in Gene_Array) {
                if (Gene_Array[i].indexOf('withdrawn') == -1) {
                    var geneLine = this.selectLongestTranscriptByGene(NM_Array, NR_Array, ENST_Array, Other_Array, Gene_Array[i]);
                    vcfExtraData.gene = Gene_Array[i];

                    if (geneLine == '') {
                        this.logger.error('geneLine False')
                        this.logger.error(JSON.stringify(vcfExtraData))
                        this.logger.error('gene: ' + Gene_Array[i])
                        this.logger.error('Anno Array: ')
                        this.logger.error(JSON.stringify(annoArray))
                    }

                    if (geneLine != '') {


                        if ((vcfExtraData.chrom == 'MT' || vcfExtraData.chrom == 'M' || vcfExtraData.chrom == 'chrM' || vcfExtraData.chrom == 'chrMT') && vcfExtraData.INFO.indexOf(';CSQ=') != -1) {
                            if (geneLine.indexOf(vcfExtraData.MT) != -1) {
                                selectedGene = 1;
                            }
                        } else {
                            if (refseqGene.length > 0 && Gene_Array[i] == refseqGene[0]) {
                                selectedGene = 1;
                            }
                        }

                        this.appendToAnnoFile(geneLine, vcfExtraData, transcriptArray.join('|'), selectedGene);
                        if (selectedGene == 1) {
                            selectedGene = 0
                        }
                    }
                }
            }
        }
    }


    appendToAnnoFile(line, vcfExtraData, transcriptIds, selectedGene) {
        let lineData = line.split('\t');
        let extraData = lineData[this.annoStream.headings.indexOf('Extra')]
        let transcript = this.calculateService.formatData(lineData[this.annoStream.headings.indexOf('Feature')])
        let codingEffect = this.getDataService.getCodingEffect(lineData[this.annoStream.headings.indexOf('Consequence')])
        let varLocation = this.getDataService.getVarLocation(lineData[this.annoStream.headings.indexOf('Consequence')])
        let Consequence = this.calculateService.formatData(lineData[this.annoStream.headings.indexOf('Consequence')])
        let CDS_position = this.calculateService.formatData(lineData[this.annoStream.headings.indexOf('CDS_position')])

        let varHGVSc = this.calculateService.getExtraData('HGVSc', extraData);
        let varHGVSp = this.calculateService.getExtraData('HGVSp', extraData);
        let STRAND = this.calculateService.getExtraData('STRAND', extraData);

        let tmpcosmicIds = this.getDataService.getCosmicIds(lineData[this.annoStream.headings.indexOf('Existing_variation')]);

        let cosmicIds = '.'
        let cosmic = '.'

        if (tmpcosmicIds && tmpcosmicIds.length > 0) {
            cosmic = tmpcosmicIds[0];

            cosmicIds = tmpcosmicIds.join('|')
        }

        let CLINSIG = this.calculateService.formatData(this.calculateService.getExtraData('CLIN_SIG', extraData))

        let cNomen = '.';
        let pNomen = '.';
        let gene = this.calculateService.formatData(this.getDataService.getGeneSymbol(extraData));
        let withdrawnGene = 0;

        if (gene.indexOf('~withdrawn') != -1) {
            gene = gene.split('~withdrawn')[0]
            withdrawnGene = 1
        }

        if (varHGVSc != null) {
            let cNomenArray = varHGVSc.split(':');
            if (cNomenArray[1] != undefined) {
                cNomen = cNomenArray[1];
            }
        }

        if (varHGVSp != null) {
            let pNomenArray = varHGVSp.split(':');
            if (pNomenArray[1] != undefined) {
                pNomen = pNomenArray[1];
                pNomen = pNomen.replace("%3D", "=");
            }
        }

        var lineLocation = lineData[this.annoStream.headings.indexOf('Location')]

        let vepVarLocation = lineLocation.split('-')

        vcfExtraData.chrom = vcfExtraData.chrom.split('chr').join('')

        let vepPOS = vepVarLocation[0].split(':')[1];
        let vepChrom = vepVarLocation[0].split(':')[0].split('chr').join('');
        let vepALT = lineData[this.annoStream.headings.indexOf('Allele')]
        let vepREF = this.calculateService.getExtraData('GIVEN_REF', extraData)
        let vcfDataIndex = vcfExtraData.chrom + '_' + vcfExtraData.inputPos + '_' + vcfExtraData.REF + '_' + vcfExtraData.ALT + '_' + gene;

        let deletionNucle = this.getDataService.getDeletion(vcfExtraData.REF, vcfExtraData.ALT[0], STRAND)
        // let shortVcfDataIndex = vcfExtraData.chrom + '_' + vcfExtraData.inputPos + '_' + shortedRefAlt.REF + '_' + shortedRefAlt.ALT + '_' + gene;

        if (cNomen != '.' && deletionNucle != '' && cNomen.substr(cNomen.length - 3) == 'del') {
            cNomen = cNomen + deletionNucle
        }

        let vepDataIndex = vepChrom + '_' + vepPOS + '_' + vepREF + '_' + vepALT + '_' + gene;

        let Variant_ID = this.calculateService.formatData(this.calculateService.getExtraData('Clinvar_VARIANT_ID', extraData))
        let AF_1000g = this.calculateService.formatData(this.calculateService.getExtraData('AF', extraData))
        let EAS_AF_1000g = this.calculateService.formatData(this.calculateService.getExtraData('EAS_AF', extraData))
        let AMR_AF_1000g = this.calculateService.formatData(this.calculateService.getExtraData('AMR_AF', extraData))
        let AFR_AF_1000g = this.calculateService.formatData(this.calculateService.getExtraData('AFR_AF', extraData))
        let EUR_AF_1000g = this.calculateService.formatData(this.calculateService.getExtraData('EUR_AF', extraData))
        let SAS_AF_1000g = this.calculateService.formatData(this.calculateService.getExtraData('SAS_AF', extraData))

        let AA_AF = this.calculateService.formatData(this.calculateService.getExtraData('AA_AF', extraData))
        let EA_AF = this.calculateService.formatData(this.calculateService.getExtraData('EA_AF', extraData))

        CLINSIG = this.getDataService.formatCLINSIG(CLINSIG)

        let alleleFrequencyData = {
            AF: vcfExtraData.alleleFrequency,
            gnomAD_exome_ALL: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF', extraData)),
            gnomAD_exome_AFR: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_afr', extraData)),
            gnomAD_exome_AMR: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_amr', extraData)),
            gnomAD_exome_ASJ: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_asj', extraData)),
            gnomAD_exome_EAS: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_eas', extraData)),
            gnomAD_exome_FIN: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_fin', extraData)),
            gnomAD_exome_NFE: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_nfe', extraData)),
            gnomAD_exome_OTH: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_oth', extraData)),
            gnomAD_exome_SAS: this.calculateService.formatData(this.calculateService.getExtraData('gnomADe_AF_sas', extraData)),
            gnomAD_genome_ALL: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF', extraData)),
            gnomAD_genome_AFR: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_afr', extraData)),
            gnomAD_genome_AMR: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_amr', extraData)),
            gnomAD_genome_ASJ: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_asj', extraData)),
            gnomAD_genome_EAS: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_eas', extraData)),
            gnomAD_genome_FIN: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_fin', extraData)),
            gnomAD_genome_NFE: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_nfe', extraData)),
            gnomAD_genome_OTH: this.calculateService.formatData(this.calculateService.getExtraData('gnomADg_AF_oth', extraData)),
            ExAC_ALL: this.calculateService.calculateExac('_Adj', extraData),
            ExAC_AFR: this.calculateService.calculateExac('_AFR', extraData),
            ExAC_AMR: this.calculateService.calculateExac('_AMR', extraData),
            ExAC_EAS: this.calculateService.calculateExac('_EAS', extraData),
            ExAC_FIN: this.calculateService.calculateExac('_FIN', extraData),
            ExAC_NFE: this.calculateService.calculateExac('_NFE', extraData),
            ExAC_OTH: this.calculateService.calculateExac('_OTH', extraData),
            ExAC_SAS: this.calculateService.calculateExac('_SAS', extraData),
            AF_1000g: this.calculateService.formatData(this.calculateService.getExtraData('AF', extraData)),
            EAS_AF_1000g: this.calculateService.formatData(this.calculateService.getExtraData('EAS_AF', extraData)),
            AMR_AF_1000g: this.calculateService.formatData(this.calculateService.getExtraData('AMR_AF', extraData)),
            AFR_AF_1000g: this.calculateService.formatData(this.calculateService.getExtraData('AFR_AF', extraData)),
            EUR_AF_1000g: this.calculateService.formatData(this.calculateService.getExtraData('EUR_AF', extraData)),
            SAS_AF_1000g: this.calculateService.formatData(this.calculateService.getExtraData('SAS_AF', extraData)),
        }

        let gnomAD_MAX_AF = this.getDataService.getMAX_AF(alleleFrequencyData)

        let MAX_AF = gnomAD_MAX_AF.MAX_AF
        let MAX_AF_POPS = gnomAD_MAX_AF.MAX_AF_POPS

        let SIFT_score = this.calculateService.formatData(this.calculateService.getExtraData('SIFT', extraData))
        let PolyPhen_score = this.calculateService.formatData(this.calculateService.getExtraData('PolyPhen', extraData))

        let SIFT_number = '.'

        if (SIFT_score != '.') {
            SIFT_number = SIFT_score.split('(')[1].split(')')[0]
        }

        let PolyPhen_number = '.'

        if (PolyPhen_score != '.') {
            PolyPhen_number = PolyPhen_score.split('(')[1].split(')')[0]
        }

        //let CLINSIG_DATA = this.calculateClinsigFinal(CLINSIG, alleleFrequencyData, codingEffect, gene)

        let HGNC_SYMONYMS = this.calculateService.formatData(this.calculateService.getExtraData('HGNC_SYNONYMS', extraData))
        let HGNC_PRE_SYMBOL = this.calculateService.formatData(this.calculateService.getExtraData('HGNC_PRE_SYMBOL', extraData))

        let geneSplicer = this.calculateService.getExtraData('GeneSplicer', extraData);
        let IMPACT = this.calculateService.getExtraData('IMPACT', extraData);
        let VARIANT_CLASS = this.calculateService.getExtraData('VARIANT_CLASS', extraData);

        let VAR_GENE = this.calculateService.formatData(this.calculateService.getExtraData('variantScore_VAR_GENE', extraData))
        let VAR_SCORE = this.calculateService.formatData(this.calculateService.getExtraData('variantScore_VAR_SCORE', extraData))
        let VAR_GENE_VAL = '.'
        let VAR_SCORE_VAL = '.'

        let rsId = this.calculateService.formatData(this.calculateService.getExtraData('dbSNP_RS', extraData))
        rsId = rsId != '.' ? ('rs' + rsId) : '.';
        let rsIdVep = this.calculateService.formatData(this.getDataService.getRsID(lineData[this.annoStream.headings.indexOf('#Uploaded_variation')], lineData[this.annoStream.headings.indexOf('Existing_variation')]));
        rsId = rsId != '.' ? rsId : rsIdVep;

        if (VAR_GENE != '.') {
            let VAR_GENE_AR = VAR_GENE.split(',');
            let VAR_SCORE_AR = VAR_SCORE.split(',');

            for (var i in VAR_GENE_AR) {
                if (VAR_GENE_AR[i] == gene) {
                    VAR_GENE_VAL = gene
                    VAR_SCORE_VAL = VAR_SCORE_AR[i]
                }
            }
        }

        let TrimmedVariant = this.calculateService.convert(vcfExtraData.chrom, vcfExtraData.inputPos, vcfExtraData.REF, vcfExtraData.ALT[0], gene)

        let data = [
            vcfExtraData.analysisId,                                            //  analysisId
            vcfExtraData.readDepth,                                             //  readDepth
            vcfExtraData.alleleFrequency,                                       //  alleleFrequency
            vcfExtraData.coverage,                                              //  coverage
            vcfExtraData.chrom,                                                 //  chrom
            vcfExtraData.inputPos,                                              //  inputPos
            vcfExtraData.REF,                                                   //  REF
            vcfExtraData.ALT,                                                   //  ALT
            rsId,                                                               //  rsId
            transcript,                                                         //  transcript
            `${vcfExtraData.REF}>${vcfExtraData.ALT[0]}`,                       //  nucChange
            cNomen,                                                             //  cNomen
            pNomen,                                                             //  pNomen
            cosmic,                                                             //  cosmicIds
            '.',                                                                //  clinVarIds
            gene,                                                               //  gene
            codingEffect,                                                       //  codingEffect
            varLocation,                                                        //  varLocation
            alleleFrequencyData.ExAC_ALL,                                       //  ExAC_ALL
            alleleFrequencyData.ExAC_AFR,                                       //  ExAC_AFR
            alleleFrequencyData.ExAC_AMR,                                       //  ExAC_AMR
            alleleFrequencyData.ExAC_EAS,                                       //  ExAC_EAS
            alleleFrequencyData.ExAC_FIN,                                       //  ExAC_FIN
            alleleFrequencyData.ExAC_NFE,                                       //  ExAC_NFE
            alleleFrequencyData.ExAC_OTH,                                       //  ExAC_OTH
            alleleFrequencyData.ExAC_SAS,                                       //  ExAC_SAS
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_ALL, alleleFrequencyData.gnomAD_genome_ALL),    //  gnomAD_exome_ALL
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_AFR, alleleFrequencyData.gnomAD_genome_AFR),    //  gnomAD_exome_AFR
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_AMR, alleleFrequencyData.gnomAD_genome_AMR),    //  gnomAD_exome_AMR
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_ASJ, alleleFrequencyData.gnomAD_genome_ASJ),    //  gnomAD_exome_ASJ
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_EAS, alleleFrequencyData.gnomAD_genome_EAS),    //  gnomAD_exome_EAS
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_FIN, alleleFrequencyData.gnomAD_genome_FIN),    //  gnomAD_exome_FIN
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_NFE, alleleFrequencyData.gnomAD_genome_NFE),    //  gnomAD_exome_NFE
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_OTH, alleleFrequencyData.gnomAD_genome_OTH),    //  gnomAD_exome_OTH
            alleleFrequencyData.gnomAD_exome_SAS,                               //  gnomAD_exome_SAS
            this.calculateService.formatData(this.calculateService.getExtraData('SIFT', extraData)),              //  SIFT_score
            this.calculateService.formatData(this.calculateService.getExtraData('PolyPhen', extraData)),          //  Polyphen2_HDIV_score
            this.calculateService.formatData(this.calculateService.getExtraData('CADD_PHRED', extraData)),        //  CADD_phred
            this.calculateService.formatData(this.calculateService.getExtraData('CADD_RAW', extraData)),          //  CADD_raw
            CLINSIG,                                                            //  CLINSIG
            AF_1000g,                                                           //  1000g_AF
            EAS_AF_1000g,                                                       //  1000g_EAS_AF
            AMR_AF_1000g,                                                       //  1000g_AMR_AF
            transcriptIds,                                                      //  transcriptIds
            cosmicIds,                                                          //  cosmics
            vcfDataIndex,                                                       //  vcfDataIndex
            vepDataIndex,                                                       //  vepDataIndex
            Consequence,                                                        //  Consequence
            varHGVSc,                                                           //  varHGVSc
            varHGVSp,                                                           //  varHGVSp
            this.calculateService.formatData(this.calculateService.getExtraData('EXON', extraData)),              //  EXON
            this.calculateService.formatData(this.calculateService.getExtraData('INTRON', extraData)),            //  INTRON
            this.calculateService.formatData(this.calculateService.getExtraData('DOMAINS', extraData)),           //  DOMAINS
            AFR_AF_1000g,                                                       //  1000g_AFR_AF
            EUR_AF_1000g,                                                       //  1000g_EUR_AF
            SAS_AF_1000g,                                                       //  1000g_SAS_AF
            AA_AF,                                                              //  AA_AF
            EA_AF,                                                              //  EA_AF
            MAX_AF,                                                             //  MAX_AF
            MAX_AF_POPS,                                                        //  MAX_AF_POPS
            this.calculateService.formatData(this.calculateService.getExtraData('SOMATIC', extraData)),           //  SOMATIC
            this.calculateService.formatData(this.calculateService.getExtraData('PHENO', extraData)),             //  PHENO
            this.calculateService.formatData(this.calculateService.getExtraData('PUBMED', extraData)),            //  PUBMED
            this.calculateService.formatData(this.calculateService.getExtraData('MOTIF_NAME', extraData)),        //  MOTIF_NAME
            this.calculateService.formatData(this.calculateService.getExtraData('MOTIF_POS', extraData)),         //  MOTIF_POS
            this.calculateService.formatData(this.calculateService.getExtraData('HIGH_INF_POS', extraData)),      //  HIGH_INF_POS
            this.calculateService.formatData(this.calculateService.getExtraData('MOTIF_SCORE_CHANGE', extraData)),   //  MOTIF_SCORE_CHANGE
            this.calculateService.formatData(this.calculateService.getExtraData('CADD_PHRED', extraData)),           //  CADD_PHRED
            this.calculateService.formatData(this.calculateService.getExtraData('CADD_RAW', extraData)),             //  CADD_RAW
            this.calculateService.formatData(this.calculateService.getExtraData('CANONICAL', extraData)),             //  CANONICAL
            '.',                                                                //  CLINSIG_PRIORITY
            '.',                                                                //  CLINSIG_FINAL
            '.',                                                                //  hasClinicalSynopsis
            '.',                                                                //  lossOfFunction
            vcfExtraData.inputPos,                                             //  inputPosInt
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_ALL, alleleFrequencyData.gnomAD_genome_ALL),  //  gnomAD_exome_ALL_Int
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_AFR, alleleFrequencyData.gnomAD_genome_AFR),//  gnomAD_exome_AFR_Int
            this.getDataService.getGnomAD(alleleFrequencyData.gnomAD_exome_AMR, alleleFrequencyData.gnomAD_genome_AMR), //  gnomAD_exome_AMR_Int
            CDS_position,                                                       //  CDS_position
            selectedGene,                                                  // selected_gene
            HGNC_SYMONYMS,                                                  // HGNC_SYMONYMS
            HGNC_PRE_SYMBOL,                                                 // HGNC_PRE_SYMBOL
            '.',                                                                // VariantMatching
            withdrawnGene,                                                      // withdrawnGene
            SIFT_number,                                                        // "SIFT",
            PolyPhen_number,                                                     // "Polyphen2"
            alleleFrequencyData.gnomAD_genome_ALL,                            //"gnomAD_genome_ALL",
            alleleFrequencyData.gnomAD_genome_AFR,                               // gnomAD_genome_AFR
            alleleFrequencyData.gnomAD_genome_AMR,                               // gnomAD_genome_AMR
            alleleFrequencyData.gnomAD_genome_ASJ,                               // gnomAD_genome_ASJ
            alleleFrequencyData.gnomAD_genome_EAS,                               // gnomAD_genome_EAS
            alleleFrequencyData.gnomAD_genome_FIN,                               // gnomAD_genome_FIN
            alleleFrequencyData.gnomAD_genome_NFE,                               // gnomAD_genome_NFE
            alleleFrequencyData.gnomAD_genome_OTH,                               // gnomAD_genome_OTH
            alleleFrequencyData.gnomAD_exome_ALL,                                // gnomADe_ALL
            alleleFrequencyData.gnomAD_exome_AFR,                                // gnomADe_AFR
            alleleFrequencyData.gnomAD_exome_AMR,                                // gnomADe_AMR
            alleleFrequencyData.gnomAD_exome_ASJ,                                // gnomADe_ASJ
            alleleFrequencyData.gnomAD_exome_EAS,                                // gnomADe_EAS
            alleleFrequencyData.gnomAD_exome_FIN,                                // gnomADe_FIN
            alleleFrequencyData.gnomAD_exome_NFE,                                // gnomADe_NFE
            alleleFrequencyData.gnomAD_exome_OTH,                                // gnomADe_OTH
            alleleFrequencyData.gnomAD_exome_SAS,                                // gnomADe_SAS
            Variant_ID,                                                          // Clinvar_Variant_ID
            this.calculateService.formatData(this.calculateService.getExtraData('masterMind_MMID3', extraData)),  // masterMind_MMID3
            this.calculateService.formatData(this.calculateService.getExtraData('masterMind_MMCNT3', extraData)), // masterMind_MMCNT3
            this.calculateService.formatData(this.calculateService.getExtraData('masterMind_GENE', extraData)),   // masterMind_GENE
            this.calculateService.formatData(geneSplicer),                                       // GeneSplicer
            this.calculateService.formatData(IMPACT),                                            // IMPACT
            this.calculateService.formatData(STRAND),                                            // STRAND
            this.calculateService.formatData(VARIANT_CLASS),                                      // VARIANT_CLASS
            this.calculateService.formatData(VAR_GENE_VAL),           // VAR_GENE
            this.calculateService.formatData(VAR_SCORE_VAL),           // VAR_SCORE
            this.calculateService.formatData(vcfExtraData.QUAL),           // QUAL
            this.calculateService.formatData(vcfExtraData.FILTER),           // FILTER
            this.calculateService.formatData(vcfExtraData.GT),           // GT
            TrimmedVariant,           // Trimmed_variant
            this.calculateService.formatData(this.calculateService.getExtraData('gnomMT_AF_hom', extraData)),           // AF_hom
            this.calculateService.formatData(this.calculateService.getExtraData('gnomMT_AF_het', extraData)),         // AF_het
            this.calculateService.formatData(this.calculateService.getExtraData('gnomMT_pop_AF_hom', extraData)),           // pop_AF_hom
            this.calculateService.formatData(this.calculateService.getExtraData('gnomMT_pop_AF_het', extraData))           // pop_AF_het
        ]

        fs.appendFileSync(this.annoFile, '\n' + data.join('\t'));
    }

    selectLongestTranscriptByGene(NM_Array, NR_Array, ENST_Array, Other_Array, geneName): string {
        var maxGeneLine = ''

        if (NM_Array.length > 0) {
            maxGeneLine = this.selectLongestTranscript(NM_Array, geneName);
        }
        if (NR_Array.length > 0 && maxGeneLine == '') {
            maxGeneLine = this.selectLongestTranscript(NR_Array, geneName);
        }
        if (ENST_Array.length > 0 && maxGeneLine == '') {
            maxGeneLine = this.selectLongestTranscript(ENST_Array, geneName);
        }
        if (maxGeneLine == '') {
            maxGeneLine = this.selectLongestTranscript(Other_Array, geneName);
        }

        return maxGeneLine;
    }

    selectLongestTranscript(transcriptArray, geneName) {
        var resultArray = []
        for (var i in transcriptArray) {
            let line = transcriptArray[i];
            let lineData = line.split('\t');
            let extraData = lineData[this.annoStream.headings.indexOf('Extra')];
            let symbol = this.calculateService.formatData(this.getDataService.getGeneSymbol(extraData))

            if (symbol == geneName) {
                resultArray.push(line)
            }
        }

        if (resultArray.length == 0) {
            return '';
        }

        let maxLine = resultArray[0];
        let maxLength = maxLine.split('\t')[this.annoStream.headings.indexOf('transcript_length')]
        for (var i in resultArray) {
            let line = resultArray[i];
            let lineData = line.split('\t');
            let length = lineData[this.annoStream.headings.indexOf('transcript_length')];
            let HGMDTranscript = lineData[this.annoStream.headings.indexOf('HGMD_transcript')];
            if (HGMDTranscript == 'exist') {
                return line
            }
            if (length - maxLength > 0) {
                maxLine = line;
                maxLength = length;
            }
        }
        return maxLine;
    }

    /**
     * Calculate data from VCF line
     * @param  {string} data
     * @return {object}
     */
    calculateData(data) {
        let chromIndex = this.headings.indexOf('#CHROM')
        let formatIndex = this.headings.indexOf('FORMAT')
        let infoIndex = this.headings.indexOf('INFO')

        let variantIndex = this.calculateService.getExtraData('VARINDEX', data[infoIndex]);
        let vcfAF = this.calculateService.getExtraData('AF', data[infoIndex]);

        // Ugly check if this is a variant row
        let chrom = data[chromIndex]
        if (chrom.indexOf('##') == 0) {
            return {
                readDepth: null,
                alleleFrequency: null,
                coverage: null
            }
        }

        /**
         * Supported VCF types
         * Each has a diffirent calculation for read depth
         * 1. Unified
         *     Column "FORMAT" -> GT:AD:DP:GQ:PL
         * 2. LoFeq
         *     No Column "FORMAT"
         * 3. VarDict
         *     Column "FORMAT" -> GT:DP:VD:AD:AF:RD:ALD
         * 4. Laura (Umm....)
         *     Column "FORMAT" contains SGCOUNTREF_F:SGCOUNTREF_R:SGCOUNTALT_F:SGCOUNTALT_R
         * TODO: Stop process and raise error if format is not supported
         */
        if (formatIndex == -1) {
            // return this.calculateLoFeqData(data[infoIndex])
            return {
                GT: null,
                readDepth: null,
                alleleFrequency: null,
                coverage: null
            }
        } else {
            let format = data[formatIndex]
            let formatData = data[formatIndex + 1]
            let result

            if (format == 'GT:AD:DP:GQ:PL'
                || format == 'GT:AD:DP:GQ:PGT:PID:PL'
                || format == 'GT:AD:GQ:PL'
                || format == 'GT:AD:GQ:PGT:PID:PL'
                || format == 'GT:AD:DP:GQ:PL:VF:GQX'
                || format == 'GT:AD:AF:DP:GQ:PL:GL:GP:PRI:SB:MB'
                || format.indexOf('GT:AD:DP:GQ') == 0
                || format.indexOf('GT:AD:AF:AFDP:ALTHC') == 0
                || format == 'GT:AD:AF:DP:F1R2:F2R1:GQ:PL:GP:PRI:SB:MB'
                || format == 'GT:AD:AF:DP:F1R2:F2R1:GQ:PL:GP:PRI:SB:MB:PS'
                || format == 'GT:AD:AF:F1R2:F2R1:DP:SB:MB'
                || format == 'GT:AD:AQ:DP:GQ:LQ:NC:NL:SB:US:VF'
                || format == 'GT:AD:AF:DP:F1R2:F2R1:GQ:PL:GP:PRI:SB:MB'
                || format == 'GT:AD:AF:DP:F1R2:F2R1:GQ:PL:GP:PRI:SB:MB:PS'
                || format == 'GT:AD:AF:F1R2:F2R1:DP:SB:MB'
                || format == 'GT:AD:AF:F1R2:F2R1:DP:SB:MB:PS'
            ) {
                result = this.calculateService.calculateUnifiedData(format, formatData);
            } else if (format == 'GT:GQ:GQX:DPI:AD' || format == 'GT:GQ:GQX:DP:DPF:AD' || format == 'GT:GQ:GQX:DP:DPF:AD:ADF:ADR:SB:FT:PL' || format == 'GT:GQ:GQX:DP:DPF:AD:ADF:ADR:SB:FT:PL:PS' || format == 'GT:GQ:GQX:DPI:AD:ADF:ADR:FT:PL' || format == 'GT:GQ:GQX:DPI:AD:ADF:ADR:FT:PL:PS') {
                result = this.calculateService.calculateUnifiedData2(format, formatData);
            } else if (format == 'GT:DP:VD:AD:AF:RD:ALD') {
                result = this.calculateService.calculateVarDictData(formatData);
            } else if (format == 'GT:GQ:AD:DP:VF:NL:SB:NC:US:AQ:LQ' || format == 'GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB' || format == 'GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB:PS') {
                result = this.calculateService.calculateUnifiedData3(format, formatData);
            } else if (format.indexOf('SGCOUNTREF_F:SGCOUNTREF_R:SGCOUNTALT_F:SGCOUNTALT_R') != -1) {
                result = this.calculateService.calculateLauraData(format, formatData);
            } else if (format == 'GT:GQ:DP:FDP:RO:FRO:AO:FAO:AF:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR') {
                result = this.calculateService.calculateTorrentA(formatData, variantIndex);
            } else if (format == 'GT:GQ:DP:FDP:RO:FRO:AO:FAO:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR') {
                result = this.calculateService.calculateTorrentA2(formatData, variantIndex);
            } else if (format == 'GT:AF:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR') {
                result = this.calculateService.calculateTorrentB(formatData, variantIndex);
            } else if (format == 'GT:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR') {
                result = this.calculateService.calculateTorrentB2(formatData, variantIndex);
            } else if (format == 'GT:GQ:DP:RO:AO:SAR:SAF:SRF:SRR') {
                result = this.calculateService.calculateTorrentC(formatData, variantIndex);
            } else if (format == 'GT:DP:ADALL:AD:GQ:IGT:IPS:PS') {
                result = this.calculateService.calculateOtherData(formatData);
            } else if (format == 'GT:PS:DP:ADALL:AD:GQ') {
                result = this.calculateService.calculateOtherData3(formatData);
            } else if (format == 'GT') {
                result = {
                    readDepth: null,
                    alleleFrequency: null,
                    coverage: null
                }
                if (vcfAF != null) {
                    variantIndex = parseInt(variantIndex);
                    result.alleleFrequency = vcfAF.split(',')[variantIndex - 1]
                }
            } else if (format == 'GT:GQ') {
                result = {
                    GT: formatData.split(":")[0],
                    readDepth: null,
                    alleleFrequency: null,
                    coverage: null
                }
                if (['0/1', '0/2', '0/3'].indexOf(result.GT) != -1) {
                    result.alleleFrequency = 0.5
                } else if (['1/1', '2/2', '3/3'].indexOf(result.GT) != -1) {
                    result.alleleFrequency = 1
                }
            }
            else {
                result = {
                    readDepth: null,
                    alleleFrequency: null,
                    coverage: null
                }
            }

            return result;
        }
    }

    writeAfVcf(line, extraData) {
        if (line) {
            let infoIndex = this.headings.indexOf('INFO');
            let data = line.split('\t');
            let infoData = data[infoIndex].split(';');
            let checkExist = false;

            for (var i in infoData) {
                if (infoData[i].indexOf('AF=') == 0 && extraData.alleleFrequency != null) {
                    let currentAF = infoData[i].split('=');

                    let AF = Math.round(extraData.alleleFrequency * 1000) / 1000

                    infoData[i] = `AF=${AF}`;
                    data[infoIndex] = infoData.join(';')
                }

                if (infoData[i].indexOf('AF=') == 0) {
                    checkExist = true;
                }
            }

            if (checkExist == false) {
                let AF = Math.round(extraData.alleleFrequency * 1000) / 1000
                infoData.push(`AF=${AF}`)
                data[infoIndex] = infoData.join(';')
                this.checkAF = false;
            }

            //data.splice(-1,1);

            fs.appendFileSync(this.AfVcfFile, data.join('\t') + '\n')
        }
    }





}