
let vcfFile = process.argv[2];
let analysisId = process.argv[3];
let vepOutput = process.argv[4];

const VCF =  require('./vcf')


let updateAnnotation = async () => {
    return new Promise((resolve, reject) => {
        let vcfHandler = new VCF.VCF()

        console.log(vcfFile)
        console.log(analysisId)
        console.log(vepOutput)

        vcfHandler.run(analysisId, vcfFile, vepOutput)

        vcfHandler.vcfEvents.on('completed', (result) => {

            if (result) {
                console.log(vcfHandler.annoVepFile)
                return resolve(true)
            } else {
                return reject()
            }
        })
    }) 
}

let run = async () => {
    try {
        await updateAnnotation();
        console.log('Done')
    } catch (error) {
        console.log(error);
    }
}

run();