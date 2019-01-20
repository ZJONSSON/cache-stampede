npm install
wait-for-it mongodb:27017
wait-for-it redis:6379
wait-for-it dynamodb:8000
node node_modules/tap/bin/run.js test/test-all.js --jobs=10 -Rspec --coverage-report=html --no-browser