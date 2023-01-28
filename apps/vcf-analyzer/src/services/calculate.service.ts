import { ANNOVAR_NASTRING, GENES } from "@app/common";
import { Injectable } from "@nestjs/common";

@Injectable()
export class CalculateService {
    formatData(value) {
        if (value == undefined || value == '-' || value == null) {
            return '.'
        } else {
            return value
        }
    }

    calculateVarDictData(formatData) {
        let data, AD, readDepth, alleleFrequency, coverage

        /**
         * FORMAT: GT:DP:VD:AD:AF:RD:ALD
         * Exp: 0/1:602:169:425,169:0.2807:227,198:88,81

         * if (AD >= DP) -> Read depth = AD = 425 + 169 = 694
         * else -> Read depth = DP = 602

         * AF = AD[1] / AD = 425 / (425 + 169) * 100% = 61.2%
         *
         * Coverage = "425 : 169"
         */
        data = formatData.split(':')

        AD = data[3].split(',')
        // Make sure data is integer
        AD.forEach((item, index) => {
            AD[index] = parseInt(item)
        })

        if (AD >= data[1]) {
            readDepth = AD[0] + AD[1]
        } else {
            readDepth = data[1]
        }

        alleleFrequency = AD[1] / (AD[0] + AD[1])

        coverage = `${AD[0]}:${AD[1]}`

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateUnifiedData2(format, formatData) {
        let data, AD, DP, readDepth, alleleFrequency, coverage, ADData

        /**
         * GT:GQ:GQX:DPI:AD
         * GT:GQ:GQX:DP:DPF:AD
         */

        data = formatData.split(':')

        if (format == 'GT:GQ:GQX:DPI:AD' || format == 'GT:GQ:GQX:DPI:AD:ADF:ADR:FT:PL' || format == 'GT:GQ:GQX:DPI:AD:ADF:ADR:FT:PL:PS') {
            ADData = data[4];
        } else if (format == 'GT:GQ:GQX:DP:DPF:AD' || format == 'GT:GQ:GQX:DP:DPF:AD:ADF:ADR:SB:FT:PL' || format == 'GT:GQ:GQX:DP:DPF:AD:ADF:ADR:SB:FT:PL:PS') {
            ADData = data[5];
        }

        if (ADData) {
            AD = ADData.split(',')
            // Make sure data is integer
            AD.forEach((item, index) => {
                AD[index] = parseInt(item)
            })

            readDepth = AD[0] + AD[1]

            alleleFrequency = AD[1] / (AD[0] + AD[1])

            coverage = `${AD[0]}:${AD[1]}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateUnifiedData3(format, formatData) {
        let data, AD, DP, readDepth, alleleFrequency, coverage

        /**
         * FORMAT: GT:GQ:AD:DP:VF:NL:SB:NC:US:AQ:LQ
         * Exp:  0/1:3:742,1:743:0.00135:30:-3.2790:0.1059:0,0,0,0,0,1,54,7,246,72,277,86:1.991:0.000

         * if (AD >= DP) -> Read depth = AD = 355 + 85 = 440
         * else -> Read depth = DP = 440

         * AF = AD[1] / AD = 85 / (355 + 85) * 100% = 19.3%
         *
         * Coverage = "355 : 85"
         */
        data = formatData.split(':')
        DP = 0;
        if (data[1]) {
            AD = data[2].split(',')
            // Make sure data is integer
            AD.forEach((item, index) => {
                AD[index] = parseInt(item)
            })

            if (AD >= DP) {
                readDepth = AD[0] + AD[1]
            } else {
                readDepth = DP
            }

            alleleFrequency = AD[1] / (AD[0] + AD[1])

            coverage = `${AD[0]}:${AD[1]}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateUnifiedData(format, formatData) {
        let data, AD, DP, readDepth, alleleFrequency, coverage

        /**
         * FORMAT: GT:AD:DP:GQ:PL
         * Exp: 0/1:355,85:440:99:1234,0,7644
         * FORMAT: GT:AD:DP:GQ:PGT:PID:PL
         * Exp: 1/1:0,9:9:27:1|1:889158_G_C:383,27,0
         * FORMAT: GT:AD:GQ:PL
         * Exp: 1/1:0,0:99:2181,140,0
         * GT:AD:AF:DP:GQ:PL:GL:GP:PRI:SB:MB

         * if (AD >= DP) -> Read depth = AD = 355 + 85 = 440
         * else -> Read depth = DP = 440

         * AF = AD[1] / AD = 85 / (355 + 85) * 100% = 19.3%
         *
         * Coverage = "355 : 85"
         */
        data = formatData.split(':')

        if (format == 'GT:AD:DP:GQ:PL' || format == 'GT:AD:DP:GQ:PGT:PID:PL' || 'GT:AD:DP:GQ:PL:VF:GQX') {
            DP = data[2];
        } else {
            DP = 0;
        }

        if (data[1]) {
            AD = data[1].split(',')
            // Make sure data is integer
            AD.forEach((item, index) => {
                AD[index] = parseInt(item)
            })

            readDepth = AD[0] + AD[1]

            alleleFrequency = AD[1] / (AD[0] + AD[1])

            coverage = `${AD[0]}:${AD[1]}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateLauraData(format, formatData) {
        let data, start, AD, readDepth, alleleFrequency, coverage

        /**
         * FORMAT: GT:DP:EC:SGCONFS:SGCOUNTREF_F:SGCOUNTREF_R:SGCOUNTALT_F:SGCOUNTALT_R:SGRB
         * Exp: 0/1:17:11:8.400,9.680,0.920,0.950,1.000,1.000,1.000:2:4:2:9:0.222
         * We care: SGCOUNTREF_F:SGCOUNTREF_R:SGCOUNTALT_F:SGCOUNTALT_R -> 2:4:2:9

         * AD = DP = Read Depth = 2 + 4 + 2 + 9 = 17
         * AF = (2+9) / (2+4+2+9) * 100 = 65%
         *
         * Coverage = "(2 + 4) : (2 + 9)" = "6 : 11"
         */
        format = format.split(':')
        start = format.indexOf('SGCOUNTREF_F')
        data = formatData.split(':')

        // Make sure format data is integer
        data.forEach((item, index) => {
            data[index] = parseInt(item)
        })

        readDepth = AD = data[start] + data[start + 1] + data[start + 2] + data[start + 3]
        alleleFrequency = (data[start + 2] + data[start + 3]) / AD
        coverage = `${data[start] + data[start + 1]}:${data[start + 2] + data[start + 3]}`

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateTorrentA(formatData, variantIndex) {
        let data, readDepth, alleleFrequency, coverage

        variantIndex = parseInt(variantIndex);

        /**
         * FORMAT: GT:GQ:DP:FDP:RO:FRO:AO:FAO:AF:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR
         * Exp: 0/1:50:33:33:20:20:13:13:0.393939:6:7:18:2:6:7:18:2
         * FORMAT: GT:  GQ:  DP:  FDP: RO: FRO: AO:     FAO:    AF:                 SAR:   SAF:   SRF :SRR :FSAR:   FSAF:   FSRF:  FSRR
         * Exp:    1/2: 13:  209: 215: 0:  0:   28,181: 32,183: 0.148837,0.851163:  0,101: 28,80: 0:  0:   4,103:   28,80   :0:    0

         * if (AD >= DP) -> Read depth = AD = FSAR + FSAF + FSRF + FSRR = 6+7+18+2 = 33
         * else -> Read depth = DP = 33

         * AF = FSAR+FSAF / FSAR+FSAF+FSRF+FSRR = 13 / 33 * 100% = 19.3%
         *
         * Coverage = "FSRF+FSRR : FSAR+FSAF"
         */
        data = formatData.split(':')

        if (data[1]) {
            let DP = parseInt(data[2]);
            let FAO_Arr = data[7].split(',')

            // Make sure data is integer
            FAO_Arr.forEach((item, index) => {
                FAO_Arr[index] = parseInt(item)
            })

            let FAO = FAO_Arr[variantIndex - 1]

            let FDP = parseInt(data[3]);

            // if (FDP >= DP) {
            //     readDepth = FDP
            // } else {
            //     readDepth = DP
            // }

            readDepth = FDP

            alleleFrequency = FAO / FDP

            coverage = `${FDP - FAO}:${FAO}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateTorrentA2(formatData, variantIndex) {
        let data, readDepth, alleleFrequency, coverage

        variantIndex = parseInt(variantIndex);

        /**
         * FORMAT: GT:GQ:DP:FDP:RO:FRO:AO:FAO:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR
         *         GT:GQ:DP:FDP:RO:FRO:AO:FAO:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR
         * Exp: 0/1:50:33:33:20:20:13:13:0.393939:6:7:18:2:6:7:18:2
         * FORMAT: GT:  GQ:  DP:  FDP: RO: FRO: AO:     FAO:    AF:                 SAR:   SAF:   SRF :SRR :FSAR:   FSAF:   FSRF:  FSRR
         * Exp:    1/2: 13:  209: 215: 0:  0:   28,181: 32,183: 0.148837,0.851163:  0,101: 28,80: 0:  0:   4,103:   28,80   :0:    0

         * if (AD >= DP) -> Read depth = AD = FSAR + FSAF + FSRF + FSRR = 6+7+18+2 = 33
         * else -> Read depth = DP = 33

         * AF = FSAR+FSAF / FSAR+FSAF+FSRF+FSRR = 13 / 33 * 100% = 19.3%
         *
         * Coverage = "FSRF+FSRR : FSAR+FSAF"
         */
        data = formatData.split(':')

        if (data[1]) {
            let DP = parseInt(data[2]);
            let FAO_Arr = data[7].split(',')

            // Make sure data is integer
            FAO_Arr.forEach((item, index) => {
                FAO_Arr[index] = parseInt(item)
            })

            let FAO = FAO_Arr[variantIndex - 1]

            let FDP = parseInt(data[3]);

            // if (FDP >= DP) {
            //     readDepth = FDP
            // } else {
            //     readDepth = DP
            // }

            readDepth = FDP

            alleleFrequency = FAO / FDP

            coverage = `${FDP - FAO}:${FAO}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateTorrentB(formatData, variantIndex) {
        let data, readDepth, alleleFrequency, coverage

        variantIndex = parseInt(variantIndex);

        /**
         * FORMAT: GT:AF:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR
         * Exp: 1/3:0.333333,0.111111,0.555556:2,2,5:11:3,1,5:9:0:3,1,0:0,0,5:0:0:12:2:2,2,0:0,0,5:0:2

         * if (AD >= DP) -> Read depth = AD = FSAR + FSAF + FSRF + FSRR = 6+7+18+2 = 33
         * else -> Read depth = DP = 33

         * AF = FSAR+FSAF / FSAR+FSAF+FSRF+FSRR = 13 / 33 * 100% = 19.3%
         *
         * Coverage = "FSRF+FSRR : FSAR+FSAF"
         */
        data = formatData.split(':')

        if (data[1]) {
            let DP = parseInt(data[3]);
            let FAO_Arr = data[4].split(',')

            // Make sure data is integer
            FAO_Arr.forEach((item, index) => {
                FAO_Arr[index] = parseInt(item)
            })

            let FAO = FAO_Arr[variantIndex - 1]

            let FDP = parseInt(data[5]);

            // if (FDP >= DP) {
            //     readDepth = FDP
            // } else {
            //     readDepth = DP
            // }

            readDepth = FDP

            alleleFrequency = FAO / FDP

            coverage = `${FDP - FAO}:${FAO}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateTorrentB2(formatData, variantIndex) {
        let data, readDepth, alleleFrequency, coverage

        variantIndex = parseInt(variantIndex);

        /**
         * FORMAT: GT:AF:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR
         *         GT:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR
         * Exp: 1/3:0.333333,0.111111,0.555556:2,2,5:11:3,1,5:9:0:3,1,0:0,0,5:0:0:12:2:2,2,0:0,0,5:0:2

         * if (AD >= DP) -> Read depth = AD = FSAR + FSAF + FSRF + FSRR = 6+7+18+2 = 33
         * else -> Read depth = DP = 33

         * AF = FSAR+FSAF / FSAR+FSAF+FSRF+FSRR = 13 / 33 * 100% = 19.3%
         *
         * Coverage = "FSRF+FSRR : FSAR+FSAF"
         */
        data = formatData.split(':')

        if (data[1]) {
            let DP = parseInt(data[2]);
            let FAO_Arr = data[3].split(',')

            // Make sure data is integer
            FAO_Arr.forEach((item, index) => {
                FAO_Arr[index] = parseInt(item)
            })

            let FAO = FAO_Arr[variantIndex - 1]

            let FDP = parseInt(data[4]);

            // if (FDP >= DP) {
            //     readDepth = FDP
            // } else {
            //     readDepth = DP
            // }

            readDepth = FDP

            alleleFrequency = FAO / FDP

            coverage = `${FDP - FAO}:${FAO}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateTorrentC(formatData, variantIndex) {
        let data, readDepth, alleleFrequency, coverage

        variantIndex = parseInt(variantIndex);

        /**
         * FORMAT: GT:GQ:DP:RO:AO:SAR:SAF:SRF:SRR
         * Exp: 0/1:99:598:238:360:86:297:62:153
         */
        data = formatData.split(':')

        if (data[1]) {
            let DP = parseInt(data[2]);
            let SAR_arr = data[5].split(',')
            let SAF_arr = data[6].split(',')
            let SRF = parseInt(data[7])
            let SRR = parseInt(data[8])

            let FDP = SRF + SRR;

            // Make sure data is integer
            SAR_arr.forEach((item, index) => {
                SAR_arr[index] = parseInt(item);
                FDP = FDP + parseInt(item)
            })

            SAF_arr.forEach((item, index) => {
                SAF_arr[index] = parseInt(item);
                FDP = FDP + parseInt(item)
            })

            let SAR = SAR_arr[variantIndex - 1]
            let SAF = SAF_arr[variantIndex - 1]

            if (FDP >= DP) {
                readDepth = FDP
            } else {
                readDepth = DP
            }

            alleleFrequency = (SAR + SAF) / FDP

            coverage = `${FDP - SAR - SAF}:${SAR + SAF}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateOtherData(formatData) {
        let data, AD, DP, readDepth, alleleFrequency, coverage

        /**
         * FORMAT: GT:DP:ADALL:AD:GQ:IGT:IPS:PS
         * Exp: 0/1:403:92,104:0,0:198:0/1:.:.
         * Exp: 1|1:516:1,221:43,43:355:1/1:.:PATMAT

         * if (AD >= DP) -> Read depth = AD = 355 + 85 = 440
         * else -> Read depth = DP = 440

         * AF = AD[1] / AD = 85 / (355 + 85) * 100% = 19.3%
         *
         * Coverage = "355 : 85"
         */
        data = formatData.split(':')

        if (data[1]) {

            AD = data[3].split(',')
            // Make sure data is integer
            AD.forEach((item, index) => {
                AD[index] = parseInt(item)
            })

            readDepth = AD[0] + AD[1]

            alleleFrequency = AD[1] / (AD[0] + AD[1])

            coverage = `${AD[0]}:${AD[1]}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateOtherData3(formatData) {
        let data, AD, DP, readDepth, alleleFrequency, coverage

        /**
         * GT:PS:DP:ADALL:AD:GQ
         * FORMAT: GT:PS:DP:ADALL:AD:GQ
         * Exp: 0/1:403:92,104:0,0:198:0/1:.:.
         * Exp: 1|1:516:1,221:43,43:355:1/1:.:PATMAT

         * if (AD >= DP) -> Read depth = AD = 355 + 85 = 440
         * else -> Read depth = DP = 440

         * AF = AD[1] / AD = 85 / (355 + 85) * 100% = 19.3%
         *
         * Coverage = "355 : 85"
         */
        data = formatData.split(':')

        if (data[1]) {

            AD = data[4].split(',')
            // Make sure data is integer
            AD.forEach((item, index) => {
                AD[index] = parseInt(item)
            })

            readDepth = AD[0] + AD[1]

            alleleFrequency = AD[1] / (AD[0] + AD[1])

            coverage = `${AD[0]}:${AD[1]}`
        } else {
            readDepth = null
            alleleFrequency = null
            coverage = null
        }

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    calculateClinsigFinal(CLINSIG, alleleFrequencyData, codingEffect, gene, CLINSIG_ID, HGMD) {
        let self = this;

        let CLINSIG_FINAL
        let CLINSIG_PRIORITY
        let hasClinicalSynopsis = 0
        let lossOfFunction = 0
        let clinicalSynopsisGene = GENES;
        let GoldStars = alleleFrequencyData.GoldStars

        CLINSIG = CLINSIG.toLowerCase()

        // Pathogenic
        // likely pathogenic
        // drug response
        // uncertain significance
        // likely benign
        // benign
        if (alleleFrequencyData.Curation == 'Curated') {
            if (/(^pathogenic)|([^(likely\s)]pathogenic)/i.test(CLINSIG)) {
                CLINSIG_FINAL = 'pathogenic'
                CLINSIG_PRIORITY = 1
                if (self.isLossOfFunctionMutation(codingEffect)) {
                    lossOfFunction = 1
                }

                return {
                    CLINSIG_FINAL: CLINSIG_FINAL,
                    CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                    hasClinicalSynopsis: hasClinicalSynopsis,
                    lossOfFunction: lossOfFunction
                }
            }
            // likely pathogenic
            else if (/likely\spathogenic/i.test(CLINSIG)) {
                CLINSIG_FINAL = 'likely pathogenic'
                CLINSIG_PRIORITY = 2
                if (self.isLossOfFunctionMutation(codingEffect)) {
                    lossOfFunction = 1
                }
                return {
                    CLINSIG_FINAL: CLINSIG_FINAL,
                    CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                    hasClinicalSynopsis: hasClinicalSynopsis,
                    lossOfFunction: lossOfFunction
                }
            }
            // drug response
            else if (/drug\sresponse/i.test(CLINSIG)) {
                CLINSIG_FINAL = 'drug response'
                CLINSIG_PRIORITY = 3.5
                if (self.isLossOfFunctionMutation(codingEffect)) {
                    lossOfFunction = 1
                }
                return {
                    CLINSIG_FINAL: CLINSIG_FINAL,
                    CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                    hasClinicalSynopsis: hasClinicalSynopsis,
                    lossOfFunction: lossOfFunction
                }
            }
            // uncertain significance
            else if (/uncertain\ssignificance/i.test(CLINSIG)) {
                CLINSIG_FINAL = 'uncertain significance'
                CLINSIG_PRIORITY = 3
                if (self.isLossOfFunctionMutation(codingEffect) && clinicalSynopsisGene.indexOf(gene) != -1) {
                    CLINSIG_PRIORITY = 2.5
                    hasClinicalSynopsis = 1
                    lossOfFunction = 1
                } else if ((alleleFrequencyData.varLocation.indexOf('exonic') != -1 || alleleFrequencyData.varLocation.indexOf('splicing') != -1) && clinicalSynopsisGene.indexOf(gene) != -1) {
                    CLINSIG_PRIORITY = 2.6
                    hasClinicalSynopsis = 1
                } else if (clinicalSynopsisGene.indexOf(gene) != -1) {
                    CLINSIG_PRIORITY = 2.7
                    hasClinicalSynopsis = 1
                } else if (self.isLossOfFunctionMutation(codingEffect)) {
                    lossOfFunction = 1
                }
                return {
                    CLINSIG_FINAL: CLINSIG_FINAL,
                    CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                    hasClinicalSynopsis: hasClinicalSynopsis,
                    lossOfFunction: lossOfFunction
                }
            }
            // likely benign
            else if (/likely\sbenign/i.test(CLINSIG)) {
                CLINSIG_FINAL = 'likely benign'
                CLINSIG_PRIORITY = 4
                if (self.isLossOfFunctionMutation(codingEffect)) {
                    lossOfFunction = 1
                }
                return {
                    CLINSIG_FINAL: CLINSIG_FINAL,
                    CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                    hasClinicalSynopsis: hasClinicalSynopsis,
                    lossOfFunction: lossOfFunction
                }
            }
            // benign
            else if (/(^benign)|([^(likely\s)]benign)/i.test(CLINSIG)) {
                CLINSIG_FINAL = 'benign'
                CLINSIG_PRIORITY = 5
                if (self.isLossOfFunctionMutation(codingEffect)) {
                    lossOfFunction = 1
                }
                return {
                    CLINSIG_FINAL: CLINSIG_FINAL,
                    CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                    hasClinicalSynopsis: hasClinicalSynopsis,
                    lossOfFunction: lossOfFunction
                }
            }

        }
        // Gnomad > 0.05
        if (self.isBenignA(alleleFrequencyData)) {
            CLINSIG_FINAL = 'benign'
            CLINSIG_PRIORITY = 5
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }

            return {
                CLINSIG_FINAL: CLINSIG_FINAL,
                CLINSIG_PRIORITY: CLINSIG_PRIORITY,
                hasClinicalSynopsis: hasClinicalSynopsis,
                lossOfFunction: lossOfFunction,
                curation: 'Curated'
            }
        }

        // Check Drug response
        if (self.isDrugResponseGoldStar(CLINSIG) && GoldStars >= 2) {
            CLINSIG_FINAL = 'drug response'
            CLINSIG_PRIORITY = 3.5
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isBenignA(alleleFrequencyData)) {
            CLINSIG_FINAL = 'benign'
            CLINSIG_PRIORITY = 5
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        }
        else if (alleleFrequencyData.BTG_Concensus == 'P') {
            CLINSIG_FINAL = 'pathogenic'
            CLINSIG_PRIORITY = 1
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        }
        else if (alleleFrequencyData.BTG_Concensus == 'LP') {
            CLINSIG_FINAL = 'likely pathogenic'
            CLINSIG_PRIORITY = 2
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        }
        else if (alleleFrequencyData.BTG_Concensus == 'LB') {
            CLINSIG_FINAL = 'likely benign'
            CLINSIG_PRIORITY = 4
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        }
        else if (alleleFrequencyData.BTG_Concensus == 'B') {
            CLINSIG_FINAL = 'benign'
            CLINSIG_PRIORITY = 5
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        }
        else if (HGMD == 'DM' && alleleFrequencyData.VAR_SCORE >= 0.5) {
            CLINSIG_FINAL = 'pathogenic'
            CLINSIG_PRIORITY = 1
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isPathogenic(CLINSIG)) {
            CLINSIG_FINAL = 'pathogenic'
            CLINSIG_PRIORITY = 1
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isLikelyPathogenic(CLINSIG)) {
            CLINSIG_FINAL = 'likely pathogenic'
            CLINSIG_PRIORITY = 2
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isDrugResponse(CLINSIG)) {
            CLINSIG_FINAL = 'drug response'
            CLINSIG_PRIORITY = 3.5
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isUncertainsignificance(CLINSIG)) {
            CLINSIG_FINAL = 'uncertain significance';
            CLINSIG_PRIORITY = 3
            if (self.isLossOfFunctionMutation(codingEffect) && clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.5
                hasClinicalSynopsis = 1
                lossOfFunction = 1
            } else if ((alleleFrequencyData.varLocation.indexOf('exonic') != -1 || alleleFrequencyData.varLocation.indexOf('splicing') != -1) && clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.6
                hasClinicalSynopsis = 1
            } else if (clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.7
                hasClinicalSynopsis = 1
            } else if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isLikelyBenign(CLINSIG, alleleFrequencyData)) {
            CLINSIG_FINAL = 'likely benign'
            CLINSIG_PRIORITY = 4
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isBenign(CLINSIG, alleleFrequencyData)) {
            CLINSIG_FINAL = 'benign'
            CLINSIG_PRIORITY = 5
            if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else {
            CLINSIG_FINAL = 'uncertain significance'
            CLINSIG_PRIORITY = 3
            if (self.isLossOfFunctionMutation(codingEffect) && clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.5
                hasClinicalSynopsis = 1
                lossOfFunction = 1
            } else if ((alleleFrequencyData.varLocation.indexOf('exonic') != -1 || alleleFrequencyData.varLocation.indexOf('splicing') != -1) && clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.6
                hasClinicalSynopsis = 1
            } else if (clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.7
                hasClinicalSynopsis = 1
            } else if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        }

        return {
            CLINSIG_FINAL: CLINSIG_FINAL,
            CLINSIG_PRIORITY: CLINSIG_PRIORITY,
            hasClinicalSynopsis: hasClinicalSynopsis,
            lossOfFunction: lossOfFunction
        }
    }

    isLossOfFunctionMutation(codingEffect) {
        if (codingEffect == undefined)
            return false;
        codingEffect = codingEffect.toLowerCase()
        // Frameshift
        // Stop gained
        // Splice donor
        // Splice acceptor
        // Start loss

        if (/frameshift/i.test(codingEffect) ||
            /stop\sgained/i.test(codingEffect) ||
            /splice\sdonor/i.test(codingEffect) ||
            /splice\sacceptor/i.test(codingEffect) ||
            /start\sloss/i.test(codingEffect)) {
            return true
        }
        return false;
    }

    isDrugResponse(CLINSIG) {
        return /drug\sresponse/i.test(CLINSIG)
    }

    isDrugResponseGoldStar(CLINSIG) {
        return (CLINSIG == 'drug response' || CLINSIG == 'drug response, other')
    }

    isPathogenic(CLINSIG) {
        return /(^pathogenic)|([^(likely\s)]pathogenic)/i.test(CLINSIG)
    }

    isLikelyPathogenic(CLINSIG) {
        return /likely\spathogenic/i.test(CLINSIG)
    }

    isUncertainsignificance(CLINSIG) {
        return /uncertain\ssignificance/i.test(CLINSIG)
    }

    isBenign(CLINSIG, data) {
        return (/(^benign)|([^(likely\s)]benign)/i.test(CLINSIG)) ||
            (data.gnomAD_exome_ALL != ANNOVAR_NASTRING && data.gnomAD_exome_ALL >= 0.05) ||
            (data.gnomAD_exome_AFR != ANNOVAR_NASTRING && data.gnomAD_exome_AFR >= 0.05) ||
            (data.gnomAD_exome_AMR != ANNOVAR_NASTRING && data.gnomAD_exome_AMR >= 0.05) ||
            (data.gnomAD_exome_ASJ != ANNOVAR_NASTRING && data.gnomAD_exome_ASJ >= 0.05) ||
            (data.gnomAD_exome_EAS != ANNOVAR_NASTRING && data.gnomAD_exome_EAS >= 0.05) ||
            (data.gnomAD_exome_FIN != ANNOVAR_NASTRING && data.gnomAD_exome_FIN >= 0.05) ||
            (data.gnomAD_exome_NFE != ANNOVAR_NASTRING && data.gnomAD_exome_NFE >= 0.05) ||
            (data.gnomAD_exome_OTH != ANNOVAR_NASTRING && data.gnomAD_exome_OTH >= 0.05) ||
            (data.gnomAD_exome_SAS != ANNOVAR_NASTRING && data.gnomAD_exome_SAS >= 0.05) ||
            (data.AF_1000g != ANNOVAR_NASTRING && data.AF_1000g >= 0.05) ||
            (data.EAS_AF_1000g != ANNOVAR_NASTRING && data.EAS_AF_1000g >= 0.05) ||
            (data.AMR_AF_1000g != ANNOVAR_NASTRING && data.AMR_AF_1000g >= 0.05) ||
            (data.AFR_AF_1000g != ANNOVAR_NASTRING && data.AFR_AF_1000g >= 0.05) ||
            (data.EUR_AF_1000g != ANNOVAR_NASTRING && data.EUR_AF_1000g >= 0.05) ||
            (data.SAS_AF_1000g != ANNOVAR_NASTRING && data.SAS_AF_1000g >= 0.05)

    }

    isBenignA(data) {
        return (data.gnomAD_exome_ALL != ANNOVAR_NASTRING && data.gnomAD_exome_ALL > 0.05) ||
            (data.gnomAD_exome_AFR != ANNOVAR_NASTRING && data.gnomAD_exome_AFR > 0.05) ||
            (data.gnomAD_exome_AMR != ANNOVAR_NASTRING && data.gnomAD_exome_AMR > 0.05) ||
            (data.gnomAD_exome_ASJ != ANNOVAR_NASTRING && data.gnomAD_exome_ASJ > 0.05) ||
            (data.gnomAD_exome_EAS != ANNOVAR_NASTRING && data.gnomAD_exome_EAS > 0.05) ||
            (data.gnomAD_exome_FIN != ANNOVAR_NASTRING && data.gnomAD_exome_FIN > 0.05) ||
            (data.gnomAD_exome_NFE != ANNOVAR_NASTRING && data.gnomAD_exome_NFE > 0.05) ||
            (data.gnomAD_exome_OTH != ANNOVAR_NASTRING && data.gnomAD_exome_OTH > 0.05) ||
            (data.gnomAD_exome_SAS != ANNOVAR_NASTRING && data.gnomAD_exome_SAS > 0.05) ||
            (data.EAS_AF_1000g != ANNOVAR_NASTRING && data.EAS_AF_1000g > 0.05) ||
            (data.AMR_AF_1000g != ANNOVAR_NASTRING && data.AMR_AF_1000g > 0.05) ||
            (data.AFR_AF_1000g != ANNOVAR_NASTRING && data.AFR_AF_1000g > 0.05) ||
            (data.EUR_AF_1000g != ANNOVAR_NASTRING && data.EUR_AF_1000g > 0.05) ||
            (data.SAS_AF_1000g != ANNOVAR_NASTRING && data.SAS_AF_1000g > 0.05)
    }

    isLikelyBenign(CLINSIG, data) {
        return (/likely\sbenign/i.test(CLINSIG)) ||
            (data.gnomAD_exome_ALL != ANNOVAR_NASTRING && data.gnomAD_exome_ALL >= 0.01 && data.gnomAD_exome_ALL < 0.05) ||
            (data.gnomAD_exome_AFR != ANNOVAR_NASTRING && data.gnomAD_exome_AFR >= 0.01 && data.gnomAD_exome_AFR < 0.05) ||
            (data.gnomAD_exome_AMR != ANNOVAR_NASTRING && data.gnomAD_exome_AMR >= 0.01 && data.gnomAD_exome_AMR < 0.05) ||
            (data.gnomAD_exome_ASJ != ANNOVAR_NASTRING && data.gnomAD_exome_ASJ >= 0.01 && data.gnomAD_exome_ASJ < 0.05) ||
            (data.gnomAD_exome_EAS != ANNOVAR_NASTRING && data.gnomAD_exome_EAS >= 0.01 && data.gnomAD_exome_EAS < 0.05) ||
            (data.gnomAD_exome_FIN != ANNOVAR_NASTRING && data.gnomAD_exome_FIN >= 0.01 && data.gnomAD_exome_FIN < 0.05) ||
            (data.gnomAD_exome_NFE != ANNOVAR_NASTRING && data.gnomAD_exome_NFE >= 0.01 && data.gnomAD_exome_NFE < 0.05) ||
            (data.gnomAD_exome_OTH != ANNOVAR_NASTRING && data.gnomAD_exome_OTH >= 0.01 && data.gnomAD_exome_OTH < 0.05) ||
            (data.gnomAD_exome_SAS != ANNOVAR_NASTRING && data.gnomAD_exome_SAS >= 0.01 && data.gnomAD_exome_SAS < 0.05) ||
            (data.EAS_AF_1000g != ANNOVAR_NASTRING && data.EAS_AF_1000g >= 0.01 && data.EAS_AF_1000g < 0.05) ||
            (data.AMR_AF_1000g != ANNOVAR_NASTRING && data.AMR_AF_1000g >= 0.01 && data.AMR_AF_1000g < 0.05) ||
            (data.AFR_AF_1000g != ANNOVAR_NASTRING && data.AFR_AF_1000g >= 0.01 && data.AFR_AF_1000g < 0.05) ||
            (data.EUR_AF_1000g != ANNOVAR_NASTRING && data.EUR_AF_1000g >= 0.01 && data.EUR_AF_1000g < 0.05) ||
            (data.SAS_AF_1000g != ANNOVAR_NASTRING && data.SAS_AF_1000g >= 0.01 && data.SAS_AF_1000g < 0.05)
    }

    isHgmdPathogenic(data) {
        return (data.gnomAD_exome_ALL != ANNOVAR_NASTRING && data.gnomAD_exome_ALL < 0.05) ||
            (data.gnomAD_exome_AFR != ANNOVAR_NASTRING && data.gnomAD_exome_AFR < 0.05) ||
            (data.gnomAD_exome_AMR != ANNOVAR_NASTRING && data.gnomAD_exome_AMR < 0.05) ||
            (data.gnomAD_exome_ASJ != ANNOVAR_NASTRING && data.gnomAD_exome_ASJ < 0.05) ||
            (data.gnomAD_exome_EAS != ANNOVAR_NASTRING && data.gnomAD_exome_EAS < 0.05) ||
            (data.gnomAD_exome_FIN != ANNOVAR_NASTRING && data.gnomAD_exome_FIN < 0.05) ||
            (data.gnomAD_exome_NFE != ANNOVAR_NASTRING && data.gnomAD_exome_NFE < 0.05) ||
            (data.gnomAD_exome_OTH != ANNOVAR_NASTRING && data.gnomAD_exome_OTH < 0.05) ||
            (data.gnomAD_exome_SAS != ANNOVAR_NASTRING && data.gnomAD_exome_SAS < 0.05) ||
            (data.EAS_AF_1000g != ANNOVAR_NASTRING && data.EAS_AF_1000g < 0.05) ||
            (data.AMR_AF_1000g != ANNOVAR_NASTRING && data.AMR_AF_1000g < 0.05) ||
            (data.AFR_AF_1000g != ANNOVAR_NASTRING && data.AFR_AF_1000g < 0.05) ||
            (data.EUR_AF_1000g != ANNOVAR_NASTRING && data.EUR_AF_1000g < 0.05) ||
            (data.SAS_AF_1000g != ANNOVAR_NASTRING && data.SAS_AF_1000g < 0.05)
    }
}