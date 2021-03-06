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
/**
 * This provides a bare-bones controller for the primary portion of index.html, the main page of the
 * application.
 *
 * @class neonDemo.controllers.neonDemoController
 * @constructor
 */
angular.module('neonDemo.controllers')
.controller('neonDemoController', ['$scope', '$timeout', '$location', 'config', 'datasets', 'ThemeService', 'ConnectionService', 'ErrorNotificationService',
function($scope, $timeout, $location, config, datasets, themeService, connectionService, errorNotificationService) {
    $scope.messenger = new neon.eventing.Messenger();

    $scope.theme = {
        list: themeService.getThemes(),
        selected: themeService.getTheme()
    };

    $scope.updateTheme = function() {
        themeService.setTheme($scope.theme.selected.name);
    };

    $scope.hideNavbarItems = config.hideNavbarItems;
    $scope.hideFilterStatusTray = config.hideFilterStatusTray;

    $scope.hideAddVisualizationsButton = config.hideAddVisualizationsButton;
    $scope.hideAdvancedOptions = config.hideAdvancedOptions;
    $scope.canImport = (window.File && window.FileReader && window.FileList && window.Blob);
    $scope.showImport = config.showImport;
    $scope.showExport = config.showExport;

    $scope.seeData = false;
    $scope.createFilters = false;
    $scope.filterCount = 0;
    $scope.element = $("body");
    $scope.help = config.help;
    $scope.loadedStateName = "";

    $scope.element = $(window);

    if($scope.hideNavbarItems) {
        for(var i = 0; i < datasets.length; ++i) {
            if(datasets[i].connectOnLoad) {
                $scope.navbarTitle = datasets[i].name;
                break;
            }
        }
    }

    /**
     * Opens either the overwrite state modal or the save new state modal, depending on
     * if there is a state loading already in the dashboard.
     * @method openStateModal
     */
    $scope.openStateModal = function() {
        var params = $location.search();
        var dashboardStateId = params.dashboard_state_id;
        var filterStateId = params.filter_state_id;

        if(dashboardStateId && filterStateId) {
            var connection = connectionService.getActiveConnection();
            if(connection) {
                var stateParams = {
                    dashboardStateId: dashboardStateId,
                    filterStateId: filterStateId
                };
                connection.getStateName(stateParams, function(response) {
                    // Only open the overwrite state modal if the dashboard and filter state
                    // IDs both come from the same state name
                    if(response.stateName) {
                        $scope.loadedStateName = response.stateName;
                        $('#overwriteStateModal').modal('show');
                    } else {
                        $('#saveNewStateModal').modal('show');
                    }
                }, function(response) {
                    errorNotificationService.showErrorMessage(null, response.responseJSON.error);
                });
            }
        } else {
            $('#saveNewStateModal').modal('show');
        }
    };

    /**
     * Basic gridster layout hander that will disable mouse events on gridster items via CSS so mouse handlers
     * in the items will not trigger and conflict with the layout action.
     * @method onStartGridsterLayoutChange
     * @private
     */
    var onStartGridsterSizeChange = function() {
        $('.gridster-item').css('pointer-events', 'none');
        XDATA.userALE.log({
            activity: "alter",
            action: "dragstart",
            elementId: "workspace",
            elementType: "workspace",
            elementSub: "layout",
            elementGroup: "top",
            source: "user",
            tags: ["visualization", "resize"]
        });
    };

    /**
     * Basic gridster layout hander that will enable mouse events on gridster items via CSS so mouse handlers
     * in the items will trigger again after the layout action was completed.
     * @method onStopGridsterLayoutChange
     * @private
     */
    var onStopGridsterSizeChange = function() {
        $('.gridster-item').css('pointer-events', 'auto');
        XDATA.userALE.log({
            activity: "alter",
            action: "dragend",
            elementId: "workspace",
            elementType: "workspace",
            elementSub: "layout",
            elementGroup: "top",
            source: "user",
            tags: ["visualization", "resize"]
        });
    };

    /**
     * Basic gridster layout hander that will log drag events for the user reordering visualizations.
     * @method onStartGridsterPositionChange
     * @private
     */
    var onStartGridsterPositionChange = function() {
        XDATA.userALE.log({
            activity: "alter",
            action: "dragstart",
            elementId: "workspace",
            elementType: "workspace",
            elementSub: "layout",
            elementGroup: "top",
            source: "user",
            tags: ["visualization", "reorder"]
        });
    };

    /**
     * Basic gridster layout hander that will log drag events for the user reordering visualizations.
     * @method onStopGridsterPositionChange
     * @private
     */
    var onStopGridsterPositionChange = function() {
        XDATA.userALE.log({
            activity: "alter",
            action: "dragend",
            elementId: "workspace",
            elementType: "workspace",
            elementSub: "layout",
            elementGroup: "top",
            source: "user",
            tags: ["visualization", "reorder"]
        });
    };

    var gridsterColumns = config.gridsterColumns;
    var gridsterMargins = config.gridsterMargins;

    $scope.gridsterOpts = {
        columns: gridsterColumns, // the width of the grid, in columns
        pushing: true, // whether to push other items out of the way on move or resize
        floating: true, // whether to automatically float items up so they stack (you can temporarily disable if you are adding unsorted items with ng-repeat)
        width: 'auto', // can be an integer or 'auto'. 'auto' scales gridster to be the full width of its containing element
        colWidth: 'auto', // can be an integer or 'auto'.  'auto' uses the pixel width of the element divided by 'columns'
        rowHeight: 'match', // can be an integer or 'match'.  Match uses the colWidth, giving you square widgets.
        margins: [gridsterMargins, gridsterMargins], // the pixel distance between each widget
        outerMargin: false, // whether margins apply to outer edges of the grid
        isMobile: false, // stacks the grid items if true
        mobileBreakPoint: 800, // if the screen is not wider that this, remove the grid layout and stack the items
        mobileModeEnabled: false, // whether or not to toggle mobile mode when screen width is less than mobileBreakPoint
        minColumns: 1, // the minimum columns the grid must have
        minRows: 1, // the minimum height of the grid, in rows
        maxRows: 100,
        defaultSizeX: 2, // the default width of a gridster item, if not specifed
        defaultSizeY: 2, // the default height of a gridster item, if not specified
        resizable: {
            enabled: true,
            handles: ['e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
            start: onStartGridsterSizeChange,
            stop: onStopGridsterSizeChange
        },
        draggable: {
            enabled: true, // whether dragging items is supported
            handle: '.visualization-drag-handle', // optional selector for draggable handle
            start: onStartGridsterPositionChange,
            stop: onStopGridsterPositionChange
        }
    };

    // No default visualizations.  They will be created once the user connects to a dataset in databaseConfig.js.
    $scope.visualizations = [];

    /**
     * Returns whether or not our gridster setup is currently in mobile mode.
     * @method isInMobileMode
     */
    $scope.isInMobileMode = function() {
        return ($scope.gridsterOpts.mobileModeEnabled &&
            ($('#gridster-div').width() <= $scope.gridsterOpts.mobileBreakPoint));
    };

    /**
     * Simple toggle method for tracking whether or not the create filters tray should be visible.
     * At present, this is used to sync an angular scope variable with the collapsed state of a div
     * whose visiblity is managed by Bootstrap hooks.
     * @method toggleCreateFilters
     */
    $scope.toggleCreateFilters = function() {
        $scope.createFilters = !$scope.createFilters;
        var activity = (true === $scope.createFilters) ? 'show' : 'hide';
        XDATA.userALE.log({
            activity: activity,
            action: "click",
            elementId: "filter-panel-button",
            elementType: "button",
            elementGroup: "top",
            source: "user",
            tags: ["filters"]
        });

        if($scope.createFilters && $scope.seeData) {
            // using timeout here to execute a jquery event outside of apply().  This is necessary
            // to avoid the event occuring within an apply() cycle and triggering another
            // update which calls apply() since the side-effects of the click would change
            // things that are watched in index.html.
            $timeout(function() {
                $($("[href='.data-tray']")[0]).click();
            }, 5, false);
        }
    };

    /**
     * Simple toggle method for tracking whether or not the data table tray should be visible.
     * At present, this is used to sync an angular scope variable with the collapsed state of a div
     * whose visiblity is managed by Bootstrap hooks.
     * @method toggleSeeData
     */
    $scope.toggleSeeData = function() {
        $scope.seeData = !$scope.seeData;
        var activity = (true === $scope.seeData) ? 'show' : 'hide';
        XDATA.userALE.log({
            activity: activity,
            action: "click",
            elementId: "data-table-button",
            elementType: "button",
            elementGroup: "top",
            source: "user",
            tags: ["datagrid"]
        });

        if($scope.createFilters && $scope.seeData) {
            // using timeout here to execute a jquery event outside of apply().  This is necessary
            // to avoid the event occuring within an apply() cycle and triggering another
            // update which calls apply() since the side-effects of the click would change
            // things that are watched in index.html.
            $timeout(function() {
                $($("[href='.filter-tray']")[0]).click();
            }, 5, false);
        }
    };

    // Display the dashboard once the configuration file has been loaded and the controller has finished its initialization.
    $scope.displayDashboard = true;

    // Pause the video if the modal is closed.
    $("#videoModal").on("hidden.bs.modal", function() {
        $("#helpVideo")[0].pause();
    });

    $('.select-theme').click(function(e) {
        e.stopPropagation();
    });

    // Update the minimum sizes of the visualizations based on the size of gridster in order to avoid unwanted styling and UX due to very small visualizations.
    // Note that changing the minimum sizes of the visualizations may cause reordering of the gridster layout.
    var updateVisualizationMinSizes = function() {
        var gridsterWidth = $("#gridster-div").width();
        var gridsterPixelsPerUnit = gridsterWidth / config.gridsterColumns;
        $scope.visualizations.forEach(function(visualization) {
            var minSizeX = 1;
            var visualizationMinWidth = minSizeX * gridsterPixelsPerUnit;
            while(visualizationMinWidth < (visualization.minPixelX)) {
                visualizationMinWidth = ++minSizeX * gridsterPixelsPerUnit;
            }
            visualization.minSizeX = minSizeX;

            var minSizeY = 1;
            var visualizationMinHeight = minSizeY * gridsterPixelsPerUnit;
            while(visualizationMinHeight < (visualization.minPixelY)) {
                visualizationMinHeight = ++minSizeY * gridsterPixelsPerUnit;
            }
            visualization.minSizeY = minSizeY;
        });
    };

    $scope.$watch("visualizations", function() {
        updateVisualizationMinSizes();
    });

    $scope.$on('gridster-resized', function() {
        updateVisualizationMinSizes();
    });
}]);
