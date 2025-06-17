#!/bin/bash
echo "Testing admin login API..."
curl -v -X POST 'https://office.jzz77.cn:9003/admin-api/system/auth/login' \
  -H 'Content-Type: application/json' \
  -H 'tenant-id: 1' \
  -d '{"username":"admin","password":"jking1031"}' \
  2>&1
echo "\nCurl exit code: $?"