#!/bin/bash
# *******************************************
# Script to perform DNA seq variant calling
# using a single sample with fastq files
# named 1.fastq.gz and 2.fastq.gz
# *******************************************

# Update with the fullpath location of your sample fastq
export PATH=/usr/lib/jvm/java-1.8.0-openjdk-amd64/bin:$PATH
fastq_folder=$PWD
fastq_1=$1 # "$fastq_folder/1.fastq.gz"
fastq_2=$2  #"$fastq_folder/2.fastq.gz" #If using Illumina paired data
BED=$3
sample=$4 #"sample_name"
group="$sample"
platform="ILLUMINA"
removeDeduplication=$5
ref="/apps/sentieon/references"

# Update with the location of the reference data files
fasta="$ref/hs37d5/hs37d5.fa"
dbsnp="$ref/dbsnp_138.hg19.vcf"
known_Mills_indels="$ref/Mills_and_1000G_gold_standard.indels.hg19.sites.vcf"
known_1000G_indels="$ref/1000G_phase1.indels.hg19.sites.vcf"

#determine whether Variant Quality Score Recalibration will be run
#VQSR should only be run when there are sufficient variants called
run_vqsr="yes"
# Update with the location of the resource files for VQSR
vqsr_Mill="$ref/Mills_and_1000G_gold_standard.indels.hg19.sites.vcf"
vqsr_1000G_omni="$ref/1000G_omni2.5.hg19.sites.vcf"
vqsr_hapmap="$ref/hapmap_3.3.hg19.sites.vcf"
vqsr_1000G_phase1="$ref/1000G_phase1.snps.high_confidence.hg19.sites.vcf"
vqsr_1000G_phase1_indel="$ref/1000G_phase1.indels.hg19.sites.vcf"
vqsr_dbsnp="$ref/dbsnp_138.hg19.vcf"

# Update with the location of the Sentieon software package and license file
release_dir="/apps/sentieon/201808.08"
export SENTIEON_LICENSE=/apps/sentieon/lic/Breakthrough_Genomics_eval.lic

# Other settings
nt=100 #number of threads to use in computation
workdir="$PWD" #/test/DNAseq" #Determine where the output files will be stored

# ******************************************
# 0. Setup
# ******************************************
mkdir -p $workdir
logfile=$workdir/run.log
exec >$logfile 2>&1
cd $workdir

echo "Starting"
prev=`date +%s`
current=`date +%s`
duration=0

echo date

# ******************************************
# 1. Mapping reads with BWA-MEM, sorting
# ******************************************
#The results of this call are dependent on the number of threads used. To have number of threads independent results, add chunk size option -K 10000000
#(  $release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 || echo -n 'error' ) | $release_dir/bin/sentieon util sort -r $fasta -o sorted.bam -t $nt --sam2bam -i -

