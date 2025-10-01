#!/usr/bin/env sh
# Husky helper script

# Skip Husky if HUSKY=0
if [ "$HUSKY" = "0" ]; then
  exit 0
fi