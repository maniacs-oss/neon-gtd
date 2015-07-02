'use strict';
/*
 * Copyright 2014 Next Century Corporation
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

// Defaulting the Neon SERVER_URL to be under the neon context on the same host machine.
// Used by neon core server.  Don't delete this or you will probably break everything!
neon.SERVER_URL = "/neon";

var neonDemo = angular.module('neonDemo', [
    'neonDemo.controllers',
    'neonDemo.services',
    'neonDemo.directives',
    'neonDemo.filters',
    'gridster'
]);

angular.module('neonDemo.directives', [
    'gantt',
    //'gantt.sortable',
    //'gantt.movable',
    // 'gantt.drawtask',
    'gantt.tooltips',
    // 'gantt.bounds',
    //'gantt.progress',
    //'gantt.table',
    'gantt.tree',
    'gantt.groups'
    //'gantt.resizeSensor'
]);
angular.module('neonDemo.controllers', []);
angular.module('neonDemo.services', []);

angular.module('neonDemo.filters', [])
.filter('numberShort', function() {
    return function(number) {
        if(typeof number !== undefined) {
            var abs = Math.abs(number);
            if(abs >= Math.pow(10, 12)) {
                number = (number / Math.pow(10, 12)).toFixed(1) + "T";
            } else if(abs < Math.pow(10, 12) && abs >= Math.pow(10, 9)) {
                number = (number / Math.pow(10, 9)).toFixed(1) + "B";
            } else if(abs < Math.pow(10, 9) && abs >= Math.pow(10, 6)) {
                number = (number / Math.pow(10, 6)).toFixed(1) + "M";
            } else if(abs < Math.pow(10, 6) && abs >= Math.pow(10, 3)) {
                number = (number / Math.pow(10, 3)).toFixed(1) + "K";
            } else {
                number = Math.round(number * 100) / 100;
            }
        }
        return number;
    };
});

var XDATA = {};

// Start angular once all of the configuration variables have been read from the JSON file(s) and set in the module.
var startAngular = function() {
    angular.bootstrap(document, ['neonDemo']);
};

var saveLayouts = function(layouts) {
    neonDemo.constant('layouts', layouts);
};

var readLayoutFiles = function($http, layouts, layoutFiles, callback) {
    if(layoutFiles.length) {
        var layoutFile = layoutFiles.shift();
        $http.get(layoutFile).success(function(layoutConfig) {
            if(layoutConfig.name && layoutConfig.layout) {
                layouts[layoutConfig.name] = layoutConfig.layout;
            }
            readLayoutFiles($http, layouts, layoutFiles, callback);
        });
    } else {
        saveLayouts(layouts);
        if(callback) {
            callback();
        }
    }
};

var saveDatasets = function(datasets) {
    neonDemo.value('datasets', datasets);
};

var readDatasetFiles = function($http, datasets, datasetFiles, callback) {
    if(datasetFiles.length) {
        var datasetFile = datasetFiles.shift();
        $http.get(datasetFile).success(function(datasetConfig) {
            if(datasetConfig.dataset) {
                datasets.push(datasetConfig.dataset);
            }
            readDatasetFiles($http, datasets, datasetFiles, callback);
        });
    } else {
        saveDatasets(datasets);
        if(callback) {
            callback();
        }
    }
};

angular.element(document).ready(function() {
    var $http = angular.injector(['ng']).get('$http');
    $http.get('./config/config.json').success(function(config) {
        // Configure the user-ale logger.
        var aleConfig = (config.user_ale || {
            loggingUrl: "http://192.168.1.100",
            toolName: "Neon Dashboard",
            elementGroups: [
                "top",
                "map_group",
                "table_group",
                "chart_group",
                "query_group",
                "graph_group"
            ],
            workerUrl: "lib/user-ale/js/userale-worker.js",
            debug: false,
            sendLogs: false
        });
        XDATA.userALE = new userale(aleConfig);
        XDATA.userALE.register();

        var opencpuConfig = (config.opencpu || {
            enableOpenCpu: false
        });

        if(opencpuConfig.enableOpenCpu) {
            ocpu.enableLogging = opencpuConfig.enableLogging;
            ocpu.useAlerts = opencpuConfig.useAlerts;
            ocpu.seturl(opencpuConfig.url);
            ocpu.connected = true;
        }

        var dashboardConfig = config.dashboard || {
            gridsterColumns: 6,
            gridsterMargins: 10,
            hideNavbarItems: false,
            showFilterStatusTray: false,
            hideAdvancedOptions: false,
            hideErrorNotifications: false,
            hideHeader: false
        };
        neonDemo.constant('config', dashboardConfig);

        neonDemo.value('popups', {
            links: {
                setData: function() {},
                setView: function() {},
                deleteData: function() {}
            }
        });

        var digConfig = (config.dig || {
            enabled: false
        });
        var externalAppConfig = {
            anyEnabled: digConfig.enabled,
            dig: digConfig
        };
        neonDemo.constant('external', externalAppConfig);

        var visualizations = (config.visualizations || []);
        neonDemo.constant('visualizations', visualizations);

        var files = (config.files || []);
        var layouts = (config.layouts || {});
        if(!(layouts.default)) {
            layouts.default = [];
        }
        var datasets = (config.datasets || []);

        // Read each layout config file and set the layouts, then read each dataset config file and set the datasets, then start angular.
        readLayoutFiles($http, layouts, (files.layouts || []), function() {
            readDatasetFiles($http, datasets, (files.datasets || []), startAngular);
        });
    });
});
