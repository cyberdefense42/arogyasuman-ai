#!/bin/bash

echo "Testing multiple file upload..."

# Create test files
echo "Test content for file 1" > test1.txt
echo "Test content for file 2" > test2.txt

# Test multiple file upload
curl -X POST http://localhost:8080/api/v1/upload \
  -F "files=@test1.txt" \
  -F "files=@test2.txt" \
  -v

# Clean up
rm test1.txt test2.txt

echo -e "\nTest completed!"