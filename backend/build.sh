#!/usr/bin/env bash
# Render build script for SmartAttend backend
set -o errexit

pip install --upgrade pip
pip install --no-cache-dir -r requirements.txt

# Create necessary directories
mkdir -p static data
