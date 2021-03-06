'use strict';

/*
 * Copyright 2016 Next Century Corporation
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
 * This controller manages the common behavior for all single layer Neon dashboard visualizations.
 * @namespace neonDemo.controllers
 * @class singleLayerController
 * @extends visualizationSuperclass
 * @constructor
 */
angular.module('neonDemo.controllers').controller('singleLayerController', ['$scope', '$controller', 'DatasetService', function($scope, $controller, datasetService) {
    $controller('visualizationSuperclassController', {
    $scope: $scope
});

    // All needed properties will be defined in $scope.active.
    $scope.active.layers = undefined;

    // The data for all single layer visualizations will be filterable (needed for superclass functions).
    $scope.active.filterable = true;

    // Use the resize behavior defined in the options-menu directive.
    $scope.resizeOptionsMenu = undefined;

    // Always return true for single layer visualizations.
    $scope.functions.needToUpdateFilter = function() {
        return true;
    };

    // Save the original functions to call in their overwritten versions.
    var createLinks = $scope.functions.createLinks;
    var createLinkButtons = $scope.functions.createLinkButtons;
    var getColorMaps = $scope.functions.getColorMaps;
    var getFilterKey = $scope.functions.getFilterKey;
    var getMapping = $scope.functions.getMapping;
    var getSortedFields = $scope.functions.getSortedFields;
    var getUnsortedFields = $scope.functions.getUnsortedFields;

    /******************** SUBCLASS ABSTRACT FUNCTIONS ********************/

    /**
     * Creates and returns an object containing the data needed to export this visualization.
     * @method $scope.functions.createExportDataObject
     * @param {String} exportId
     * @param {neon.query.Query} query
     * @return {Object}
     */
    $scope.functions.createExportDataObject = function() {
        return {};
    };

    /******************** SUBCLASS UTILITY FUNCTIONS ********************/

    /**
     * Creates and returns the links for the given field object and item object.
     * @method $scope.functions.createLinks
     * @param {Object} field The field object on which to create the links containing {String} columnName
     * @param {String} value The value on which to create the links
     * @return {Boolean} Whether any links were created
     */
    $scope.functions.createLinks = function(field, value) {
        return createLinks($scope.active.database.name, $scope.active.table.name, field, value);
    };

    /**
     * Creates and returns the link buttons for the given field object and data array.
     * @method $scope.functions.createLinkButtons
     * @param {Object} field The field object on which to create the link containing {String} columnName
     * @param {Array} array A list of objects each containing a property matching the field name
     * @return {Array} The list of link buttons as HTML strings
     */
    $scope.functions.createLinkButtons = function(field, array) {
        return createLinkButtons($scope.active.database.name, $scope.active.table.name, field, array);
    };

    /**
     * Finds and returns the field object in the global list of fields that matches the binding or mapping with the given key.
     * Returns a blank field object if no such field exists.
     * @method $scope.functions.findFieldObject
     * @param {String} bindingKey The name of a visualization binding that may contain a field name
     * @param {String} mappingKey The name of a Neon mapping that may contain a field name
     * @return {Object}
     */
    $scope.functions.findFieldObject = function(bindingKey, mappingKey) {
        var find = function(name) {
            return _.find($scope.active.fields, function(field) {
                return field.columnName === name;
            });
        };

        var field;
        if(bindingKey) {
            field = find($scope.bindings[bindingKey]);
        }

        if(!field && mappingKey) {
            field = find($scope.functions.getMapping(mappingKey));
        }

        return field || datasetService.createBlankField();
    };

    /**
     * Returns the color maps for the field with the given name.
     * @method $scope.functions.getColorMaps
     * @param {String} fieldName
     * @return {Object}
     */
    $scope.functions.getColorMaps = function(fieldName) {
        return getColorMaps($scope.active, fieldName);
    };

    /**
     * Returns the filter key for the given Neon filter clause.
     * @method $scope.functions.getFilterKey
     * @param {Object} filterClause
     * @return {String}
     */
    $scope.functions.getFilterKey = function(filterClause) {
        return getFilterKey($scope.active, filterClause);
    };

    /**
     * Returns the mapping for the given key or any empty string if no mapping exists.
     * @method $scope.functions.getMapping
     * @param {String} key
     * @return {String}
     */
    $scope.functions.getMapping = function(key) {
        return getMapping($scope.active.database.name, $scope.active.table.name, key);
    };

    /**
     * Returns the list of sorted fields (in alphabetical order) for the given database and table or for this visualization's active database and table.
     * @method $scope.functions.getSortedFields
     * @param {Object} [database] (Optional)
     * @param {Object} [table] (Optional)
     * @return {Array}
     */
    $scope.functions.getSortedFields = function(database, table) {
        if(database && table) {
            return getSortedFields({
                database: database,
                table: table
            });
        }
        return getSortedFields($scope.active);
    };

    /**
     * Returns the list of unsorted fields (in the order they are defined in the dashboard configuration).
     * @method $scope.functions.getUnsortedFields
     * @return {Array}
     */
    $scope.functions.getUnsortedFields = function() {
        return getUnsortedFields($scope.active);
    };

    /************************* SUPERCLASS FUNCTIONS *************************/

    // Overwrite to initialize the data for a single layer (on $scope.active instead of as an element in the $scope.active.layers array).
    $scope.initData = function() {
        updateDatabases();
    };

    /**
     * Gets the list of databases from the dataset service, sets the active database, table, and fields, and queries for new data.
     * @method updateDatabases
     * @private
     */
    var updateDatabases = function() {
        $scope.active.databases = datasetService.getDatabases();
        $scope.active.database = $scope.active.databases[0];
        if($scope.bindings.database) {
            $scope.active.databases.forEach(function(database) {
                if($scope.bindings.database === database.name) {
                    $scope.active.database = database;
                }
            });
        }

        updateTables();
    };

    /**
     * Gets the list of tables from the dataset service, sets the active table and fields, and queries for new data.
     * @method updateTables
     * @private
     */
    var updateTables = function() {
        $scope.active.tables = datasetService.getTables($scope.active.database.name);
        $scope.active.table = $scope.active.tables[0];
        if($scope.bindings.table) {
            $scope.active.tables.forEach(function(table) {
                if($scope.bindings.table === table.name) {
                    $scope.active.table = table;
                }
            });
        }

        updateFields();
    };

    /**
     * Gets the list of fields from the dataset service, sets the active fields, and queries for new data.
     * @method updateFields
     * @private
     */
    var updateFields = function() {
        // Sort the fields that are displayed in the dropdowns in the options menus alphabetically.
        $scope.active.fields = datasetService.getSortedFields($scope.active.database.name, $scope.active.table.name);

        $scope.active.unsharedFilterField = $scope.functions.findFieldObject("unsharedFilterField");
        $scope.active.unsharedFilterValue = $scope.bindings.unsharedFilterValue || "";

        $scope.functions.onUpdateFields();
        $scope.functions.onChangeOption();
    };

    // Overwrite to return the active properties as the single data layer for this visualization.
    $scope.getDataLayers = function() {
        return [$scope.active];
    };

    // Overwrite to add the config for the single data layer as properties to the bindings object instead of in a config array.
    $scope.addLayerConfigToBindings = function(bindings) {
        var hasUnsharedFilter = $scope.functions.isFieldValid($scope.active.unsharedFilterField) && $scope.active.unsharedFilterValue;

        bindings.database = ($scope.active.database && $scope.active.database.name) ? $scope.active.database.name : undefined;
        bindings.unsharedFilterField = hasUnsharedFilter ? $scope.active.unsharedFilterField.columnName : undefined;
        bindings.unsharedFilterValue = hasUnsharedFilter ? $scope.active.unsharedFilterValue : undefined;
        bindings.table = ($scope.active.table && $scope.active.table.name) ? $scope.active.table.name : undefined;

        return bindings;
    };

    /************************* ANGULAR FUNCTIONS *************************/

    // Overwrite to include more information in the visualization title.
    $scope.createTitle = function(resetQueryTitle) {
        if(resetQueryTitle) {
            $scope.queryTitle = "";
        }
        if($scope.queryTitle) {
            return $scope.queryTitle;
        }
        if($scope.bindings.title) {
            return $scope.bindings.title;
        }
        var title = $scope.active.unsharedFilterValue ? $scope.active.unsharedFilterValue + " " : "";
        if(_.keys($scope.active).length) {
            return title + ($scope.active.table ? $scope.active.table.prettyName : "");
        }
        return title;
    };

    // Overwrite to create export data for only a single data layer.
    $scope.createExportData = function(buildQueryFunction) {
        var query = buildQueryFunction($scope.getDataLayers(), $scope.active.database.name, $scope.active.table.name);
        return $scope.functions.createExportDataObject($scope.exportId, $scope.addToExportQuery(query));
    };

    // Overwrite to define the needed behavior.
    $scope.handleChangeDatabase = function() {
        updateTables();
        $scope.functions.logChangeAndUpdate("database", $scope.active.database.name);
    };

    // Overwrite to define the needed behavior.
    $scope.handleChangeTable = function() {
        updateFields();
        $scope.functions.logChangeAndUpdate("table", $scope.active.table.name);
    };

    // Overwrite to define the needed behavior.
    $scope.handleChangeUnsharedFilterField = function() {
        $scope.active.unsharedFilterValue = "";
        $scope.logChange("unsharedFilterField", $scope.active.unsharedFilterField.columnName);
    };

    // Overwrite to define the needed behavior.
    $scope.handleChangeUnsharedFilterValue = function() {
        $scope.functions.logChangeAndUpdate("unsharedFilterValue", $scope.active.unsharedFilterValue);
    };

    // Overwrite to define the needed behavior.
    $scope.handleRemoveUnsharedFilter = function() {
        $scope.active.unsharedFilterValue = "";
        $scope.functions.logChangeAndUpdate("unsharedFilter", "", "button");
    };
}]);
