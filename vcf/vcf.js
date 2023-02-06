'use strict'

const fs = require('fs')
const es = require('event-stream')
const EventEmitter = require('events')
const exec = require('child_process').exec
const Config = require('./config')
const HELPER = require('./helper')

class VCF {
    constructor ()  {
        this.analysisId = null
        this.vcfFile =  null
        this.vcfHGMDFile = null
        this.originAnnoFile = null
        this.annoFile = null
        this.lineIndex = null
        this.headings = null
        this.firstLine = true

        this.currentAnno = {
            chrom: null,
            inputPos: null,
            transcript: null
        }

        this.vcfStream = null
        this.annoStream = null

        this.genomicCount = 0
        this.exonicCount = 0
        this.checkAF = false;

        let self = this
        this.vcfEvents = new EventEmitter()
    }

    /**
     * Escape special characters for bash
     * @param  {string} name
     * @return {string}
     */
    escapeFileName (name) {
        let options = [
            [/"/g, '\\"'],
            [/\s/g, '\\ '],
            [/\(/g, '\\('],
            [/\)/g, '\\)']
        ]

        for (var key in options) {
            name = name.replace(options[key][0], options[key][1])
        }

        return name
    }

    /**
     * Run our own analysis
     * @param {integer} analysisId
     * @param {string} samplePath
     * @param {string} originAnnoFile
     */
    run (analysisId, vcfFile , originAnnoFile) {
        let fileNoExt = `analysis_${analysisId}_run`

        this.analysisId = analysisId
        this.vcfFile = `${vcfFile}`
        this.vcfHGMDFile = `${Config.TMP_DIR}/${fileNoExt}.hgmd.vcf`
        this.vcfHgmdClinvarFile = `${Config.TMP_DIR}/${fileNoExt}.hgmdclinvar.vcf`

        this.deleteVCFFile = `${Config.TMP_DIR}/${fileNoExt}.*`
        this.canonicalFile = `${Config.TMP_DIR}/${fileNoExt}.canonical`
		this.canonicalCNVFile = `${Config.TMP_DIR}/${fileNoExt}.cnv.canonical*`
		this.canonicalSVFile = `${Config.TMP_DIR}/${fileNoExt}.sv.canonical*`

        this.vcfTranscriptFile = `${Config.TMP_DIR}/${fileNoExt}.transcript_length.anno`

        this.originAnnoFile = this.vcfTranscriptFile

        this.originVepFile = `${Config.TMP_DIR}/${fileNoExt}.transcript.anno`
        this.annoFile = `${Config.TMP_DIR}/${fileNoExt}.clinvar.anno`
        this.annoClinvarFile = `${Config.TMP_DIR}/${fileNoExt}.anno`
        this.annoVepFile = `${Config.TMP_DIR}/${fileNoExt}.vep.anno`

        this.AfVcfFile = `${Config.TMP_DIR}/${fileNoExt}.vcf`

        this.addTranscriptLength(originAnnoFile)
    }

    addTranscriptLength (originAnnoFile) {
        let self = this

        this.vepStream = fs.createReadStream(originAnnoFile)
            .pipe(es.split())
            .pipe(es.mapSync((line) =>  {
                self.vepStream.pause()

                if (!self.vepStream.passedHeading) {

                    if (line.search('#Uploaded_variation') == 0) {
                        self.vepStream.passedHeading = true

                        self.vepStream.headings = line.split('\t')

            			self.vepStream.headings.push('#transcript_gene')
                        self.vepStream.headings.push('transcriptHGMD_gene')

                        let annoHeadings = self.vepStream.headings

                        fs.appendFileSync(self.originVepFile, annoHeadings.join('\t') + '\n')
                    }

                    self.vepStream.resume()
                } else {
                    if (line) {
                        let lineData = line.split('\t')

                        var transcript = lineData[self.vepStream.headings.indexOf('Feature')].split('.')[0]

                        let varExtra = lineData[self.vepStream.headings.indexOf('Extra')]

                        let geneSymbol = self.formatData(self.getGeneSymbol(varExtra))

                        lineData.push(transcript + '_' + geneSymbol)
                        lineData.push(lineData[self.vepStream.headings.indexOf('Feature')] + '_' + geneSymbol)

                        fs.appendFileSync(self.originVepFile, lineData.join('\t') + '\n')

                        return self.vepStream.resume()

                    } else {
                        return self.vepStream.resume()
                    }
                }
            }))
            .on('error', (error) => {
                console.log('Add transcript error: ', error)
                self.vcfStream.hasError = true
                return self.vcfEvents.emit('completed', false)
            })
            .on('end', () => {
                console.log('Add transcript done')

                let transcriptCommand = `awk -F"\t" 'FNR==NR{a[$1"_"$3]=$2; next}{ if (length(a[$15]) == 0) { print $0"\t0" } else { print $0"\t"a[$15] }}' ${Config.TRANSCRIPT_DIR} ${self.originVepFile} > ${self.vcfTranscriptFile} && awk -F"\t" 'FNR==NR{a[$2"_"$1]="exist"; next}{ if ( $1 == "#Uploaded_variation") { print $0"\tHGMD_transcript"} else if (a[$16] != "exist") { print $0"\t0" } else { print $0"\t"a[$16] }}' ${Config.HGMD_TRANSCRIPT} ${self.vcfTranscriptFile} > ${self.vcfTranscriptFile}_tmp && cat ${self.vcfTranscriptFile}_tmp > ${self.vcfTranscriptFile}`;

                exec(transcriptCommand, (error, stdout, stderr) => {
                    if (error) {
                        console.log('Get transcript length error', error)
                        return self.vcfEvents.emit('completed', false)
                    }
                    self.readVcf()
                })
            })
    }

    /**
     * Create a vcf read stream, and read each line
     */
    readVcf () {
        let self = this
        console.log('Read VCF');
        this.vcfStream = fs.createReadStream(this.vcfFile)
            .pipe(es.split())
            .pipe(es.mapSync((line) =>  {
                self.vcfStream.pause()

                let eventName, extraData
                
                if (self.lineIndex != null) {
                    // This is a data line, analyze it, and read next annotation line
                    self.lineIndex++

                    self.vcfStream.extraData = self.analyzeLine(line)

                    self.writeAfVcf(line, self.vcfStream.extraData);

                    self.resumeAnnoStream()
                } else {
            		let lineData = line.split('\t')
            		let lineString = line;
                    if (line.search('#CHROM') == 0) {
                        // This is the heading line, let's save it for later us
                        console.log(line)
                        self.lineIndex = 0
                        self.headings = line.split('\t')
            			console.log(self.headings)
            			//lineData.splice(-1,1)
            			lineString = lineData.join('\t')
            			console.log('LineString')
            			console.log(lineString)
                    }

                    fs.appendFileSync(self.AfVcfFile, lineString + '\n')

                    self.vcfStream.extraData = []
                    self.vcfStream.resume()
                }
            }))
            .on('error', (error) => {
                self.vcfStream.hasError = true
                console.log('Read vcf error', error)
                return self.vcfEvents.emit('completed', false)
            })
            .on('close', () => {
                console.log('Close readVCF')
                if (!self.annoStream.ended) {
                    self.annoStream.ended = true
                    self.annoStream.destroy()
                }

                if (self.vcfStream.hasError) {
                    self.vcfEvents.emit('completed', false)
                } else {
                    // IF AF only 1.00 or 0.500
                    let tabixComand = '';

                    if (self.checkAF == false) {
                        let compressedFile = self.AfVcfFile + '.gz';
                        let tabixFile = self.AfVcfFile + '.gz.tbi';
                        let compressedFileDist = this.vcfFile + '.gz';
                        let tabixFileDist = this.vcfFile + '.gz.tbi';

                        tabixComand = `bgzip -f ${self.AfVcfFile} && tabix -f ${compressedFile} && rm -rf ${compressedFileDist} ${tabixFileDist} && mv -f ${compressedFile} ${compressedFileDist} && mv -f ${tabixFile} ${tabixFileDist} && `
                    }

                    let clearRefAlt = `awk -F"\t" 'BEGIN{OFS="\t"}{ref = $7;alt = $8; chrom = $5; pos = $6; gene = $16; if(index($0, "analysisId") == 1) { print $0;} else if (length(ref) == 1 || length(alt) == 1) { $83=chrom"_"pos"_"ref"_"alt"_"gene; print $0;} else if (substr(ref,length(ref),1) != substr(alt,length(alt),1)) {$83=chrom"_"pos"_"ref"_"alt"_"gene; print $0;} else {while (length(ref) != 1 && length(alt) != 1 && substr(ref,length(ref),1) == substr(alt,length(alt),1)) {ref = substr(ref, 1, length(ref)-1);alt = substr(alt, 1, length(alt)-1);}$83=chrom"_"pos"_"ref"_"alt"_"gene; print $0;}}' ${self.annoFile} >  ${self.annoFile}_temp && mv -f ${self.annoFile}_temp ${self.annoFile} && `

                    // Add ClinVar
                    let clinVarCommand = `awk -F"\t" 'FNR==NR{a[$1"_"$2"_"$3"_"$4"_"$7]=$5"\t"$6"\t"$8"\t"$9"\t"$10"\t"$11; b[$1"_"$2"_"$3"_"$4"_"$7]=$12; next}{ curation = (length(b[$83]) == 0) ? "." : b[$83]; if(index($0, "analysisId") == 1) {print $0"\tCLNACC\tCLNSIG_BTG\treview_status\tlast_evaluated\tgold_stars\tconsensus_score\tcuration"} else if (length(a[$83]) == 0) { print $0"\t.\t.\t.\t.\t.\t.\t"curation } else { print $0"\t"a[$83]"\t"curation }}' ${Config.CLINVAR_DIR} ${self.annoFile}  > ${self.vcfHGMDFile} `

                    // Add Nan ClinVar
                    let BTGConcensusCommand = `&& awk -F"\t" 'FNR==NR{a[$1]=$2; next}{ if(index($0, "analysisId") == 1) {print $0"\tBTG_Concensus"} else if (length(a[$5"-"$6"-"$7"-"$8"-"$16]) == 0) { print $0"\t." } else { print $0"\t"a[$5"-"$6"-"$7"-"$8"-"$16] }}' ${Config.CLINVAR_BTG} ${self.vcfHGMDFile}  > ${self.vcfHGMDFile}_temp && mv -f ${self.vcfHGMDFile}_temp ${self.vcfHGMDFile} `

                    // Add Nan Clinvar 03 2020
                    // let ClinvarPath = Config.CLINVAR_2020 != undefined ? Config.CLINVAR_2020 : "/home/ubuntu/Genomics/genomics-alamut/data/nan_clinvar_03_2020.tsv"
                    // let AddClinvarCommand = `&& awk -F"\t" 'FNR==NR{a[$1"_"$2"_"$3"_"$4"_"$7]=$5"\t"$6; next}{ if(index($0, "analysisId") == 1) {print $0"\tCLI_ID\tCLI_2020"} else if (length(a[$83]) == 0) { print $0"\t.\t." } else { print $0"\t"a[$83] }}' ${ClinvarPath} ${self.vcfHGMDFile}  > ${self.vcfHGMDFile}_temp && mv -f ${self.vcfHGMDFile}_temp ${self.vcfHGMDFile} `

                    clinVarCommand += BTGConcensusCommand;
                    // clinVarCommand += AddClinvarCommand;

                    // Add cosmic
                    let addCosmicID = `&& awk -F"\t" 'BEGIN{OFS="\t"}FNR==NR{a[$2]=$1; next}{if(length(a[$14]) == 0){ print $0; } else { if (a[$14] == $16) { print $0; } else { $14 = "."; print $0;}  } }' ${Config.COSMIC} ${self.vcfHGMDFile} > ${self.annoFile} `

                    // Add HGMD
                    // let hgmdCommand = `&& awk -F"\t" 'BEGIN{OFS="\t"}FNR==NR{a[$1"_"$2"_"$3"_"$4"_"$5]=$6; next}{ if(index($0, "analysisId") == 1) {print $0"\tHGMD"} else if (length(a[$46]) == 0) { print $0"\t."; } else { print $0"\tDM"; }}' ${Config.HGMD_PATH} ${self.vcfHGMDFile} > ${self.annoVepFile}`
                    let hgmdCommand = `&& awk -F"\t" 'BEGIN{OFS="\t"}FNR==NR{a[$1"_"$2"_"$3"_"$4"_"$5]=$6; next}{ if(index($0, "analysisId") == 1) {print $0"\tHGMD"} else if (length(a[$83]) == 0) { print $0"\t."; } else { print $0"\tDM"; }}' ${Config.HGMD_PATH} ${self.annoFile} > ${self.vcfHgmdClinvarFile}`

                    //let addNewClinvar = `&& awk -F"\t" 'BEGIN{OFS="\t"}FNR==NR{a[$1"_"$2"_"$4"_"$5]=$6; next}{ if(index($0, "analysisId") == 1) {print $0"\tNEW_CLINSIG"} else if (length(a[$5"_"$6"_"$7"_"$8]) == 0) { print $0"\t."; } else { print $0"\t"a[$5"_"$6"_"$7"_"$8]; }}' ${Config.NEW_CLINVAR} ${self.vcfHgmdClinvarFile} > ${self.vcfHgmdClinvarFile}_temp && mv -f ${self.vcfHgmdClinvarFile}_temp ${self.vcfHgmdClinvarFile}`

                    // Mongoimport need an extra line
                    //fs.appendFileSync(self.annoFile, '\n')

                    // Move anno file from tmp dir to S3 dir
                    // Remote origin anno file

                    let command = `${tabixComand}${clearRefAlt}${clinVarCommand} ${addCosmicID} ${hgmdCommand} && rm -f ${self.annoFile} && rm -f ${self.vcfTranscriptFile} && rm -f ${self.originVepFile}`
                    //let command = `${tabixComand}${clearRefAlt}${clinVarCommand} ${addCosmicID} ${hgmdCommand} ${addNewClinvar} && rm -f ${self.annoFile} && rm -f ${self.vcfTranscriptFile} && rm -f ${self.originVepFile}`

                    exec(command, (error, stdout, stderr) => {
                        if (error) {
                            console.log('Move anno error', error)
                            return self.vcfEvents.emit('completed', false)
                        }

                        return self.classifyVariant()
                    })
                }
            })
    }

    classifyVariant () {
        let self = this
        let lineIndex = null
        this.classifyStream = fs.createReadStream(this.vcfHgmdClinvarFile)
            .pipe(es.split())
            .pipe(es.mapSync((line) =>  {
                self.classifyStream.pause()

                let lineData = line.split('\t')
                if (lineIndex == null) {
                    self.classifyStream.headings = line.split('\t')
                    lineIndex = 0
                    fs.appendFileSync(self.annoVepFile, line + '\n')
                } else  if (lineData.length > 5){

                    //let CLINSIG = lineData[self.classifyStream.headings.indexOf('CLINSIG')]
                    let VARIANT_ID = lineData[self.classifyStream.headings.indexOf('Clinvar_VARIANT_ID')]
                   // let NEW_CLINSIG = lineData[self.classifyStream.headings.indexOf('NEW_CLINSIG')]
                    let codingEffect = lineData[self.classifyStream.headings.indexOf('codingEffect')]
                    let gene = lineData[self.classifyStream.headings.indexOf('gene')]
                    let CLNSIG_ID = lineData[self.classifyStream.headings.indexOf('CLNACC')]
                    let BTG_CLINSIG = lineData[self.classifyStream.headings.indexOf('CLNSIG_BTG')]
                    let HGMD = lineData[self.classifyStream.headings.indexOf('HGMD')]
                    let BTG_Concensus = lineData[self.classifyStream.headings.indexOf('BTG_Concensus')]
                    let GoldStars = lineData[self.classifyStream.headings.indexOf('gold_stars')]
                    let VAR_SCORE = lineData[self.classifyStream.headings.indexOf('VAR_SCORE')]
                    let Curation = lineData[self.classifyStream.headings.indexOf('curation')]

                    let ClinvarText = BTG_CLINSIG.split(";_").join(", ")
                    let ClinvarText2 = ClinvarText.split("_").join(" ")
                    let ClinvarText3 = ClinvarText2.split("/").join(", ")
                    let CLINSIG = ClinvarText3

                    let alleleFrequencyData = {
                        BTG_Concensus: BTG_Concensus,
                        GoldStars: GoldStars != '.' ? parseInt(GoldStars) : 0 ,
                        VAR_SCORE: GoldStars != '.' ? parseFloat(VAR_SCORE) : 0 ,
                        Curation: Curation != '.' ? Curation : '.' ,
                        AF: lineData[self.classifyStream.headings.indexOf('alleleFrequency')],
                        gnomAD_exome_ALL: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_ALL')],
                        gnomAD_exome_AFR: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_AFR')],
                        gnomAD_exome_AMR: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_AMR')],
                        gnomAD_exome_ASJ: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_ASJ')],
                        gnomAD_exome_EAS: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_EAS')],
                        gnomAD_exome_FIN: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_FIN')],
                        gnomAD_exome_NFE: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_NFE')],
                        gnomAD_exome_OTH: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_OTH')],
                        gnomAD_exome_SAS: lineData[self.classifyStream.headings.indexOf('gnomAD_exome_SAS')],
                        ExAC_ALL: lineData[self.classifyStream.headings.indexOf('ExAC_ALL')],
                        ExAC_AFR: lineData[self.classifyStream.headings.indexOf('ExAC_AFR')],
                        ExAC_AMR: lineData[self.classifyStream.headings.indexOf('ExAC_AMR')],
                        ExAC_EAS: lineData[self.classifyStream.headings.indexOf('ExAC_EAS')],
                        ExAC_FIN: lineData[self.classifyStream.headings.indexOf('ExAC_FIN')],
                        ExAC_NFE: lineData[self.classifyStream.headings.indexOf('ExAC_NFE')],
                        ExAC_OTH: lineData[self.classifyStream.headings.indexOf('ExAC_OTH')],
                        ExAC_SAS: lineData[self.classifyStream.headings.indexOf('ExAC_SAS')],
                        AF_1000g: lineData[self.classifyStream.headings.indexOf('AF')],
                        EAS_AF_1000g: lineData[self.classifyStream.headings.indexOf('1000g_EAS_AF')],
                        AMR_AF_1000g: lineData[self.classifyStream.headings.indexOf('1000g_AMR_AF')],
                        AFR_AF_1000g: lineData[self.classifyStream.headings.indexOf('1000g_AFR_AF')],
                        EUR_AF_1000g: lineData[self.classifyStream.headings.indexOf('1000g_EUR_AF')],
                        SAS_AF_1000g: lineData[self.classifyStream.headings.indexOf('1000g_SAS_AF')],
                        varLocation: lineData[self.classifyStream.headings.indexOf('varLocation')],
                    }

                    let classificationData = self.calculateClinsigFinal(CLINSIG, alleleFrequencyData, codingEffect, gene, CLNSIG_ID, HGMD)

                    lineData[self.classifyStream.headings.indexOf('CLINSIG_PRIORITY')] = classificationData.CLINSIG_PRIORITY;
                    lineData[self.classifyStream.headings.indexOf('CLINSIG_FINAL')] = classificationData.CLINSIG_FINAL;
                    lineData[self.classifyStream.headings.indexOf('hasClinicalSynopsis')] = classificationData.hasClinicalSynopsis;
                    lineData[self.classifyStream.headings.indexOf('lossOfFunction')] = classificationData.lossOfFunction;
                    lineData[self.classifyStream.headings.indexOf('CLINSIG')] = CLINSIG;
                    lineData[self.classifyStream.headings.indexOf('Clinvar_VARIANT_ID')] = CLNSIG_ID;

                    if ( classificationData.curation == 'Curated') {
                        lineData[self.classifyStream.headings.indexOf('curation')] = 'Curated ';
                    }

                    fs.appendFileSync(self.annoVepFile, lineData.join('\t') + '\n')
                }

                self.classifyStream.resume()
            }))
            .on('error', (error) => {
                self.classifyStream.hasError = true
                console.log('classifyVariant error', error)
                return self.vcfEvents.emit('completed', false)
            })
            .on('close', () => {
                if (self.classifyStream.hasError) {
                    self.vcfEvents.emit('completed', false)
                } else {
                    return self.vcfEvents.emit('completed', true)
                }
            })
    }

    /**
     * Analyze a line
     * @param {string} vcfLine
     * return Object
     */
    analyzeLine (vcfLine) {
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

    writeAfVcf (line, extraData) {
        let self = this;
        let infoIndex = self.headings.indexOf('INFO');
        let data = line.split('\t');
        let infoData = data[infoIndex] ? data[infoIndex].split(';') : [];
        let checkExist = false;

        for (var i in infoData) {
            if (infoData[i].indexOf('AF=') == 0 && extraData.alleleFrequency != null) {
                let currentAF = infoData[i].split('=');
                // if (parseFloat(currentAF[1]) != 1.00 && parseFloat(currentAF[1]) != 0.500) {
                //     self.checkAF = true;
                // }
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
            self.checkAF = false;
        }

        //data.splice(-1,1);

        fs.appendFileSync(self.AfVcfFile, data.join('\t') + '\n')
    }

    /**
     * Create an annotation read stream
     * @return void
     */
    readAnno () {
        let self = this
        this.annoArray = []
        this.prevLine = '';
        this.annoStream = fs.createReadStream(this.originAnnoFile)
            .pipe(es.split())
            .pipe(es.mapSync((line) =>  {
                self.annoStream.pause()

                if (!self.annoStream.passedHeading) {

                    if (line.search('#Uploaded_variation') == 0) {
                        self.annoStream.passedHeading = true
                        self.annoStream.headings = line.split('\t')

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

                        self.annoStream.firstLine = true;

                        fs.appendFileSync(self.annoFile, annoHeadings.join('\t'))
                    }

                    self.annoStream.resume()
                } else {
                    let lineData = line.split('\t')

                    if (line && self.annoStream.firstLine) {
                        self.annoStream.firstLine = false;

                        self.annoStream.currentChromPos = lineData[self.annoStream.headings.indexOf('Location')];
                        self.annoStream.currentAllele = lineData[self.annoStream.headings.indexOf('Allele')];
                        self.annoStream.currentClass = self.getExtraData( 'VARIANT_CLASS', lineData[self.annoStream.headings.indexOf('Extra')]);
                        self.annoStream.currentRef = self.getExtraData( 'GIVEN_REF', lineData[self.annoStream.headings.indexOf('Extra')]);

                        self.annoArray.push(line)
                        return self.annoStream.resume()
                    }

                    if (line) {

                        var lineLocation = lineData[self.annoStream.headings.indexOf('Location')]

                        let varLocation = lineLocation.split('-')

                        let vepInputPos = varLocation[0].split(':')[1];

                        let intVepInputPos = parseInt(vepInputPos) - 1

                        let varExtra = lineData[self.annoStream.headings.indexOf('Extra')]

                        if (self.vcfStream.extraData
                            &&  ( self.vcfStream.extraData.inputPos == vepInputPos ||  self.vcfStream.extraData.inputPos == intVepInputPos )
                            && self.annoStream.currentChromPos == lineLocation
                            && self.annoStream.currentAllele == lineData[self.annoStream.headings.indexOf('Allele')]
                            && self.annoStream.currentClass == self.getExtraData( 'VARIANT_CLASS', varExtra)
                            && ( self.annoStream.currentRef == self.getExtraData( 'GIVEN_REF', varExtra) || null == self.getExtraData( 'GIVEN_REF', varExtra))
                            ) {
                            self.annoArray.push(line)
                            return self.annoStream.resume()
                        }

                        self.annoStream.currentChromPos = lineLocation
                        self.annoStream.currentAllele = lineData[self.annoStream.headings.indexOf('Allele')]
                        self.annoStream.currentClass = self.getExtraData( 'VARIANT_CLASS', varExtra)
                        self.annoStream.currentRef = self.getExtraData( 'GIVEN_REF', varExtra)

                        self.prevLine = line

                        self.filterVariant(self.annoArray, self.vcfStream.extraData);

                        self.annoArray = []
                        self.annoArray.push(line)

                        return self.vcfStream.resume()

                    } else {
                        return self.annoStream.resume()
                    }
                }
            }))
            .on('error', (error) => {
                console.log('Read anno error', error)
                self.vcfStream.hasError = true
                return self.vcfEvents.emit('completed', false)
            })
            .on('end', () => {
                self.filterVariant(self.annoArray, self.vcfStream.extraData);

                if (!self.vcfStream.ended) {
                    self.vcfStream.ended = true
                    self.vcfStream.destroy()
                }

            })
    }

    /**
     * Resume annotation read stream
     * If stream is not created, create it
     * @return void
     */
    resumeAnnoStream () {
        if (this.annoStream) {
            this.annoStream.resume()
        } else {
            this.readAnno()
        }
    }

    /**
     * Filter variant from VEP result
     * @param  {array} annoArray
     * @param  {object} vcfExtraData
     * @return {void}
     */
    filterVariant (annoArray, vcfExtraData) {
        var self = this;
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
            let transcript = lineData[self.annoStream.headings.indexOf('Feature')]
            let extraColumn = lineData[self.annoStream.headings.indexOf('Extra')]

            let geneName = self.formatData(self.getGeneSymbol(extraColumn));

            let geneColumn = self.formatData(lineData[self.annoStream.headings.indexOf('Gene')])

            let varHGVSc = self.getExtraData('HGVSc', extraColumn);
            let varHGVSp = self.getExtraData('HGVSp', extraColumn);


            let cNomen = '.';
            let pNomen = '.';

            if ( varHGVSc != null ) {
                let cNomenArray = varHGVSc.split(':');
                if (cNomenArray[1] != undefined) {
                    cNomen = cNomenArray[1];
                }
            }

            if ( varHGVSp != null ) {
                let pNomenArray = varHGVSp.split(':');
                if (pNomenArray[1] != undefined) {
                    pNomen = pNomenArray[1];
                    pNomen = pNomen.replace("%3D", "=");
                }
            }

            transcriptArray.push(transcript + ':' + geneColumn + ':' + self.formatData(geneName) + ':' + cNomen + ':' + pNomen);

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

            var geneLine = self.selectLongestTranscriptByGene(NM_Array, NR_Array, ENST_Array, Other_Array, Gene_Array[0]);
            vcfExtraData.gene = Gene_Array[0];
            let selectedGene = 1;
            if (geneLine == false) {
                console.log('geneLine False')
                console.log('VCF')
                console.log(JSON.stringify(vcfExtraData))
                console.log('gene: ' + Gene_Array[0])
                console.log('Anno Array: ')
                console.log(JSON.stringify(annoArray))
            }

            if (geneLine != false) {
                self.appendToAnnoFile(geneLine, vcfExtraData, transcriptArray.join('|'), selectedGene);
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
                    var geneLine = self.selectLongestTranscriptByGene(NM_Array, NR_Array, ENST_Array, Other_Array, Gene_Array[i]);
                    vcfExtraData.gene = Gene_Array[i];

                    if (geneLine == false) {
                        console.log('geneLine False')
                        console.log('VCF')
                        console.log(JSON.stringify(vcfExtraData))
                        console.log('gene: ' + Gene_Array[i])
                        console.log('Anno Array: ')
                        console.log(JSON.stringify(annoArray))
                    }

                    if (geneLine != false) {
                        

                        if ((vcfExtraData.chrom == 'MT' || vcfExtraData.chrom == 'M' || vcfExtraData.chrom == 'chrM' || vcfExtraData.chrom == 'chrMT') && vcfExtraData.INFO.indexOf(';CSQ=') != -1) {
                            if (geneLine.indexOf(vcfExtraData.MT) != -1) {
                                selectedGene = 1;
                            }
                        } else {
                            if (refseqGene.length > 0 && Gene_Array[i] == refseqGene[0]) {
                                selectedGene = 1;
                            }
                        }

                        self.appendToAnnoFile(geneLine, vcfExtraData, transcriptArray.join('|'), selectedGene);
                        if (selectedGene == 1) {
                            selectedGene = 0
                        }
                    }
                }
            }
        }
    }

    selectLongestTranscriptByGene (NM_Array, NR_Array, ENST_Array, Other_Array, geneName) {
        var self = this;
        var maxGeneLine = false

        if (NM_Array.length > 0) {
            maxGeneLine = self.selectLongestTranscript(NM_Array, geneName);
        }
        if (NR_Array.length > 0 && maxGeneLine == false) {
            maxGeneLine = self.selectLongestTranscript(NR_Array, geneName);
        }
        if (ENST_Array.length > 0 && maxGeneLine == false) {
            maxGeneLine = self.selectLongestTranscript(ENST_Array, geneName);
        }
        if (maxGeneLine == false) {
            maxGeneLine = self.selectLongestTranscript(Other_Array, geneName);
        }

        return maxGeneLine;
    }

    selectLongestTranscript (transcriptArray, geneName) {
        var self = this;
        var resultArray = []
        for (var i in transcriptArray) {
            let line = transcriptArray[i];
            let lineData = line.split('\t');
            let extraData = lineData[self.annoStream.headings.indexOf('Extra')];
            let symbol = self.formatData(self.getGeneSymbol(extraData))

            if (symbol == geneName) {
                resultArray.push(line)
            }
        }

        if (resultArray.length == 0) {
            return false;
        }

        let maxLine = resultArray[0];
        let maxLength = maxLine.split('\t')[self.annoStream.headings.indexOf('transcript_length')]
        for (var i in resultArray) {
            let line = resultArray[i];
            let lineData = line.split('\t');
            let length = lineData[self.annoStream.headings.indexOf('transcript_length')];
            let HGMDTranscript = lineData[self.annoStream.headings.indexOf('HGMD_transcript')];
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
     * Append a line to anno file
     * @param  {string} line
     * @param  {object} vcfExtraData
     * @param  {string} transcriptIds
     */
    appendToAnnoFile (line, vcfExtraData, transcriptIds, selectedGene) {
        var self = this;
        let lineData = line.split('\t');
        let extraData = lineData[self.annoStream.headings.indexOf('Extra')]
        let transcript = self.formatData(lineData[self.annoStream.headings.indexOf('Feature')])
        let codingEffect = self.getCodingEffect(lineData[self.annoStream.headings.indexOf('Consequence')])
        let varLocation = self.getVarLocation(lineData[self.annoStream.headings.indexOf('Consequence')])
        let Consequence = self.formatData(lineData[self.annoStream.headings.indexOf('Consequence')])
        let CDS_position = self.formatData(lineData[self.annoStream.headings.indexOf('CDS_position')])

        // let rsId = self.formatData( self.getRsID(lineData[self.annoStream.headings.indexOf('#Uploaded_variation')], lineData[self.annoStream.headings.indexOf('Existing_variation')]) );

        let varHGVSc = self.getExtraData('HGVSc', extraData);
        let varHGVSp = self.getExtraData('HGVSp', extraData);
        let STRAND = self.getExtraData('STRAND', extraData);

        let cosmicIds = self.getCosmicIds(lineData[self.annoStream.headings.indexOf('Existing_variation')]);

        let cosmic = '.'

        if (cosmicIds && cosmicIds.length > 0) {
            cosmic = cosmicIds[0];

            cosmicIds = cosmicIds.join('|')
        }

        let CLINSIG = self.formatData(self.getExtraData('CLIN_SIG', extraData))

        let cNomen = '.';
        let pNomen = '.';
        let gene = self.formatData(self.getGeneSymbol(extraData));
        let withdrawnGene = 0;

        if (gene.indexOf('~withdrawn') != -1) {
            gene = gene.split('~withdrawn')[0]
            withdrawnGene = 1
        }

        if ( varHGVSc != null ) {
            let cNomenArray = varHGVSc.split(':');
            if (cNomenArray[1] != undefined) {
                cNomen = cNomenArray[1];
            }
        }

        if ( varHGVSp != null ) {
            let pNomenArray = varHGVSp.split(':');
            if (pNomenArray[1] != undefined) {
                pNomen = pNomenArray[1];
                pNomen = pNomen.replace("%3D", "=");
            }
        }

        var lineLocation = lineData[self.annoStream.headings.indexOf('Location')]

        let vepVarLocation = lineLocation.split('-')

        vcfExtraData.chrom = vcfExtraData.chrom.split('chr').join('')

        let vepPOS = vepVarLocation[0].split(':')[1];
        let vepChrom = vepVarLocation[0].split(':')[0].split('chr').join('');
        let vepALT = lineData[self.annoStream.headings.indexOf('Allele')]
        let vepREF = self.getExtraData( 'GIVEN_REF', extraData)
        let vcfDataIndex = vcfExtraData.chrom + '_' + vcfExtraData.inputPos + '_' + vcfExtraData.REF + '_' + vcfExtraData.ALT + '_' + gene;

        let deletionNucle = self.getDeletion(vcfExtraData.REF, vcfExtraData.ALT[0], STRAND)
        // let shortVcfDataIndex = vcfExtraData.chrom + '_' + vcfExtraData.inputPos + '_' + shortedRefAlt.REF + '_' + shortedRefAlt.ALT + '_' + gene;

        if (cNomen != '.' && deletionNucle != '' && cNomen.substr(cNomen.length - 3) == 'del') {
            cNomen = cNomen + deletionNucle
        }

        let vepDataIndex = vepChrom + '_' + vepPOS + '_' + vepREF + '_' + vepALT + '_' + gene;

        let Variant_ID = self.formatData(self.getExtraData('Clinvar_VARIANT_ID', extraData))
        let AF_1000g = self.formatData(self.getExtraData('AF', extraData))
        let EAS_AF_1000g = self.formatData(self.getExtraData('EAS_AF', extraData))
        let AMR_AF_1000g = self.formatData(self.getExtraData('AMR_AF', extraData))
        let AFR_AF_1000g = self.formatData(self.getExtraData('AFR_AF', extraData))
        let EUR_AF_1000g = self.formatData(self.getExtraData('EUR_AF', extraData))
        let SAS_AF_1000g = self.formatData(self.getExtraData('SAS_AF', extraData))

        let AA_AF = self.formatData(self.getExtraData('AA_AF', extraData))
        let EA_AF = self.formatData(self.getExtraData('EA_AF', extraData))

        CLINSIG = self.formatCLINSIG(CLINSIG)

        let alleleFrequencyData = {
            AF: vcfExtraData.alleleFrequency,
            gnomAD_exome_ALL: self.formatData(self.getExtraData('gnomADe_AF', extraData)),
            gnomAD_exome_AFR: self.formatData(self.getExtraData('gnomADe_AF_afr', extraData)),
            gnomAD_exome_AMR: self.formatData(self.getExtraData('gnomADe_AF_amr', extraData)),
            gnomAD_exome_ASJ: self.formatData(self.getExtraData('gnomADe_AF_asj', extraData)),
            gnomAD_exome_EAS: self.formatData(self.getExtraData('gnomADe_AF_eas', extraData)),
            gnomAD_exome_FIN: self.formatData(self.getExtraData('gnomADe_AF_fin', extraData)),
            gnomAD_exome_NFE: self.formatData(self.getExtraData('gnomADe_AF_nfe', extraData)),
            gnomAD_exome_OTH: self.formatData(self.getExtraData('gnomADe_AF_oth', extraData)),
            gnomAD_exome_SAS: self.formatData(self.getExtraData('gnomADe_AF_sas', extraData)),
            gnomAD_genome_ALL: self.formatData(self.getExtraData('gnomADg_AF', extraData)),
            gnomAD_genome_AFR: self.formatData(self.getExtraData('gnomADg_AF_afr', extraData)),
            gnomAD_genome_AMR: self.formatData(self.getExtraData('gnomADg_AF_amr', extraData)),
            gnomAD_genome_ASJ: self.formatData(self.getExtraData('gnomADg_AF_asj', extraData)),
            gnomAD_genome_EAS: self.formatData(self.getExtraData('gnomADg_AF_eas', extraData)),
            gnomAD_genome_FIN: self.formatData(self.getExtraData('gnomADg_AF_fin', extraData)),
            gnomAD_genome_NFE: self.formatData(self.getExtraData('gnomADg_AF_nfe', extraData)),
            gnomAD_genome_OTH: self.formatData(self.getExtraData('gnomADg_AF_oth', extraData)),
            ExAC_ALL: self.calculateExac('_Adj', extraData),
            ExAC_AFR: self.calculateExac('_AFR', extraData),
            ExAC_AMR: self.calculateExac('_AMR', extraData),
            ExAC_EAS: self.calculateExac('_EAS', extraData),
            ExAC_FIN: self.calculateExac('_FIN', extraData),
            ExAC_NFE: self.calculateExac('_NFE', extraData),
            ExAC_OTH: self.calculateExac('_OTH', extraData),
            ExAC_SAS: self.calculateExac('_SAS', extraData),
            AF_1000g: self.formatData(self.getExtraData('AF', extraData)),
            EAS_AF_1000g: self.formatData(self.getExtraData('EAS_AF', extraData)),
            AMR_AF_1000g: self.formatData(self.getExtraData('AMR_AF', extraData)),
            AFR_AF_1000g: self.formatData(self.getExtraData('AFR_AF', extraData)),
            EUR_AF_1000g: self.formatData(self.getExtraData('EUR_AF', extraData)),
            SAS_AF_1000g: self.formatData(self.getExtraData('SAS_AF', extraData)),
        }

        let gnomAD_MAX_AF = self.getMAX_AF(alleleFrequencyData)

        let MAX_AF = gnomAD_MAX_AF.MAX_AF
        let MAX_AF_POPS = gnomAD_MAX_AF.MAX_AF_POPS

        let SIFT_score = self.formatData(self.getExtraData('SIFT', extraData))
        let PolyPhen_score = self.formatData(self.getExtraData('PolyPhen', extraData))

        let SIFT_number = '.'

        if (SIFT_score != '.') {
            SIFT_number = SIFT_score.split('(')[1].split(')')[0]
        }

        let PolyPhen_number = '.'

        if (PolyPhen_score != '.') {
            PolyPhen_number = PolyPhen_score.split('(')[1].split(')')[0]
        }

        //let CLINSIG_DATA = self.calculateClinsigFinal(CLINSIG, alleleFrequencyData, codingEffect, gene)

        let HGNC_SYMONYMS = self.formatData(self.getExtraData('HGNC_SYNONYMS', extraData))
        let HGNC_PRE_SYMBOL = self.formatData(self.getExtraData('HGNC_PRE_SYMBOL', extraData))

        let geneSplicer = self.getExtraData('GeneSplicer', extraData);
        let IMPACT = self.getExtraData('IMPACT', extraData);
        let VARIANT_CLASS = self.getExtraData('VARIANT_CLASS', extraData);

        let VAR_GENE = self.formatData(self.getExtraData('variantScore_VAR_GENE', extraData))
        let VAR_SCORE = self.formatData(self.getExtraData('variantScore_VAR_SCORE', extraData))
        let VAR_GENE_VAL = '.'
        let VAR_SCORE_VAL = '.'

        let rsId = self.formatData(self.getExtraData('dbSNP_RS', extraData))
        rsId = rsId != '.' ? ( 'rs' + rsId ) : '.';
	let rsIdVep = self.formatData( self.getRsID(lineData[self.annoStream.headings.indexOf('#Uploaded_variation')], lineData[self.annoStream.headings.indexOf('Existing_variation')]) );
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

        let TrimmedVariant = self.convert(vcfExtraData.chrom, vcfExtraData.inputPos, vcfExtraData.REF, vcfExtraData.ALT[0], gene)

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
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_ALL, alleleFrequencyData.gnomAD_genome_ALL),    //  gnomAD_exome_ALL
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_AFR, alleleFrequencyData.gnomAD_genome_AFR),    //  gnomAD_exome_AFR
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_AMR, alleleFrequencyData.gnomAD_genome_AMR),    //  gnomAD_exome_AMR
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_ASJ, alleleFrequencyData.gnomAD_genome_ASJ),    //  gnomAD_exome_ASJ
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_EAS, alleleFrequencyData.gnomAD_genome_EAS),    //  gnomAD_exome_EAS
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_FIN, alleleFrequencyData.gnomAD_genome_FIN),    //  gnomAD_exome_FIN
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_NFE, alleleFrequencyData.gnomAD_genome_NFE),    //  gnomAD_exome_NFE
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_OTH, alleleFrequencyData.gnomAD_genome_OTH),    //  gnomAD_exome_OTH
            alleleFrequencyData.gnomAD_exome_SAS,                               //  gnomAD_exome_SAS
            self.formatData(self.getExtraData('SIFT', extraData)),              //  SIFT_score
            self.formatData(self.getExtraData('PolyPhen', extraData)),          //  Polyphen2_HDIV_score
            self.formatData(self.getExtraData('CADD_PHRED', extraData)),        //  CADD_phred
            self.formatData(self.getExtraData('CADD_RAW', extraData)),          //  CADD_raw
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
            self.formatData(self.getExtraData('EXON', extraData)),              //  EXON
            self.formatData(self.getExtraData('INTRON', extraData)),            //  INTRON
            self.formatData(self.getExtraData('DOMAINS', extraData)),           //  DOMAINS
            AFR_AF_1000g,                                                       //  1000g_AFR_AF
            EUR_AF_1000g,                                                       //  1000g_EUR_AF
            SAS_AF_1000g,                                                       //  1000g_SAS_AF
            AA_AF,                                                              //  AA_AF
            EA_AF,                                                              //  EA_AF
            MAX_AF,                                                             //  MAX_AF
            MAX_AF_POPS,                                                        //  MAX_AF_POPS
            self.formatData(self.getExtraData('SOMATIC', extraData)),           //  SOMATIC
            self.formatData(self.getExtraData('PHENO', extraData)),             //  PHENO
            self.formatData(self.getExtraData('PUBMED', extraData)),            //  PUBMED
            self.formatData(self.getExtraData('MOTIF_NAME', extraData)),        //  MOTIF_NAME
            self.formatData(self.getExtraData('MOTIF_POS', extraData)),         //  MOTIF_POS
            self.formatData(self.getExtraData('HIGH_INF_POS', extraData)),      //  HIGH_INF_POS
            self.formatData(self.getExtraData('MOTIF_SCORE_CHANGE', extraData)),   //  MOTIF_SCORE_CHANGE
            self.formatData(self.getExtraData('CADD_PHRED', extraData)),           //  CADD_PHRED
            self.formatData(self.getExtraData('CADD_RAW', extraData)),             //  CADD_RAW
            self.formatData(self.getExtraData('CANONICAL', extraData)),             //  CANONICAL
            '.',                                                                //  CLINSIG_PRIORITY
            '.',                                                                //  CLINSIG_FINAL
            '.',                                                                //  hasClinicalSynopsis
            '.',                                                                //  lossOfFunction
            vcfExtraData.inputPos,                                             //  inputPosInt
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_ALL, alleleFrequencyData.gnomAD_genome_ALL),  //  gnomAD_exome_ALL_Int
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_AFR, alleleFrequencyData.gnomAD_genome_AFR),//  gnomAD_exome_AFR_Int
            self.getGnomAD(alleleFrequencyData.gnomAD_exome_AMR, alleleFrequencyData.gnomAD_genome_AMR), //  gnomAD_exome_AMR_Int
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
            self.formatData(self.getExtraData('masterMind_MMID3', extraData)),  // masterMind_MMID3
            self.formatData(self.getExtraData('masterMind_MMCNT3', extraData)), // masterMind_MMCNT3
            self.formatData(self.getExtraData('masterMind_GENE', extraData)),   // masterMind_GENE
            self.formatData(geneSplicer),                                       // GeneSplicer
            self.formatData(IMPACT),                                            // IMPACT
            self.formatData(STRAND),                                            // STRAND
            self.formatData(VARIANT_CLASS),                                      // VARIANT_CLASS
            self.formatData(VAR_GENE_VAL),           // VAR_GENE
            self.formatData(VAR_SCORE_VAL),           // VAR_SCORE
            self.formatData(vcfExtraData.QUAL),           // QUAL
            self.formatData(vcfExtraData.FILTER),           // FILTER
            self.formatData(vcfExtraData.GT),           // GT
            TrimmedVariant,           // Trimmed_variant
            self.formatData(self.getExtraData('gnomMT_AF_hom', extraData)),           // AF_hom
            self.formatData(self.getExtraData('gnomMT_AF_het', extraData)),         // AF_het
            self.formatData(self.getExtraData('gnomMT_pop_AF_hom', extraData)),           // pop_AF_hom
            self.formatData(self.getExtraData('gnomMT_pop_AF_het', extraData))           // pop_AF_het
        ]

        fs.appendFileSync(this.annoFile, '\n' + data.join('\t'));
    }

    /**
     * Get value by key
     * @param  {string} key
     * @param  {string} extraData
     * @return {mix}
     */
    getExtraData (key, extraData) {
        if (extraData.indexOf(key) == -1) {
            return null;
        }

        let extraArray = extraData.split(';');

        for (var i in extraArray) {
            let keyValue = extraArray[i].split('=');

            if (keyValue[0] == key) {
                return keyValue[1];
            }

        }

        return null;
    }

    getGeneSymbol (extraData) {
        let VEP_SYMBOL = null
        let HGNC_SYMBOL = null

        let extraArray = extraData.split(';');

        for (var i in extraArray) {
            let keyValue = extraArray[i].split('=');

            if (keyValue[0] == 'SYMBOL') {
                VEP_SYMBOL = keyValue[1];
            }

            if (keyValue[0] == 'HGNC_SYMBOL') {
                HGNC_SYMBOL = keyValue[1];
            }

        }

        if (HGNC_SYMBOL != null) {
            return HGNC_SYMBOL;
        } else {
            return VEP_SYMBOL
        }
    }

    convert (chrom, pos, ref, alt, gene) {
        if (ref === '.' || alt === '.') {
            return [chrom, pos, ref, alt, gene].join('_')
        }
        var r_index = 0;
        var l_index = 0;
        var min_len = Math.min(alt.length, ref.length);

        while (r_index < min_len) {
            if (alt.charAt(alt.length - r_index - 1) !== ref.charAt(ref.length - r_index - 1)) break;
            r_index += 1;
        }
        while (l_index < min_len) {
            if (alt.charAt(l_index) !== ref.charAt(l_index)) break;
            l_index += 1;
        }
        var overlap = Math.max(l_index + r_index - min_len, 0);
        var l_seg, r_seg, r_alt_seg, r_ref_seg, new_ref, new_alt, new_pos;
        if (l_index > r_index || l_index === r_index && l_index === min_len) {
            l_seg = l_index;
            r_ref_seg = ref.length - r_index + overlap;
            r_alt_seg = alt.length - r_index + overlap
        } else {
            l_seg = l_index - overlap;
            r_ref_seg = ref.length - r_index;
            r_alt_seg = alt.length - r_index;
        }
        new_ref = ref.slice(l_seg, r_ref_seg);
        new_alt = alt.slice(l_seg, r_alt_seg);
        new_pos = parseInt(pos) + parseInt(l_seg);
        if (new_ref.length === 0) {
            new_ref = '-';
            new_pos -= 1;
        }
        if (new_alt.length === 0) new_alt = '-';

        return [chrom, new_pos, new_ref, new_alt, gene].join('_')
    }

    calculateExac (name, extraData) {
        let self = this;

        let AC = self.formatData(self.getExtraData('ExAC_AC' + name, extraData))
        let AN = self.formatData(self.getExtraData('ExAC_AN' + name, extraData))

        if (AC == null || AN == null || AN == 0 || AN == '.' || AC == '.') {
            return '.'
        }

        if (AC == 0) {
            return 0
        }

        return Math.round( (AC/AN) * 1000000000 ) / 1000000000;

    }

    /**
     * Format data to write .anno file
     * @param  {mix} value
     * @return {mix}
     */
    formatData (value) {
        if (value == undefined || value == '-' || value == null) {
            return '.'
        } else {
            return value
        }
    }

    /**
     * Append an array data to a line
     * @param {string} line
     * @param {array} data
     * @return {string}
     */
    appendToLine (line, data) {
        return `${data.join('\t')}\t${line}`
    }

    /**
     * Calculate data from VCF line
     * @param  {string} data
     * @return {object}
     */
    calculateData (data) {
        let chromIndex = this.headings.indexOf('#CHROM')
        let formatIndex = this.headings.indexOf('FORMAT')
        let infoIndex = this.headings.indexOf('INFO')

        let variantIndex = this.getExtraData('VARINDEX', data[infoIndex]);
        let vcfAF = this.getExtraData('AF', data[infoIndex]);

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
                result = this.calculateUnifiedData(format, formatData, variantIndex);
            } else if (format == 'GT:GQ:GQX:DPI:AD' || format == 'GT:GQ:GQX:DP:DPF:AD' || format == 'GT:GQ:GQX:DP:DPF:AD:ADF:ADR:SB:FT:PL' || format == 'GT:GQ:GQX:DP:DPF:AD:ADF:ADR:SB:FT:PL:PS' || format == 'GT:GQ:GQX:DPI:AD:ADF:ADR:FT:PL' || format == 'GT:GQ:GQX:DPI:AD:ADF:ADR:FT:PL:PS' ) {
                result = this.calculateUnifiedData2(format, formatData);
            } else if (format == 'GT:DP:VD:AD:AF:RD:ALD') {
                result = this.calculateVarDictData(formatData);
            } else if (format == 'GT:GQ:AD:DP:VF:NL:SB:NC:US:AQ:LQ' || format == 'GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB' || format == 'GT:SQ:AD:AF:F1R2:F2R1:DP:SB:MB:PS') {
                result = this.calculateUnifiedData3(format, formatData);
            } else if (format.indexOf('SGCOUNTREF_F:SGCOUNTREF_R:SGCOUNTALT_F:SGCOUNTALT_R') != -1) {
                result = this.calculateLauraData(format, formatData);
            } else if (format == 'GT:GQ:DP:FDP:RO:FRO:AO:FAO:AF:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR') {
                result = this.calculateTorrentA(formatData, variantIndex);
            } else if (format == 'GT:GQ:DP:FDP:RO:FRO:AO:FAO:SAR:SAF:SRF:SRR:FSAR:FSAF:FSRF:FSRR') {
                result = this.calculateTorrentA2(formatData, variantIndex);
            } else if (format == 'GT:AF:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR') {
                result = this.calculateTorrentB(formatData, variantIndex);
            } else if (format == 'GT:AO:DP:FAO:FDP:FRO:FSAF:FSAR:FSRF:FSRR:GQ:RO:SAF:SAR:SRF:SRR') {
                result = this.calculateTorrentB2(formatData, variantIndex);
            } else if (format == 'GT:GQ:DP:RO:AO:SAR:SAF:SRF:SRR') {
                result = this.calculateTorrentC(formatData, variantIndex);
            } else if (format == 'GT:DP:ADALL:AD:GQ:IGT:IPS:PS') {
                result = this.calculateOtherData(formatData, variantIndex);
            } else if (format == 'GT:PS:DP:ADALL:AD:GQ') {
                result = this.calculateOtherData3(formatData, variantIndex);
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

    /**
     * Calculate data from VCF line for LoFeq VCF
     * @param  {string} infoData: Variant info data. Exp: DP=496;AF=0.060484;SB=2;DP4=221,245,16,14
     * @return {object}
     */
    calculateLoFeqData (infoData) {
        let data, DP4, readDepth, alleleFrequency, coverage

        /**
         * Read depth = DP4 = 221 + 245 + 16 + 14 = 496
         * AF= (DP4[2] + DP4[3]) / Read depth = (16+14) / 496 * 100%= 6%
         * Coverage = "(221 + 245) : (16 + 14)" = "466 : 30"
         */
        data = infoData.split(';')

        DP4 = data[3].split('=')

        // Make sure this is a LoFeq VCF
        if (DP4[0] != 'DP4') {
            return {
                readDepth: null,
                alleleFrequency: null
            }
        }

        DP4 = DP4[1].split(',')
        // Make sure data is integer
        DP4.forEach((item, index) => {
            DP4[index] = parseInt(item)
        })

        readDepth = DP4[0] + DP4[1] + DP4[2] + DP4[3]
        alleleFrequency = (DP4[2] + DP4[3]) / readDepth
        coverage = `${DP4[0] + DP4[1]}:${DP4[2] + DP4[3]}`

        return {
            readDepth: readDepth,
            alleleFrequency: alleleFrequency,
            coverage: coverage
        }
    }

    /**
     * Calculate data from VCF line for Unified VCF
     * @param  {string} formatData: Variant FORMAT data.
     * @return {object}
     */
    calculateUnifiedData (format, formatData) {
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

    calculateUnifiedData3 (format, formatData) {
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

    /**
     * Calculate data from VCF line for Unified VCF
     * @param  {string} formatData: Variant FORMAT data.
     * @return {object}
     */
    calculateUnifiedData2 (format, formatData) {
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

    /**
     * Calculate data from VCF line for Other VCF
     * @param  {string} formatData: Variant FORMAT data.
     * @return {object}
     */
    calculateOtherData (formatData) {
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

    calculateOtherData3 (formatData) {
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

    calculateTorrentA (formatData, variantIndex) {
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

    calculateTorrentA2 (formatData, variantIndex) {
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

    calculateTorrentB (formatData, variantIndex) {
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

    calculateTorrentB2 (formatData, variantIndex) {
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

    calculateTorrentC (formatData, variantIndex) {
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

    /**
     * Calculate data from VCF line for VarDict VCF
     * @param  {string} formatData: Variant FORMAT data.
     * @return {object}
     */
    calculateVarDictData (formatData) {
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

    /**
     * Calculate data from VCF line for Laura VCF
     * @param  {string} format: Variant FORMAT
     * @param  {string} formatData: Variant FORMAT data
     * @return {object}
     */
    calculateLauraData (format, formatData) {
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

    /**
     * Get Coding Effect
     * @param  {string} data
     * @return {string}
     */
    getCodingEffect (data) {
        let variantOntology = HELPER.VARIANT_ONTOLOGY;

        for (var i in variantOntology) {
            if (data == variantOntology[i][0]) {
                return variantOntology[i][1];
            }
        }

        return 'other';
    }

    /**
     * get varLocation
     * @param  {string} data
     * @return {string}
     */
    getVarLocation (data) {
        let variantOntology = HELPER.VARIANT_ONTOLOGY;

        for (var i in variantOntology) {
            if (data == variantOntology[i][0]) {
                return variantOntology[i][2];
            }
        }

        return 'other';

    }

    /**
     * Get cosmicId
     * @param  {string} data
     * @return {array}
     */
    getCosmicIds (data) {
        let dataArray = data.split(',')
        let cosmicIds = []

        for (var i in dataArray) {
            if (dataArray[i].indexOf('COSM') != -1) {
                cosmicIds.push(dataArray[i])
            }
        }

        return cosmicIds
    }

    getRsID (vcfRSID, vepRSID) {
        // if (vcfRSID != '.') {
        //     return vcfRSID;
        // }

        var rsIdArray = vepRSID.split(',');
        for ( var i in rsIdArray ) {
            var rsId = rsIdArray[i]
            if (rsId.indexOf('rs') != -1) {
                return rsId;
            }
        }

        return '.';
    }

    getGnomAD (gnomAD_exome, gnomAD_genome) {
        if (gnomAD_exome != '.') {
            return gnomAD_exome
        }
        if (gnomAD_genome != '.') {
            return gnomAD_genome
        }
        return '.'
    }

    formatCLINSIG (data) {
        if (data == '' || data == undefined || data == null) {
            return data;
        }
        var clinsig = data.split("_").join(" ");
        return clinsig;
    }

    getShortedRefAlt (Ref, Alt) {
        if (Ref.length == 1 || Alt.length == 1) {
            return {
                REF: Ref,
                ALT: Alt
            }
        }
        if (Ref[Ref.length -1] != Alt[Alt.length -1]) {
            return {
                REF: Ref,
                ALT: Alt
            }
        }

        while (Ref.length > 1 && Alt.length > 1 && Ref[Ref.length -1] == Alt[Alt.length -1]) {
            Ref = Ref.substring(0, Ref.length - 1);
            Alt = Alt.substring(0, Alt.length - 1);
        }

        return {
            REF: Ref,
            ALT: Alt
        }
    }

    getDeletion (Ref, Alt, STRAND) {
        var self = this

        if (Ref.length <= Alt.length) {
            return ''
        }
        if (Ref.indexOf(Alt) == 0) {
            return self.getComplementary(Ref.substring(Alt.length), STRAND)
        }

        var result = self.getShortedRefAlt(Ref, Alt)
        Ref = result.REF
        Alt = result.ALT

        if (Ref.length <= Alt.length) {
            return ''
        }

        if (Ref.indexOf(Alt) == 0) {
            return self.getComplementary(Ref.substring(Alt.length), STRAND)
        } else {
            return ''
        }
    }

    getComplementary (deletion, strand) {
        if (strand == -1 || strand == "-1") {
            let deletionRevert = deletion.split("").reverse()
            let compDel = ''
            let compArr = {
                'A': 'T',
                'T': 'A',
                'G': 'C',
                'C': 'G'
            }
            for (var i in deletionRevert) {
                compDel += compArr[deletionRevert[i]]
            }
            return compDel
        } else {
            return deletion;
        }
    }

    getMAX_AF (gnomAD) {
        let gnomAD_WES_AF = {
            AFR : gnomAD.gnomAD_exome_AFR,
            AMR : gnomAD.gnomAD_exome_AMR,
            ASJ : gnomAD.gnomAD_exome_ASJ,
            EAS : gnomAD.gnomAD_exome_EAS,
            FIN : gnomAD.gnomAD_exome_FIN,
            NFE : gnomAD.gnomAD_exome_NFE,
            OTH : gnomAD.gnomAD_exome_OTH,
            SAS : gnomAD.gnomAD_exome_SAS
        }

        let gnomAD_WGS_AF = {
            AFR: gnomAD.gnomAD_genome_AFR,
            AMR: gnomAD.gnomAD_genome_AMR,
            ASJ: gnomAD.gnomAD_genome_ASJ,
            EAS: gnomAD.gnomAD_genome_EAS,
            FIN: gnomAD.gnomAD_genome_FIN,
            NFE: gnomAD.gnomAD_genome_NFE,
            OTH: gnomAD.gnomAD_genome_OTH,
        }

        let gnomAD_AF

        if (gnomAD_WES_AF.AMR != '.') {
            gnomAD_AF = gnomAD_WES_AF;
        } else {
            gnomAD_AF = gnomAD_WGS_AF;
        }

        let maxAF = 0;

        for (var i in gnomAD_AF) {
            if (gnomAD_AF[i] != '.' && isNaN(gnomAD_AF[i]) == false) {
                if (maxAF < parseFloat(gnomAD_AF[i])) {
                    maxAF = gnomAD_AF[i];
                }
            }
        }

        if (maxAF == '.' || maxAF == 0) {
            return {
                MAX_AF: '.',
                MAX_AF_POPS: '.'
            }
        }

        let maxAF_POPS = []

        for (var i in gnomAD_AF) {
            if (maxAF == gnomAD_AF[i]) {
                maxAF_POPS.push(i)
            }
        }

        return {
                MAX_AF: maxAF,
                MAX_AF_POPS: maxAF_POPS.join(',')
            }
    }

    /**
     * Calculate CLINSIG_PRIORITY, CLINSIG_FINAL
     * @return {object}
     */
    calculateClinsigFinal (CLINSIG, alleleFrequencyData, codingEffect, gene, CLINSIG_ID, HGMD) {
        let self = this;

        let CLINSIG_FINAL
        let CLINSIG_PRIORITY
        let hasClinicalSynopsis = 0
        let lossOfFunction = 0
        let clinicalSynopsisGene = HELPER.GENES;
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
                } else if((alleleFrequencyData.varLocation.indexOf('exonic') != -1 || alleleFrequencyData.varLocation.indexOf('splicing') != -1 ) && clinicalSynopsisGene.indexOf(gene) != -1) {
                    CLINSIG_PRIORITY = 2.6
                    hasClinicalSynopsis = 1
                } else if(clinicalSynopsisGene.indexOf(gene) != -1) {
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
            } else if((alleleFrequencyData.varLocation.indexOf('exonic') != -1 || alleleFrequencyData.varLocation.indexOf('splicing') != -1 ) && clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.6
                hasClinicalSynopsis = 1
            } else if(clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.7
                hasClinicalSynopsis = 1    
            } else if (self.isLossOfFunctionMutation(codingEffect)) {
                lossOfFunction = 1
            }
        } else if (self.isLikelyBenign(CLINSIG , alleleFrequencyData)) {
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
            } else if((alleleFrequencyData.varLocation.indexOf('exonic') != -1 || alleleFrequencyData.varLocation.indexOf('splicing') != -1 ) && clinicalSynopsisGene.indexOf(gene) != -1) {
                CLINSIG_PRIORITY = 2.6
                hasClinicalSynopsis = 1
            } else if(clinicalSynopsisGene.indexOf(gene) != -1) {
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

    isLossOfFunctionMutation (codingEffect) {
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
            /start\sloss/i.test(codingEffect) ) {
            return true
        }
        return false;
    }

    isDrugResponse (CLINSIG) {
        return /drug\sresponse/i.test(CLINSIG)
    }

    isDrugResponseGoldStar (CLINSIG) {
        return (CLINSIG == 'drug response' || CLINSIG == 'drug response, other')
    }

    isPathogenic (CLINSIG) {
        return /(^pathogenic)|([^(likely\s)]pathogenic)/i.test(CLINSIG)
    }

    isLikelyPathogenic (CLINSIG) {
        return /likely\spathogenic/i.test(CLINSIG)
    }

    isUncertainsignificance (CLINSIG) {
        return /uncertain\ssignificance/i.test(CLINSIG)
    }

    isBenign (CLINSIG, data) {
        return ( /(^benign)|([^(likely\s)]benign)/i.test(CLINSIG)) ||
            (data.gnomAD_exome_ALL != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ALL >= 0.05) ||
            (data.gnomAD_exome_AFR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AFR >= 0.05) ||
            (data.gnomAD_exome_AMR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AMR >= 0.05) ||
            (data.gnomAD_exome_ASJ != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ASJ >= 0.05) ||
            (data.gnomAD_exome_EAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_EAS >= 0.05) ||
            (data.gnomAD_exome_FIN != Config.ANNOVAR_NASTRING && data.gnomAD_exome_FIN >= 0.05) ||
            (data.gnomAD_exome_NFE != Config.ANNOVAR_NASTRING && data.gnomAD_exome_NFE >= 0.05) ||
            (data.gnomAD_exome_OTH != Config.ANNOVAR_NASTRING && data.gnomAD_exome_OTH >= 0.05) ||
            (data.gnomAD_exome_SAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_SAS >= 0.05) ||
            (data.AF_1000g != Config.ANNOVAR_NASTRING && data.AF_1000g >= 0.05) ||
            (data.EAS_AF_1000g != Config.ANNOVAR_NASTRING && data.EAS_AF_1000g >= 0.05) ||
            (data.AMR_AF_1000g != Config.ANNOVAR_NASTRING && data.AMR_AF_1000g >= 0.05) ||
            (data.AFR_AF_1000g != Config.ANNOVAR_NASTRING && data.AFR_AF_1000g >= 0.05) ||
            (data.EUR_AF_1000g != Config.ANNOVAR_NASTRING && data.EUR_AF_1000g >= 0.05) ||
            (data.SAS_AF_1000g != Config.ANNOVAR_NASTRING && data.SAS_AF_1000g >= 0.05)

    }

    isBenignA (data) {
        return (data.gnomAD_exome_ALL != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ALL > 0.05) ||
            (data.gnomAD_exome_AFR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AFR > 0.05) ||
            (data.gnomAD_exome_AMR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AMR > 0.05) ||
            (data.gnomAD_exome_ASJ != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ASJ > 0.05) ||
            (data.gnomAD_exome_EAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_EAS > 0.05) ||
            (data.gnomAD_exome_FIN != Config.ANNOVAR_NASTRING && data.gnomAD_exome_FIN > 0.05) ||
            (data.gnomAD_exome_NFE != Config.ANNOVAR_NASTRING && data.gnomAD_exome_NFE > 0.05) ||
            (data.gnomAD_exome_OTH != Config.ANNOVAR_NASTRING && data.gnomAD_exome_OTH > 0.05) ||
            (data.gnomAD_exome_SAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_SAS > 0.05) ||
            (data.EAS_AF_1000g != Config.ANNOVAR_NASTRING && data.EAS_AF_1000g > 0.05) ||
            (data.AMR_AF_1000g != Config.ANNOVAR_NASTRING && data.AMR_AF_1000g > 0.05) ||
            (data.AFR_AF_1000g != Config.ANNOVAR_NASTRING && data.AFR_AF_1000g > 0.05) ||
            (data.EUR_AF_1000g != Config.ANNOVAR_NASTRING && data.EUR_AF_1000g > 0.05) ||
            (data.SAS_AF_1000g != Config.ANNOVAR_NASTRING && data.SAS_AF_1000g > 0.05)
    }

    isLikelyBenign (CLINSIG, data) {
        return (/likely\sbenign/i.test(CLINSIG) ) ||
            (data.gnomAD_exome_ALL != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ALL >= 0.01 && data.gnomAD_exome_ALL < 0.05) ||
            (data.gnomAD_exome_AFR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AFR >= 0.01 && data.gnomAD_exome_AFR < 0.05) ||
            (data.gnomAD_exome_AMR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AMR >= 0.01 && data.gnomAD_exome_AMR < 0.05) ||
            (data.gnomAD_exome_ASJ != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ASJ >= 0.01 && data.gnomAD_exome_ASJ < 0.05) ||
            (data.gnomAD_exome_EAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_EAS >= 0.01 && data.gnomAD_exome_EAS < 0.05) ||
            (data.gnomAD_exome_FIN != Config.ANNOVAR_NASTRING && data.gnomAD_exome_FIN >= 0.01 && data.gnomAD_exome_FIN < 0.05) ||
            (data.gnomAD_exome_NFE != Config.ANNOVAR_NASTRING && data.gnomAD_exome_NFE >= 0.01 && data.gnomAD_exome_NFE < 0.05) ||
            (data.gnomAD_exome_OTH != Config.ANNOVAR_NASTRING && data.gnomAD_exome_OTH >= 0.01 && data.gnomAD_exome_OTH < 0.05) ||
            (data.gnomAD_exome_SAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_SAS >= 0.01 && data.gnomAD_exome_SAS < 0.05) ||
            (data.EAS_AF_1000g != Config.ANNOVAR_NASTRING && data.EAS_AF_1000g >= 0.01 && data.EAS_AF_1000g < 0.05) ||
            (data.AMR_AF_1000g != Config.ANNOVAR_NASTRING && data.AMR_AF_1000g >= 0.01 && data.AMR_AF_1000g < 0.05) ||
            (data.AFR_AF_1000g != Config.ANNOVAR_NASTRING && data.AFR_AF_1000g >= 0.01 && data.AFR_AF_1000g < 0.05) ||
            (data.EUR_AF_1000g != Config.ANNOVAR_NASTRING && data.EUR_AF_1000g >= 0.01 && data.EUR_AF_1000g < 0.05) ||
            (data.SAS_AF_1000g != Config.ANNOVAR_NASTRING && data.SAS_AF_1000g >= 0.01 && data.SAS_AF_1000g < 0.05)
    }

    isHgmdPathogenic (data) {
        return (data.gnomAD_exome_ALL != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ALL < 0.05) ||
            (data.gnomAD_exome_AFR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AFR < 0.05) ||
            (data.gnomAD_exome_AMR != Config.ANNOVAR_NASTRING && data.gnomAD_exome_AMR < 0.05) ||
            (data.gnomAD_exome_ASJ != Config.ANNOVAR_NASTRING && data.gnomAD_exome_ASJ < 0.05) ||
            (data.gnomAD_exome_EAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_EAS < 0.05) ||
            (data.gnomAD_exome_FIN != Config.ANNOVAR_NASTRING && data.gnomAD_exome_FIN < 0.05) ||
            (data.gnomAD_exome_NFE != Config.ANNOVAR_NASTRING && data.gnomAD_exome_NFE < 0.05) ||
            (data.gnomAD_exome_OTH != Config.ANNOVAR_NASTRING && data.gnomAD_exome_OTH < 0.05) ||
            (data.gnomAD_exome_SAS != Config.ANNOVAR_NASTRING && data.gnomAD_exome_SAS < 0.05) ||
            (data.EAS_AF_1000g != Config.ANNOVAR_NASTRING && data.EAS_AF_1000g < 0.05) ||
            (data.AMR_AF_1000g != Config.ANNOVAR_NASTRING && data.AMR_AF_1000g < 0.05) ||
            (data.AFR_AF_1000g != Config.ANNOVAR_NASTRING && data.AFR_AF_1000g < 0.05) ||
            (data.EUR_AF_1000g != Config.ANNOVAR_NASTRING && data.EUR_AF_1000g < 0.05) ||
            (data.SAS_AF_1000g != Config.ANNOVAR_NASTRING && data.SAS_AF_1000g < 0.05)
    }
}

module.exports.VCF = VCF