if [ $# -gt 5 ]; then
	key=0
	$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 |  samtools view -Sb -o pre_bwa_0.bam -@ $nt  -
	for (( i = 0; i <= $#; i++ )); do
		if [ $i -gt 5 -a `expr $i % 2` -eq 0 ]; then
			fq1=$i
			fq2=`expr $i + 1`
			key=`expr $key + 1`
			$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta ${!fq1} ${!fq2} |  samtools view -Sb -o pre_bwa_${key}.bam -@ $nt  -
		fi
	done
	samtools merge bwa.bam pre_bwa_*.bam --threads $nt
else
	$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 |  samtools view -Sb -o bwa.bam -@ $nt  -
fi

samtools view -F 4 bwa.bam -o bwa_ali.bam --threads $nt # remove un-mapped reads
$release_dir/bin/sentieon util sort -o sorted.bam bwa_ali.bam -t $nt

echo "Finish Mapping reads with BWA-MEM, sorting"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 2. Metrics"

# 1.1 filter un-align reads

#samtools view -F 4 sorted.bam -o sorted_ali.bam --threads $nt
#samtools index sorted_ali.bam sorted_ali.bai -@ $nt

# ******************************************
# 2. Metrics
# ******************************************
$release_dir/bin/sentieon driver -r $fasta -t $nt -i sorted.bam --algo MeanQualityByCycle mq_metrics.txt --algo QualDistribution qd_metrics.txt --algo GCBias --summary gc_summary.txt gc_metrics.txt --algo AlignmentStat --adapter_seq '' aln_metrics.txt --algo InsertSizeMetricAlgo is_metrics.txt --algo LocusCollector --fun score_info score.txt.gz
$release_dir/bin/sentieon plot metrics -o metrics-report.pdf gc=gc_metrics.txt qd=qd_metrics.txt mq=mq_metrics.txt isize=is_metrics.txt

echo "Finish 2.Metrics"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 3. Remove Duplicate Reads"

# ******************************************
# 3. Remove Duplicate Reads
# ******************************************
if [ "$removeDeduplication" = "NO" ]; then
	cp sorted.bam deduped.bam
	cp sorted.bam.bai deduped.bam.bai
else
	$release_dir/bin/sentieon driver -t $nt -i sorted.bam --algo Dedup  --score_info score.txt.gz  --metrics dedup_metrics.txt deduped.bam # mark duplicates
fi

echo "Finish 3. Remove Duplicate Reads"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 4.1 filter MQ 41"

# 4.1 filter MQ 41
MQ=20
samtools view -q $MQ deduped.bam  -o deduped_mQ$MQ.bam --threads $nt
samtools index  deduped_mQ$MQ.bam  deduped_mQ$MQ.bai -@ $nt

#$release_dir/../run/get_QC.sh sorted.bam sorted_ali.bam deduped.bam deduped_mQ$MQ.bam  $BED >get_QC

#/home/ubuntu/apps/FastQC/fastqc -o ./ -f bam sorted_ali.bam

echo "Finish 4.1 filter MQ 41"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 4. Indel realigner"

# ******************************************
# 4. Indel realigner
# ******************************************
$release_dir/bin/sentieon driver -r $fasta -t $nt -i deduped_mQ$MQ.bam --algo Realigner -k $known_Mills_indels -k $known_1000G_indels realigned.bam

echo "Finish 4. Indel realigner"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 5a. BQSR & 5b. Run BQSR stage2 in background"

# ******************************************
# 5a. BQSR
# *****************************************
$release_dir/bin/sentieon driver -r $fasta -t $nt -i deduped_mQ$MQ.bam --algo QualCal -k $dbsnp -k $known_Mills_indels -k $known_1000G_indels recal_data.table

# *****************************************
# 5b. Run BQSR stage2 in background
# *****************************************
bash -c "$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam  -q recal_data.table --algo QualCal -k $dbsnp -k $known_Mills_indels -k $known_1000G_indels recal_data.table.post
$release_dir/bin/sentieon driver -t $nt --algo QualCal --plot --before recal_data.table --after recal_data.table.post ${workdir}/recal.csv
$release_dir/bin/sentieon plot bqsr -o recal_plots.pdf recal.csv" &

echo "Finish 5a. BQSR & 5b. Run BQSR stage2 in background"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"

# ******************************************
# 4. Indel realigner
# ******************************************
#$release_dir/bin/sentieon driver -r $fasta -t $nt -i deduped.bam --algo Realigner -k $known_Mills_indels -k $known_1000G_indels realigned.bam

# ******************************************
# 5. Base recalibration
# ******************************************
#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam --algo QualCal -k $dbsnp -k $known_Mills_indels -k $known_1000G_indels recal_data.table
#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --algo QualCal -k $dbsnp -k $known_Mills_indels -k $known_1000G_indels recal_data.table.post
#$release_dir/bin/sentieon driver -t $nt --algo QualCal --plot --before recal_data.table --after recal_data.table.post recal.csv
#$release_dir/bin/sentieon plot bqsr -o recal_plots.pdf recal.csv

echo "Start 6a. UG Variant caller"

# ******************************************
# 6a. UG Variant caller
# ******************************************
$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table  --interval $BED   --algo Genotyper -d $dbsnp --var_type BOTH  --emit_conf=30 --call_conf=30 output-ug.vcf.gz

#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --interval $BED    --algo Genotyper -d $dbsnp --var_type BOTH --emit_conf=30 --call_conf=30 output-ug.vcf.gz

echo "Finish 6a. UG Variant caller"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 6b. HC Variant caller"
# ******************************************
# 6b. HC Variant caller
# ******************************************
$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table  --interval $BED  --algo Haplotyper --trim_soft_clip -d $dbsnp --emit_conf=30 --call_conf=30 output-hc.vcf.gz

#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --interval $BED   --algo Haplotyper -d $dbsnp --emit_conf=30 --call_conf=30 output-hc.vcf.gz

echo "Finish 6b. HC Variant caller"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"
echo "Start 6c merge VCF"

# 6c merge VCF
java -jar $release_dir/../../GATK/3.7/GenomeAnalysisTK.jar -T CombineVariants  -R $fasta  --variant  output-ug.vcf.gz --variant output-hc.vcf.gz -o output-merged.vcf -genotypeMergeOptions UNIQUIFY

echo "Finish 6c merge VCF"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"

# ******************************************
# 5b. ReadWriter to output recalibrated bam
# This stage is optional as variant callers
# can perform the recalibration on the fly
# using the before recalibration bam plus
# the recalibration table
# ******************************************
#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --algo ReadWriter recaled.bam

echo "Start 6.0 QC read count"


# 6.0 QC read count
$release_dir/../run_v3/get_QC.sh bwa.bam sorted_ali.bam deduped.bam deduped_mQ$MQ.bam  $BED >get_QC
/apps/bedtools/bedtools-2.17.0/bin/coverageBed  -abam realigned.bam  -b $BED  -d  >every-nt
perl /apps/sentieon/run_v3/OnTargetReadDepth.pl  every-nt $sample >every-nt.depth

if [[ "$BED" == *"GeneCoverage_formated"* ]]; then
	#statements
	/apps/bedtools/bedtools-2.17.0/bin/coverageBed  -abam realigned.bam  -b $BED.genes.bed  -d  >every-nt-genes
	perl /apps/sentieon/run_v3/OnTargetReadDepth.pl  every-nt-genes $sample >every-nt-genes.depth
fi

$release_dir/bin/sentieon driver -r $fasta -i deduped.bam  --algo HsMetricAlgo --targets_list $BED.interval --baits_list $BED.interval  hs_metrics.txt

echo "Finish 6.0 QC read count"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"

echo "Start covid_19.sh"

# $release_dir/../run_v3/gender_prediction.sh every-nt > gender.result
$release_dir/../run_v3/predict_gender_v2_localserver output-hc.vcf.gz $release_dir/../run_v3/bed/x_chrom_regions.bed > gender.result

if [[ "$BED" == *"SNP_formated"* ]]; then
	$release_dir/../run_v3/snp_localserver.sh realigned.bam
fi

# $release_dir/../run_v3/covid_19_localserver.sh realigned.bam

# *****************************************

/apps/bedtools/bedtools-2.17.0/bin/coverageBed  -abam bwa.bam -b /home/user/genesets/wes_wellness.bed -d > wellness.depth

echo "Finish wellness.depth"
prev=$current
current=`date +%s`
duration=$(($current - $prev))
echo "Duration: $duration"

# ******************************************
# 7. Variant Recalibration
# ******************************************
if [ "$run_vqsr" = "NO" ]; then

	echo "Start 7. Variant Recalibration"
	#for SNP
	#create the resource argument
	resource_text="--resource $vqsr_1000G_phase1 --resource_param 1000G,known=false,training=true,truth=false,prior=10.0 "
	resource_text="$resource_text --resource $vqsr_1000G_omni --resource_param omni,known=false,training=true,truth=true,prior=12.0 "
	resource_text="$resource_text --resource $vqsr_dbsnp --resource_param dbsnp,known=true,training=false,truth=false,prior=2.0 "
	resource_text="$resource_text --resource $vqsr_hapmap --resource_param hapmap,known=false,training=true,truth=true,prior=15.0"
	#create the annotation argument
	annotation_array="QD MQ MQRankSum ReadPosRankSum FS"
	for annotation in $annotation_array; do
	  annotate_text="$annotate_text --annotation $annotation"
	done
	#Run the VQSR
	$release_dir/bin/sentieon driver -r $fasta --algo VarCal -v output-hc.vcf.gz $resource_text $annotate_text --var_type SNP --plot_file vqsr_SNP.hc.plot_file.txt --max_gaussians 8 --srand 47382911 --tranches_file vqsr_SNP.hc.tranches vqsr_SNP.hc.recal
	#apply the VQSR
	$release_dir/bin/sentieon driver -r $fasta --algo ApplyVarCal -v output-hc.vcf.gz --var_type SNP --recal vqsr_SNP.hc.recal --tranches_file vqsr_SNP.hc.tranches --sensitivity 99.5 vqsr_SNP.hc.recaled.vcf.gz
	#plot the report
	$release_dir/bin/sentieon plot vqsr -o vqsr_SNP.VQSR.pdf vqsr_SNP.hc.plot_file.txt

	#for indels after SNPs
	#create the resource argument
	resource_text="--resource $vqsr_1000G_phase1_indel --resource_param 1000G,known=false,training=true,truth=false,prior=10.0 "
	resource_text="$resource_text --resource $vqsr_Mill --resource_param Mills,known=false,training=true,truth=true,prior=12.0 "
	resource_text="$resource_text --resource $vqsr_dbsnp --resource_param dbsnp,known=true,training=false,truth=false,prior=2.0 "
	#create the annotation argument
	annotation_array="QD MQ ReadPosRankSum FS"
	annotate_text=""
	for annotation in $annotation_array; do
	  annotate_text="$annotate_text --annotation $annotation"
	done
	#Run the VQSR
	$release_dir/bin/sentieon driver -r $fasta --algo VarCal -v vqsr_SNP.hc.recaled.vcf.gz $resource_text $annotate_text --var_type INDEL --plot_file vqsr_SNP_INDEL.hc.plot_file.txt --max_gaussians 4 --srand 47382911 --tranches_file vqsr_SNP_INDEL.hc.tranches vqsr_SNP_INDEL.hc.recal
	#apply the VQSR
	$release_dir/bin/sentieon driver -r $fasta --algo ApplyVarCal -v vqsr_SNP.hc.recaled.vcf.gz --var_type INDEL --recal vqsr_SNP_INDEL.hc.recal --tranches_file vqsr_SNP_INDEL.hc.tranches --sensitivity 99.5 vqsr_SNP_INDEL.hc.recaled.vcf.gz
	#plot the report
	$release_dir/bin/sentieon plot vqsr -o vqsr_SNP_INDEL.VQSR.pdf vqsr_SNP_INDEL.hc.plot_file.txt

	echo "Finish 7. Variant Recalibration"
fi
