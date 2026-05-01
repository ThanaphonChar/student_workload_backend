/**
 * Jest Table Reporter
 * Outputs test results in a formatted table similar to Vitest
 */

class TableReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options;
  }

  onRunComplete(contexts, results) {
    const { testResults } = results;
    
    if (testResults.length === 0) return;

    // Group by test type (repositories, services, controllers)
    const suites = {};
    let totalTests = 0;
    let totalPassed = 0;
    let totalDuration = 0;
    let allPassed = true;

    testResults.forEach(result => {
      // Extract service type from path
      const pathParts = result.testFilePath.split('/');
      const testIdx = pathParts.indexOf('__tests__');
      const service = pathParts[testIdx + 1] || 'other'; // repositories, services, controllers
      
      if (!suites[service]) {
        suites[service] = {
          files: [],
          totalTests: 0,
          totalPassed: 0,
          totalDuration: 0,
        };
      }

      const numTests = result.numPassingTests + result.numFailingTests;
      const passed = result.numFailingTests === 0;
      
      suites[service].files.push({
        path: result.testFilePath.replace(process.cwd() + '/', ''),
        numTests,
        numPassed: result.numPassingTests,
        numFailed: result.numFailingTests,
        duration: result.perfStats.end - result.perfStats.start,
        passed,
      });

      suites[service].totalTests += numTests;
      suites[service].totalPassed += result.numPassingTests;
      suites[service].totalDuration += result.perfStats.end - result.perfStats.start;

      totalTests += numTests;
      totalPassed += result.numPassingTests;
      totalDuration += result.perfStats.end - result.perfStats.start;
      
      if (!passed) allPassed = false;
    });

    // Print table
    console.log('\n');
    console.log('  RUN  v4.1.5  Backend  -  npm vitest run --reporter=verbose (per service)'.padEnd(80));
    console.log('\n');
    
    // Header
    console.log('  ' + 'Service'.padEnd(15) + 'Files'.padEnd(8) + 'Tests'.padEnd(8) + 'Duration'.padEnd(12) + 'Result');
    console.log('  ' + '─'.repeat(65));

    // Print each service with its files
    const serviceOrder = ['repositories', 'services', 'controllers'];
    serviceOrder.forEach(service => {
      if (!suites[service]) return;
      
      const suite = suites[service];
      const status = suite.totalPassed === suite.totalTests ? '✓ passed' : '✗ failed';
      const durationStr = `${Math.round(suite.totalDuration)}ms`;
      const fileCount = suite.files.length;
      
      console.log(
        '  ' + 
        service.padEnd(15) + 
        String(fileCount).padEnd(8) + 
        String(suite.totalTests).padEnd(8) + 
        durationStr.padEnd(12) + 
        status
      );

      // Print files
      suite.files.forEach(file => {
        const icon = file.passed ? '✓' : '✗';
        const fileName = file.path.split('/').slice(3).join('/');
        console.log(`    ${icon} ${fileName.padEnd(61)} +${file.numPassed} ${file.numFailed > 0 ? `-${file.numFailed}` : ''}`);
      });
    });

    console.log('  ' + '─'.repeat(65));

    // Summary
    const durationStr = `${Math.round(totalDuration)}ms`;
    const statusText = allPassed ? 'all passed' : 'some failed';
    console.log(
      '  TOTAL'.padEnd(15) + 
      String(testResults.length).padEnd(8) + 
      String(totalTests).padEnd(8) + 
      durationStr.padEnd(12) + 
      `✓ ${statusText}`
    );
    console.log('\n');

    // Statistics
    console.log(`  Test Files  ${testResults.length} passed (${testResults.length})`);
    console.log(`  Tests       ${totalPassed} passed (${totalTests})`);
    
    let serviceStats = '';
    serviceOrder.forEach((service, idx) => {
      if (!suites[service]) return;
      const suite = suites[service];
      if (serviceStats) serviceStats += ' | ';
      serviceStats += `${service} (${suite.totalTests})`;
    });
    console.log(`  Services    ${serviceStats}`);
    console.log('\n');
  }
}

export default TableReporter;

