// Karma configuration file, see link for more information
// https://karma-runner.github.io/0.13/config/configuration-file.html

module.exports = function (config) {
    config.set({
        basePath: '',
        frameworks: ['jasmine', 'angular-cli'],
        plugins: [
            require('karma-jasmine'),
            require('karma-chrome-launcher'),
            require('karma-phantomjs-launcher'),
            require('karma-remap-istanbul'),
            require('karma-junit-reporter'),
            require('angular-cli/plugins/karma')
        ],
        files: [
            // Include support libraries and angular material
            { pattern: './src/test.ts', watched: false },
            // Pull in the neon-gtd version file.  Do NOT include it in the test rig via a <script> tag.
            { pattern: './src/app/config/version.json', watched: false, included: false }
        ],
        preprocessors: {
            './src/test.ts': ['angular-cli']
        },
        remapIstanbulReporter: {
            reports: {
                html: 'reports/coverage',
                lcovonly: './reports/coverage/coverage.lcov',
                // Include cobertura reports for Jenkins
                cobertura: './reports/coverage/cobertura-coverage.xml'
            }
        },
        angularCli: {
            config: './angular-cli.json',
            environment: 'dev'
        },
        mime: {
	    'text/x-typescript': ['ts','tsx']
        },
        reporters: ['progress', 'karma-remap-istanbul', 'junit'],
        junitReporter: {
            outputDir: 'reports/tests'
        },
        port: 9876,
        colors: true,
        logLevel: config.LOG_INFO,
        autoWatch: true,
        browsers: ['Chrome', 'PhantomJS'],
        singleRun: false,
        client: {
            captureConsole: true
        }
    });
};
