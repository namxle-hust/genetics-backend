#!/bin/bash

sampleId=$1

nohup node vcf/run.js /home/s3/analyses/${sampleId}/analysis.vcf ${sampleId} /home/ubuntu/info/tmp/analysis_${sampleId}_vep.canonical >  /home/ubuntu/info/logs/test.log 2&>1 &

