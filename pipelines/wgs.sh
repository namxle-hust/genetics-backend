#!/bin/bash
# *******************************************
# Script to perform DNA seq variant calling
# using a single sample with fastq files
# named 1.fastq.gz and 2.fastq.gz
# *******************************************
# Update with the fullpath location of your sample fastq
fastq_folder=$PWD
fastq_1=$1 # "$fastq_folder/1.fastq.gz"
fastq_2=$2  #"$fastq_folder/2.fastq.gz" #If using Illumina paired data
#BED=$3
sample=$3 #"sample_name"
group="$sample"
platform="ILLUMINA"
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
nt=50 #number of threads to use in computation
workdir="$PWD" #/test/DNAseq" #Determine where the output files will be stored

# ******************************************
# 0. Setup
# ******************************************
mkdir -p $workdir
logfile=$workdir/run.log
exec >$logfile 2>&1
cd $workdir

echo "Mapping reads with BWA-MEM" $(date)

# ******************************************
# 1. Mapping reads with BWA-MEM, sorting
# ******************************************
#The results of this call are dependent on the number of threads used. To have number of threads independent results, add chunk size option -K 10000000 
#(  $release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 || echo -n 'error' ) | $release_dir/bin/sentieon util sort -r $fasta -o sorted.bam -t $nt --sam2bam -i -
#echo "Mapping reads with sorting" $(date) 
#$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 |  samtools view -Sb  -o bwa.bam -@ $nt  -
#$release_dir/bin/sentieon util sort -o sorted.bam bwa.bam -t $nt 

