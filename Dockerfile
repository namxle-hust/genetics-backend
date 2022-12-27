FROM namxle/ubuntu

RUN mkdir test

RUN wget https://ftp-trace.ncbi.nlm.nih.gov/sra/sdk/3.0.1/sratoolkit.3.0.1-ubuntu64.tar.gz
RUN tar -xf sratoolkit.3.0.1-ubuntu64.tar.gz

RUN ln -s /home/ubuntu/sratoolkit.3.0.1-ubuntu64/bin/* /home/ubuntu/.local/bin

FROM broadinstitute/gatk:latest

RUN mkdir 
