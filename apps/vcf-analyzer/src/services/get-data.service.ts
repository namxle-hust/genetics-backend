import { VARIANT_ONTOLOGY } from "@app/common";
import { Injectable } from "@nestjs/common";


@Injectable()
export class GetDataService {

    getMAX_AF(gnomAD) {
        let gnomAD_WES_AF = {
            AFR: gnomAD.gnomAD_exome_AFR,
            AMR: gnomAD.gnomAD_exome_AMR,
            ASJ: gnomAD.gnomAD_exome_ASJ,
            EAS: gnomAD.gnomAD_exome_EAS,
            FIN: gnomAD.gnomAD_exome_FIN,
            NFE: gnomAD.gnomAD_exome_NFE,
            OTH: gnomAD.gnomAD_exome_OTH,
            SAS: gnomAD.gnomAD_exome_SAS
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

        let maxAF: number | string = 0;

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

    getComplementary(deletion, strand) {
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

    getDeletion(Ref, Alt, STRAND) {
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

    getShortedRefAlt(Ref, Alt) {
        if (Ref.length == 1 || Alt.length == 1) {
            return {
                REF: Ref,
                ALT: Alt
            }
        }
        if (Ref[Ref.length - 1] != Alt[Alt.length - 1]) {
            return {
                REF: Ref,
                ALT: Alt
            }
        }

        while (Ref.length > 1 && Alt.length > 1 && Ref[Ref.length - 1] == Alt[Alt.length - 1]) {
            Ref = Ref.substring(0, Ref.length - 1);
            Alt = Alt.substring(0, Alt.length - 1);
        }

        return {
            REF: Ref,
            ALT: Alt
        }
    }

    formatCLINSIG(data) {
        if (data == '' || data == undefined || data == null) {
            return data;
        }
        var clinsig = data.split("_").join(" ");
        return clinsig;
    }

    getGnomAD(gnomAD_exome, gnomAD_genome) {
        if (gnomAD_exome != '.') {
            return gnomAD_exome
        }
        if (gnomAD_genome != '.') {
            return gnomAD_genome
        }
        return '.'
    }

    getRsID(vcfRSID, vepRSID) {
        // if (vcfRSID != '.') {
        //     return vcfRSID;
        // }

        var rsIdArray = vepRSID.split(',');
        for (var i in rsIdArray) {
            var rsId = rsIdArray[i]
            if (rsId.indexOf('rs') != -1) {
                return rsId;
            }
        }

        return '.';
    }

    getCosmicIds(data) {
        let dataArray = data.split(',')
        let cosmicIds = []

        for (var i in dataArray) {
            if (dataArray[i].indexOf('COSM') != -1) {
                cosmicIds.push(dataArray[i])
            }
        }

        return cosmicIds
    }

    getVarLocation(data) {
        let variantOntology = VARIANT_ONTOLOGY;

        for (var i in variantOntology) {
            if (data == variantOntology[i][0]) {
                return variantOntology[i][2];
            }
        }

        return 'other';

    }

    getCodingEffect(data) {
        let variantOntology = VARIANT_ONTOLOGY;

        for (var i in variantOntology) {
            if (data == variantOntology[i][0]) {
                return variantOntology[i][1];
            }
        }

        return 'other';
    }

    appendToLine(line, data) {
        return `${data.join('\t')}\t${line}`
    }

    getGeneSymbol(extraData) {
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
}