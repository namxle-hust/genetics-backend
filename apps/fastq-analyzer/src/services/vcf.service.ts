import { Injectable } from "@nestjs/common";
import * as fs from 'fs';
import * as es from 'event-stream'

@Injectable()
export class VcfService {

    VcfStream: any;

    constructor() {}

    async formatVcf() {

    }

    async removeLowQuality(vcfFile: string, output: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.VcfStream = fs.createReadStream(vcfFile)
                .pipe(es.split())
                .pipe(es.mapSync((line) => {
                    this.VcfStream.pause()

                    if (!this.VcfStream.passedHeading) {

                        if (line.search('#CHROM') == 0) {
                            this.VcfStream.passedHeading = true
                            this.VcfStream.headings = line.split('\t')
                        }

                        fs.appendFileSync(output, line + '\n')

                        this.VcfStream.resume()
                    } else {
                        if (line) {
                            fs.appendFileSync(output, line + '\n')
                            this.VcfStream.resume()
                        } else {
                            return this.VcfStream.resume()
                        }
                    }
                }))
                .on('error', (error) => {
                    console.log('Error Filter vcf', error)
                    return resolve(false);
                })
                .on('end', () => {
                    console.log('End Filter vcf')
                    return resolve(true);
                })
        })
    }

}