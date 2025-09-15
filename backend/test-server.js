// Simple test script to verify backend functionality
const http = require('http');

const testBackend = () => {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.status === 'OK') {
          console.log('✅ Backend server is running and healthy');
          console.log(`📊 Uptime: ${response.uptime} seconds`);
          console.log(`🌐 Environment: ${response.environment}`);
        } else {
          console.log('❌ Backend responded with unexpected status:', response);
        }
      } catch (e) {
        console.log('❌ Failed to parse backend response:', e.message);
      }
    });
  });

  req.on('error', (e) => {
    console.log('❌ Backend server is not running or not accessible');
    console.log('💡 Start the server with: cd backend && npm run dev');
  });

  req.on('timeout', () => {
    console.log('❌ Backend server connection timeout');
    req.destroy();
  });

  req.end();
};

// Run test if this file is executed directly
if (require.main === module) {
  testBackend();
}

module.exports = { testBackend };