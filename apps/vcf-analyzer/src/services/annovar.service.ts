import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommonService } from "../services/common.service";
import { AnalysisModel } from "../models";
import * as es from 'event-stream'
import * as fs from 'fs'
import * as child from 'child_process';
import { VEP_OUTPUT } from "@app/common";

@Injectable()
export class AnnovarService {

    private readonly logger = new Logger(AnnovarService.name) 

    private defaultBedFile: string;

    private vepDir: string
    private vepCommand: string
    private tmpFolder: string

    constructor(
        private readonly commonService: CommonService,
        private readonly configService: ConfigService,

    ) {
        this.defaultBedFile = this.configService.get<string>('DEFAULT_BED');
        this.vepDir = this.configService.get<string>('VEP_DIR')
        this.vepCommand = this.configService.get<string>('VEP_COMMAND')
        this.tmpFolder = this.configService.get<string>('TMP_DIR')

    }

    getVepOutput(analysis: AnalysisModel): string {
        return `${this.tmpFolder}/analysis_${analysis.id}_${VEP_OUTPUT}`
    }

    async getRowCount(vcfFilePath: string) {
        let command = `less ${vcfFilePath} | awk -F"\t" '{ if (index($0, "#") != 1) { split($5,a,","); col8 = $8; for (i in a){ $5=a[i]; $8=col8";VARINDEX="i; print }  }}' | wc -l`

        let count = await this.commonService.runCommand(command);

        return parseInt(count);
    }

