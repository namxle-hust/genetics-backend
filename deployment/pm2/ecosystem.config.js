module.exports = {
    apps: [
        {
            name: "fastq-analyzer",
            script: "/home/user/genetics/genetics-backend/dist/apps/fastq-analyzer/main.js",
            watch: true,
            env: {
                "RABBIT_MQ_URI": "amqp://localhost:5677",
                "RABBIT_MQ_SAMPLE_STATUS_QUEUE": "sample_status",
                "RABBIT_MQ_FASTQ_ANALYZING_QUEUE": "fastq_analyzing",
                "S3_BUCKET": "varigenes-storage",
                "S3_UPLOAD_FOLDER": "uploads",
                "S3_ANALYSES_FOLDER": 'analyses',
                "S3_PROFILE": "varigenes",
                "ANALYSIS_FOLDER": "/data/genetics/analyses",
                "INTERVAR_FILE": "/apps/sentieon/xgen-inherited-diseases-targets-05112018.bed",
                "WES_SENTIEON": "/home/user/genetics/genetics-backend/pipelines/wes.sh",
                "WGS_SENTIEON": "/home/user/genetics/genetics-backend/pipelines/wgs.sh",
                "DEFAULT_BED": "/home/user/genetics/genetics-backend/pipelines/default.bed",
                "PICARD_SCRIPT": "/apps/picard-jar/picard.jar",
                "INTERVAL_SD": "/apps/sentieon/references/hs37d5/hs37d5.fa.dict",
            }
        }
    ]
}