if [ $# -gt 3 ]; then
	key=0
	echo $fastq_1 $fastq_2 pre_bwa_${key}.bam
	$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 |  samtools view -Sb -o pre_bwa_0.bam -@ $nt  -
	for (( i = 0; i <= $#; i++ )); do
		if [ $i -gt 3 -a `expr $i % 2` -eq 0 ]; then
			fq1=$i
			fq2=`expr $i + 1`
			key=`expr $key + 1`
			echo ${!fq1} ${!fq2} pre_bwa_${key}.bam
			$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta ${!fq1} ${!fq2} |  samtools view -Sb -o pre_bwa_${key}.bam -@ $nt  -
		fi
	done
	samtools merge bwa.bam pre_bwa_*.bam --threads $nt
else
	echo $fastq_1 $fastq_2 "bwa.bam"
	$release_dir/bin/bwa mem -M -R "@RG\tID:$group\tSM:$sample\tPL:$platform" -t $nt  $fasta $fastq_1 $fastq_2 |  samtools view -Sb -o bwa.bam -@ $nt  -
fi

$release_dir/bin/sentieon util sort -o sorted.bam bwa.bam -t $nt

# 1.1 filter un-align reads

#samtools view -F 4 sorted.bam -o sorted_ali.bam --threads $nt 
#samtools index sorted_ali.bam sorted_ali.bai -@ $nt

# ******************************************
# 2. Metrics
# ******************************************
echo "Metrics" $(date) 
$release_dir/bin/sentieon driver -r $fasta -t $nt -i sorted.bam --algo MeanQualityByCycle mq_metrics.txt --algo QualDistribution qd_metrics.txt --algo GCBias --summary gc_summary.txt gc_metrics.txt --algo AlignmentStat --adapter_seq '' aln_metrics.txt --algo InsertSizeMetricAlgo is_metrics.txt --algo LocusCollector --fun score_info score.txt.gz
$release_dir/bin/sentieon plot metrics -o metrics-report.pdf gc=gc_metrics.txt qd=qd_metrics.txt mq=mq_metrics.txt isize=is_metrics.txt

# ******************************************
# 3. Remove Duplicate Reads
# ******************************************
echo "Remove Duplicate Reads" $(date)
$release_dir/bin/sentieon driver -t $nt -i sorted.bam --algo Dedup  --score_info score.txt.gz  --metrics dedup_metrics.txt deduped.bam # mark duplicates 

# 4.1 filter MQ 41
MQ=20
samtools view -q $MQ deduped.bam  -o deduped_mQ$MQ.bam --threads $nt
samtools index  deduped_mQ$MQ.bam  deduped_mQ$MQ.bai -@ $nt
  
#$release_dir/../run/get_QC.sh sorted.bam sorted_ali.bam deduped.bam deduped_mQ$MQ.bam  $BED >get_QC

#/home/ubuntu/apps/FastQC/fastqc -o ./ -f bam sorted_ali.bam

# ******************************************
# 4. Indel realigner
# ******************************************
echo "Indel realigner" $(date)
$release_dir/bin/sentieon driver -r $fasta -t $nt -i deduped_mQ$MQ.bam  --algo Realigner -k $known_Mills_indels -k $known_1000G_indels realigned.bam

# ******************************************
# 5a. BQSR
# *****************************************
echo "BQSR" $(date)
$release_dir/bin/sentieon driver -r $fasta -t $nt -i deduped_mQ$MQ.bam --algo QualCal -k $dbsnp -k $known_Mills_indels -k $known_1000G_indels recal_data.table

# *****************************************
# 5b. Run BQSR stage2 in background
# *****************************************
echo "Run BQSR stage2" $(date)
bash -c "$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam  -q recal_data.table --algo QualCal -k $dbsnp -k $known_Mills_indels -k $known_1000G_indels recal_data.table.post
$release_dir/bin/sentieon driver -t $nt --algo QualCal --plot --before recal_data.table --after recal_data.table.post ${workdir}/recal.csv
$release_dir/bin/sentieon plot bqsr -o recal_plots.pdf recal.csv" &



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

# ******************************************
# 6a. UG Variant caller
# ******************************************
echo "UG Variant caller" $(date)
$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table   --algo Genotyper -d $dbsnp --var_type BOTH  --emit_conf=30 --call_conf=30 output-ug.vcf.gz

#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --interval $BED    --algo Genotyper -d $dbsnp --var_type BOTH --emit_conf=30 --call_conf=30 output-ug.vcf.gz

# ******************************************
# 6b. HC Variant caller
# ******************************************
echo "HC Variant caller" $(date)
$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table  --algo Haplotyper -d $dbsnp --emit_conf=30 --call_conf=30 --trim_soft_clip  output-hc.vcf.gz

#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --interval $BED   --algo Haplotyper -d $dbsnp --emit_conf=30 --call_conf=30 output-hc.vcf.gz

# ******************************************
# 5b. ReadWriter to output recalibrated bam
# This stage is optional as variant callers
# can perform the recalibration on the fly
# using the before recalibration bam plus
# the recalibration table
# ******************************************
#$release_dir/bin/sentieon driver -r $fasta -t $nt -i realigned.bam -q recal_data.table --algo ReadWriter recaled.bam


# 6.0 QC read count
echo "QC read count" $(date)
#$release_dir/../run/get_QC.sh sorted.bam sorted_ali.bam deduped.bam deduped_mQ$MQ.bam  $BED >get_QC
#/apps/bedtools/2/bin/coverageBed  -abam realigned.bam  -b $BED  -d  >every-nt
#perl /apps/sentieon/run/OnTargetReadDepth.pl  every-nt $sample >every-nt.depth

/apps/bedtools/tmp/2/bin/coverageBed -abam  realigned.bam  -b /data/BED/covid_19_use.tsv -d > corona.txt

echo "HS_metrics" $(date)
$release_dir/bin/sentieon driver -r $fasta -i deduped.bam  --algo HsMetricAlgo --targets_list $BED.interval --baits_list $BED.interval  hs_metrics.txt

echo "Done" $(date)
# ******************************************
# 7. Variant Recalibration
# ******************************************
if [ "$run_vqsr" = "yes" ]; then
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
fi

if test -f "metrics-report.pdf"; then
	convert -density 300 -trim metrics-report.pdf -quality 100 metrics-chart.jpg && mv metrics-chart-1.jpg metrics-chart-1a.jpg && mv metrics-chart-2.jpg metrics-chart-1.jpg && mv metrics-chart-1a.jpg metrics-chart-2.jpg && mogrify -crop 0x2000+0+0 metrics-chart-0.jpg && mogrify -crop 0x2000+0+0 metrics-chart-1.jpg && mogrify -crop 0x2000+0+0 metrics-chart-2.jpg && mogrify -crop 0x2000+0+0 metrics-chart-3.jpg
fi

#CNV Files

mkdir CNV
cd CNV

dotnet /apps/Canvas/Canvas-1.40.0.1613+master_x64/Canvas.dll  SmallPedigree-WGS  -b ../realigned.bam  --sample-b-allele-vcf  ../vqsr_SNP_INDEL.hc.recaled.vcf.gz -r /apps/sentieon/references/hs37d5/hs37d5.fa  -g /apps/sentieon/references/hs37d5/ -f /apps/sentieon/references/canvas/filter13.bed -o ./ 

#QC FILES

cd ../ && mkdir QC && cd QC

export SENTIEON_LICENSE=/apps/sentieon/lic/Breakthrough_Genomics_eval.lic
/apps/sentieon/201808.08/bin/sentieon driver -r /apps/sentieon/references/hs37d5/hs37d5.fa -i ../deduped.bam  --algo WgsMetricsAlgo deduped_wgs_metrics.txt
samtools flagstat ../bwa.bam -@40 > flagstat
nohup /apps/bedtools/tmp/2/bin/coverageBed -abam ../realigned.bam  -b /data/WGS/BED/Homo_sapiens.GRCh37.75.genes.UTR.Agilent_v6.intersect_GIAB_highconf.veritas_snps.p_lp_risk_Y_MT_20200222.bed -d >every-nt
perl /apps/sentieon/run_v2/OnTargetReadDepth.pl  every-nt every-nt  >every-nt.depth


less deduped_wgs_metrics.txt | awk -F"\t" '{if(NR==3){print $0}}' > data_deduped.tsv

less flagstat | awk -F" " '{if(NR == 1){printf "%s", $1"\t"} if(NR == 5){printf "%s", $1"\t"; printf(substr($5,index($5,"(") + 1,index($5,"%") - 2))}}' > data_flagstat.tsv

awk -F"\t" 'FNR==NR{raw_reads=$1; reads_mapped=$2; rm_percent=$3 ; next;}{duplicate_rate=(1-$7)*reads_mapped; printf("%s %.1f %s", raw_reads"\t"reads_mapped"\t"rm_percent"\t"$2"\t"$3"\t"$7"\t", duplicate_rate, "\t"$13"\t"$15"\t"$17"\t"$19"\t"$20"\t"$21"\n")}' data_flagstat.tsv data_deduped.tsv | awk -F"\t" '{print "Raw reads\tReads Mapped\tReads Mapped Percent\tMEAN_COVERAGE\tSD_COVERAGE\tPCT_EXC_DUPE\tDuplicates Rate\tPCT_1X\tPCT_10X\tPCT_20X\tPCT_30X\tPCT_40X\tPCT_50X"; print $0}' > wgs_metrics.txt

echo -e  "chrom\tstart\tend\tmax\tmin\tavg\tlength\tindex" > scatter-data-header.tsv && less  every-nt.depth |shuf -n 10000 | awk -F"\t" '{split($2, a, "_"); print a[1]"\t"a[2]"\t"a[3]"\t"$3"\t"$4"\t"$5"\t"$6}' | vcf-sort -c | awk -F"\t" '{print $0"\t"NR}' > scatter-data-no-header.tsv && cat scatter-data-header.tsv scatter-data-no-header.tsv > scatter-data.tsv && rm scatter-data-header.tsv scatter-data-no-header.tsv

cd ../

/apps/sentieon/run_v2/bed_files/PGL/PGL.sh $workdir/realigned.bam $workdir/vqsr_SNP_INDEL.hc.recaled.vcf.gz $sample

# RUN split reads command

/apps/sentieon/run_v3/extract_split_reads_v2.sh $workdir/realigned.bam $workdir $sample

# RUN split reads command for CNV

cd $workdir

/apps/sentieon/run_v3/annotate_cnv_by_split_reads CNV/CNV.vcf.gz split_reads.bam /apps/sentieon/run_v3/conf.sr


/apps/sentieon/run_v3/sentieon_run_mito.sh sorted.bam $sample

/apps/sentieon/run_v3/update_wgs_vcf_file.sh $sample