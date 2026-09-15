#!/bin/bash
# Quick test script to check login endpoint

echo "Testing login endpoint..."
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  --max-time 5 \
  -v 2>&1 | grep -E "(< HTTP|message|error)" | head -10
