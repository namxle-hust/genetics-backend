#!/bin/bash

analysisId=$1

rm -rf /home/ubuntu/info/tmp/analysis_${analysisId}_run*

nohup node vcf/run.js /home/s3/analyses/${analysisId}/analysis.vcf ${analysisId} /home/ubuntu/info/tmp/analysis_${analysisId}_vep.canonical >  /home/ubuntu/info/logs/test.log 2>&1 &

