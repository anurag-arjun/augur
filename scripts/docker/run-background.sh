#!/bin/bash

IMAGE=$1
TAG=core-$(npm view augur-core version)

echo "Running Geth with contracts deployed from augur-core@${TAG}"

docker run -e GETH_VERBOSITY=4 -it -d -p 8545:8545 -p 8546:8546 --name ${CONTAINER_NAME:-geth-node} $IMAGE:$TAG

