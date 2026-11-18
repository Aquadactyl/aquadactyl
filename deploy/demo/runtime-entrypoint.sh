#!/bin/sh
set -eu
cd /home/container
exec python3 -u server.py
