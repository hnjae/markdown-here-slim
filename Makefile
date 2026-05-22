#
# Copyright Adam Pritchard 2014
# MIT License : https://adampritchard.mit-license.org/
#


DIST_DIR = dist

.PHONY: all clean build

build:
	pnpm build

clean:
	pnpm clean

all: build
