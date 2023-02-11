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
                "S3_FAKE_FOLDER": "/data/genetics/s3",
                "ANALYSIS_FOLDER": "/data/genetics/analyses",
                "INTERVAR_FILE": "/apps/sentieon/xgen-inherited-diseases-targets-05112018.bed",
                "WES_SENTIEON": "/home/user/genetics/genetics-backend/pipelines/wes.sh",
                "WGS_SENTIEON": "/home/user/genetics/genetics-backend/pipelines/wgs.sh",
                "DEFAULT_BED": "/home/user/genetics/genetics-backend/pipelines/default.bed",
                "PICARD_SCRIPT": "/apps/picard-jar/picard.jar",
                "INTERVAL_SD": "/apps/sentieon/references/hs37d5/hs37d5.fa.dict",
            }
        },
        {
            name: 'information-service',
            script: "/home/user/genetics/genetics-backend/dist/apps/information/main.js",
            watch: true,
            env: {
                "VCF_IOBIO_HOST": "http://vg-dev-v2.btgenomics.com",

                "MONGODB_URI": "mongodb://root:password123@localhost:27017/",
                "MONGODB_DATABASE": "genetics",

                "S3_UPLOADER_ACCESS_KEY": "AKIAQL7EJQWFCM27TIOV",
                "S3_UPLOADER_SECRET_KEY": "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",
                "S3_UPLOAD_FOLDER": "uploads",
                "S3_BUCKET": "varigenes-storage",
                "S3_ROLE_ARN": "arn:aws:iam::025711707530:role/Varigenes-S3-Role",
                "S3_PROFILE": "varigenes",

                "LOCAL_UPLOAD_FOLDER": "/data/genetics/s3/uploads",
                "NODE_ENV": "production",

                "JWT_SECRET": "secret",
                "POSTGRES_URI": "postgresql://postgres:123@localhost:5434/genetics?schema=public",

                "IGV_SECRET_KEY": "itisawsomekey1599",
                "IGV_FILE_HOST": "https://data.btgenomics.com",
                "IGV_SERVER_FOLDER": "user_files/data",
                "ENLITER_HOST": "https://enliter.btgenomics.org"
            }
        }
    ]
}