    async validateVcf(vcfPath: string) {
        let vcf = {
            stream: null,
            lineIndex: null,
            headings: [],
            headingLine: 0,
            status: null,
            message: null
        }

        let firstLine = true;

        return new Promise((resolve, reject) => {
            vcf.stream = fs.createReadStream(vcfPath)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    vcf.stream.pause()

                    if (vcf.lineIndex === null) {
                        vcf.headingLine++
                        if (line.search('#CHROM') == 0) {
                            vcf.lineIndex = 0
                            vcf.headings = line.split('\t')

                            // Assume max length for headings is 12
                            if (vcf.headings.length > 12) {
                                // Destroy the stream
                                vcf.status = 'error'
                                vcf.message = 'Unsupported VCF! Too many columns.'
                                vcf.stream.destroy()
                            } else {
                                vcf.stream.resume()
                            }
                        } else {
                            vcf.stream.resume()
                        }
                    } else {
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
                         * Stop process and raise error if format is not supported
                         */
                        let data = line.split('\t')
                        let formatIndex = vcf.headings.indexOf('FORMAT')
                        let infoIndex = vcf.headings.indexOf('INFO')

                        if (data.length <= 1 && firstLine) {
                            vcf.status = 'error'
                            vcf.message = 'empty_vcf'
                            vcf.stream.destroy()
                        }

                        firstLine = false;

                        vcf.status = 'success'
                        vcf.stream.resume()

                    }
                }))
                .on('error', (error) => {
                    vcf.status = 'error'
                    vcf.message = error
                    this.logger.error(error)
                    this.logger.error('Error: validateVCF')
                })
                .on('close', () => {
                    if (vcf.status == 'success') {
                        this.logger.log(vcf.headingLine)
                        return resolve(vcf.headingLine)
                    } else {
                        this.logger.error('Reject validateVCF')
                        return reject(vcf.message)
                    }
                })
        })
    }

    async cleanVcf(input: string, output: string) {
        input = this.commonService.escapeFileName(input)
        output = this.commonService.escapeFileName(output)

        let command = `awk 'BEGIN{OFS="\t"}{if (index($1, "#") == 1) {print} else { if ( $1 == 1 || $1 == 2 || $1 == 3 || $1 == 4 || $1 == 5 || $1 == 6 || $1 == 7 || $1 == 8 || $1 == 9 || $1 == 10 || $1 == 11 || $1 == 12 || $1 == 13 || $1 == 14 || $1 == 15 || $1 == 16 || $1 == 17 || $1 == 18 || $1 == 19 || $1 == 20 || $1 == 21 || $1 == 22 || $1 == "X" || $1 == "Y" || $1 == "MT" || $1 == "M") { split($5,a,","); col8 = $8; for (i in a){ $5=a[i]; $8=col8";VARINDEX="i; print }  } } }' ${input} > ${output} && awk '!seen[$1$2$4$5]++' ${output} > ${input}`

        return this.commonService.runCommand(command)
    
    }



    async runVEP(input: string, output: string) {
        let workerStatus = 'success';

        this.logger.log('Run VEP')

        let start = Date.now();

        let command = this.vepCommand

        let args = [
            '-i', `${input}`,
            '-o', `${output}`,
            '--offline',
            '--species', 'homo_sapiens',
            '--force_overwrite',
            '--assembly', 'GRCh37',
            '--fasta', `${this.vepDir}/homo_sapiens/101_GRCh37/Homo_sapiens.GRCh37.75.dna.primary_assembly.fa.gz`,
            '--everything', '--hgvs', '--merged',
            '--plugin', `CADD,${this.vepDir}/Plugins/CADD/whole_genome_SNVs.tsv.gz,${this.vepDir}/Plugins/CADD/InDels.tsv.gz`,
            //'--plugin', "GeneSplicer,${Config.VEP_DIR}.vep/Plugins/GeneSplicer/sources/genesplicer,${Config.VEP_DIR}.vep/Plugins/GeneSplicer/human",
            '--canonical', '--pubmed', '--total_length', '--number', '--stats_text', '--fork', '4', '--exclude_predicted',
            '-custom', `${this.vepDir}/Plugins/CLINVAR/clinvar_20181028_a.vcf.gz,Clinvar,vcf,exact,0,VARIANT_ID`,
            '-custom', `${this.vepDir}/Plugins/gnomAD/gnomad.genomes.r2.1.sites.vcf.gz,gnomADg,vcf,exact,0,AF,AF_afr,AF_amr,AF_asj,AF_eas,AF_fin,AF_nfe,AF_oth`,
            '-custom', `${this.vepDir}/Plugins/ExAC/ExAC.r1.sites.vep.vcf.gz,ExAC,vcf,exact,0,AC,AC_Adj,AC_AFR,AC_AMR,AC_EAS,AC_FIN,AC_NFE,AN_Adj,AC_OTH,AC_SAS,AF,AN,AN_AFR,AN_AMR,AN_EAS,AN_FIN,AN_NFE,AN_OTH,AN_SAS`,
            '-custom', `${this.vepDir}/Plugins/gnomAD/gnomad.exomes.r2.1.sites.vcf.gz,gnomADe,vcf,exact,0,AF,AF_afr,AF_amr,AF_asj,AF_eas,AF_fin,AF_nfe,AF_oth,AF_sas`,
            '-custom', `${this.vepDir}/Plugins/Mastermind/mastermind.vcf.gz,masterMind,vcf,exact,0,GENE,MMCNT3,MMID3`,
            '-custom', `${this.vepDir}/Plugins/VariantScore/gnomad_e_xgb_scores_sorted.vcf.gz,variantScore,vcf,exact,0,VAR_GENE,VAR_SCORE`,
            '-custom', `${this.vepDir}/Plugins/dbsnp/dbsnp-153.vcf.gz,dbSNP,vcf,exact,0,RS`,
            '-custom', `${this.vepDir}/Plugins/gnomAD/gnomad.genomes.v3.1.sites.chrM.vcf.gz,gnomMT,vcf,exact,0,AC,AF_hom,AF_het,AN,pop_AF_hom,pop_AF_het`
        ]

        this.logger.log(args);

        return new Promise((resolve, reject) => {
            let worker = child.spawn(command, args)

            worker.stdout.on('data', (data) => {
                this.logger.log(`stdout: ${data}`)
            })

            worker.stderr.on('data', (data) => {
                this.logger.log(`data: ${data}`)

                if (data.includes('EXCEPTION') || data.includes('ERROR')) {
                    workerStatus = 'error'
                }
            });

            worker.on('error', (data) => {
                this.logger.error(`worker error: ${data}`)
                workerStatus = 'error'
                return reject();
            })

            worker.on('close', (code) => {
                if (workerStatus == 'success') {
                    this.logger.log(`Vep completed. Duration: ${(Date.now() - start) / 1000} seconds.`)
                    if (fs.existsSync(output)) {
                        return resolve(output);
                    } else {
                        return reject();
                    }
                } else {
                    return reject();
                }
            });
        })
    }

}