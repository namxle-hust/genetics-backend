import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CommonService } from "../services/common.service";
import { AnalysisModel } from "../models";
import * as es from 'event-stream'
import * as fs from 'fs'

@Injectable()
export class AnnovarService {

    private readonly logger = new Logger(AnnovarService.name) 

    private defaultBedFile: string;

    constructor(
        private readonly commonService: CommonService,
        private readonly configService: ConfigService
    ) {
        this.defaultBedFile = this.configService.get<string>('DEFAULT_BED');
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


    async runVEP() {
        
    }
}