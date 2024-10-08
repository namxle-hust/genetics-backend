FROM ubuntu:18.04

RUN rm /bin/sh && ln -s /bin/bash /bin/sh

RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

RUN apt-get update -y && apt-get install git nano -y && apt-get install unzip && apt-get install  -y
RUN apt-get update -y && \
    apt-get install -y build-essential libfuse-dev libcurl4-openssl-dev libxml2-dev pkg-config libssl-dev mime-support automake libtool wget tar git unzip curl
RUN apt-get install lsb-release -y  && apt-get install zip -y && apt-get install nano awscli -y

RUN wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu1804-x86_64-100.6.1.deb
RUN apt install -y ./mongodb-database-tools-ubuntu1804-x86_64-100.6.1.deb

# RUN apt-get install -y poppler-utils

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 16.17.1

RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.30.1/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use $NODE_VERSION

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN npm install -g yarn

# Install s3-fs

RUN rm -rf /usr/src/s3fs-fuse
RUN git clone https://github.com/s3fs-fuse/s3fs-fuse/ /usr/src/s3fs-fuse
WORKDIR /usr/src/s3fs-fuse
### Only use V1.90
RUN git checkout cd466eb
RUN ./autogen.sh && ./configure && make && make install

RUN echo "user_allow_other" >> /etc/fuse.conf

RUN mkdir /home/s3
RUN mkdir /root/.aws
