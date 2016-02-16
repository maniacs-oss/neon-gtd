'use strict';

/*
 * Copyright 2015 Next Century Corporation
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

angular.module('neonDemo.directives')
.directive('newsfeed', ['external', '$timeout', 'ConnectionService', 'DatasetService', 'ErrorNotificationService', 'LinksPopupService', 'TranslationService', 'VisualizationService',
function(external, $timeout, connectionService, datasetService, errorNotificationService, linksPopupService, translationService, visualizationService) {
    return {
        templateUrl: 'components/newsFeed/newsFeed.html',
        restrict: 'EA',
        scope: {
            bindTitle: '=',
            bindDatabase: '=',
            bindTable: '=',
            bindDateField: '=',
            bindPrimaryTitleField: '=',
            bindSecondaryTitleField: '=',
            bindContentField: '=',
            bindHeadField: '=', // Deprecated
            bindNameField: '=', // Deprecated
            bindTextField: '=', // Deprecated
            bindFilterField: '=',
            bindFilterValue: '=',
            bindFeedName: '=',
            bindFeedType: '=',
            bindStateId: '='
        },
        link: function($scope, $element) {
            $element.addClass('newsfeed-directive');

            $scope.element = $element;
            $scope.visualizationId = "newsfeed-" + uuid();

            $scope.ASCENDING = neon.query.ASCENDING;
            $scope.DESCENDING = neon.query.DESCENDING;

            var DEFAULT_TYPE = "NEWS";
            $scope.TWITTER = "TWITTER";

            var DEFAULT_LINKY_CONFIG = {
                mentions: false,
                hashtags: false,
                urls: true,
                linkTo: ""
            };

            // The default limit and the number of news items added to the feed whenever the user scrolls to the bottom of the feed.
            var LIMIT_INTERVAL = 50;

            // Prevents translation api calls from getting too long and returning an error
            var TRANSLATION_INTERVAL = 10;

            $scope.feedName = $scope.bindFeedName || "";
            $scope.feedType = $scope.bindFeedType ? $scope.bindFeedType.toUpperCase() : DEFAULT_TYPE;
            $scope.databases = [];
            $scope.tables = [];
            $scope.fields = [];
            $scope.linkyConfig = DEFAULT_LINKY_CONFIG;
            $scope.selectedDate = undefined;
            $scope.errorMessage = undefined;
            $scope.helpers = neon.helpers;

            // Prevent extraneous queries from onFieldChanged during updateFields.
            $scope.loadingData = false;

            // Prevent extraneous queries from updateNewsfeedOnScroll.
            $scope.loadingNews = false;

            // The data in this newsfeed from a news event or an empty array if the data in this newsfeed is from a query.
            $scope.dataFromNewsEvent = [];

            $scope.data = {
                news: [],
                newsCount: 0,
                translatedRange: [-1, -1],
                show: {
                    primaryTitles: [],
                    secondaryTitles: []
                },
                highlights: {
                    primaryTitles: [],
                    secondaryTitles: []
                }
            };

            $scope.translationAvailable = false;
            $scope.translationLanguages = {
                fromLanguageOptions: {},
                toLanguageOptions: {},
                chosenFromLanguage: "",
                chosenToLanguage: ""
            };

            $scope.options = {
                database: {},
                table: {},
                primaryTitleField: {},
                secondaryTitleField: {},
                dateField: {},
                contentField: {},
                filterField: {},
                filterValue: "",
                sortDirection: neon.query.ASCENDING,
                limit: LIMIT_INTERVAL,
                showTranslation: false
            };

            $scope.optionsMenuButtonText = function() {
                if($scope.data.news.length) {
                    if($scope.data.news.length < $scope.data.newsCount) {
                        return $scope.data.news.length + " of " + $scope.data.newsCount + " Items";
                    }
                    return $scope.data.news.length + " Items";
                }
                return "No News";
            };
            $scope.showOptionsMenuButtonText = function() {
                return true;
            };

            /**
             * Initializes the visualization.
             * @method initialize
             * @private
             */
            var initialize = function() {
                $scope.messenger = new neon.eventing.Messenger();
                $scope.messenger.events({
                    filtersChanged: onFiltersChanged
                });
                $scope.messenger.subscribe("news", onNews);
                $scope.messenger.subscribe("news_highlights", onNewsHighlights);
                $scope.messenger.subscribe("date_selected", onDateSelected);
                $scope.messenger.subscribe(datasetService.UPDATE_DATA_CHANNEL, function() {
                    if(!$scope.dataFromNewsEvent.length) {
                        resetAndQueryForData();
                    }
                });

                if(translationService.hasKey()) {
                    $scope.translationAvailable = true;
                    translationService.getSupportedLanguages(getSupportedLanguagesSuccessCallback, function(response) {
                        $scope.errorMessage = errorNotificationService.showErrorMessage($element, response.message,  response.reason);
                    });
                }

                resizeNewsfeed();
                $element.resize(resizeNewsfeed);
                $element.find(".chart-options a").resize(resizeTitle);
                $element.find(".newsfeed").scroll(updateNewsfeedOnScroll);

                visualizationService.register($scope.bindStateId, bindFields);

                $scope.$on('$destroy', function() {
                    linksPopupService.deleteLinks($scope.visualizationId + "-primary");
                    linksPopupService.deleteLinks($scope.visualizationId + "-secondary");
                    $scope.messenger.unsubscribeAll();
                    $element.off("resize", resizeNewsfeed);
                    $element.find(".chart-options a").off("resize", resizeTitle);
                    $element.find(".newsfeed").off("scroll", updateNewsfeedOnScroll);
                    visualizationService.unregister($scope.bindStateId);
                });
            };

            /**
             * Sets the 'to' and 'from' language options for translating.
             * @param {Object} languages A mapping of language codes to their names.
             * @method getSupportedLanguagesSuccessCallback
             * @private
             */
            var getSupportedLanguagesSuccessCallback = function(languages) {
                $scope.translationLanguages.fromLanguageOptions = languages;
                $scope.translationLanguages.toLanguageOptions = languages;
            };

            /**
             * Resizes the newsfeed.
             * @method resizeNewsfeed
             * @private
             */
            var resizeNewsfeed = function() {
                var headerHeight = 0;
                $element.find(".header-container").each(function() {
                    headerHeight += $(this).outerHeight(true);
                });
                $element.find(".newsfeed").height($element.height() - headerHeight);
                resizeTitle();
            };

            /**
             * Resizes the title of the newsfeed.
             * @method resizeTitle
             * @private
             */
            var resizeTitle = function() {
                // Set the width of the title to the width of the visualization minus the width of the chart options button/text and padding.
                var titleWidth = $element.width() - $element.find(".chart-options").outerWidth(true) - 20;
                $element.find(".title").css("maxWidth", titleWidth);
            };

            /**
             * Updates the newsfeed due to a scroll event.
             * @method updateNewsfeedOnScroll
             * @private
             */
            var updateNewsfeedOnScroll = function() {
                if(!$element.find(".item")) {
                    return;
                }

                updateTopNewsItemIndex();

                // If the user has scrolled to the bottom, query for more news items and add them to the feed.
                if(!$scope.loadingNews && $scope.data.news.length < $scope.data.newsCount && $element.find(".item").last().position().top <= $element.height()) {
                    $scope.loadingNews = true;
                    $scope.options.limit = $scope.options.limit + LIMIT_INTERVAL;
                    if($scope.dataFromNewsEvent.length) {
                        updateData($scope.dataFromNewsEvent.slice($scope.options.limit - LIMIT_INTERVAL, $scope.options.limit));
                    } else {
                        $scope.loadingNews = true;
                        queryForData(function(data) {
                            // Only add the items to the feed that aren't there already.
                            updateData(data.slice($scope.options.limit - LIMIT_INTERVAL, $scope.options.limit));
                            runLinky();
                            $scope.loadingNews = false;
                        });
                    }
                }

                if(!$scope.loadingData && $scope.options.showTranslation) {
                    // See if the news item before the first translated news item is visible; if so, translate it.
                    if($scope.data.translatedRange[0] > 0) {
                        var index = $scope.data.translatedRange[0] + 1;
                        var newsItem = $element.find(".item:nth-of-type(" + index + ")");
                        if(newsItem.position().top >= 0) {
                            translate(Math.max(0, $scope.data.translatedRange[0] - TRANSLATION_INTERVAL), $scope.data.translatedRange[0]);
                        }
                    }

                    // See if the news item after the final translated news item is visible; if so, translate it.
                    if($scope.data.translatedRange[1] > 0 && $scope.data.translatedRange[1] < $scope.data.news.length) {
                        var index = $scope.data.translatedRange[1] + 1;
                        var newsItem = $element.find(".item:nth-of-type(" + index + ")");
                        if(newsItem.position().top <= $element.height()) {
                            translate($scope.data.translatedRange[1], Math.min($scope.data.news.length, $scope.data.translatedRange[1] + TRANSLATION_INTERVAL));
                        }
                    }
                }
            };

            /**
             * Updates the top news item index based on the position of the news item at the current top index.
             * @method updateTopNewsItemIndex
             * @private
             */
            var updateTopNewsItemIndex = function() {
                var topNewsItemIndex = $scope.topNewsItemIndex + 1;
                var topNewsItem = $element.find(".item:nth-of-type(" + topNewsItemIndex + ")");
                var topNewsItemPosition = topNewsItem.position();

                if(topNewsItemPosition && topNewsItemPosition.top > 0) {
                    $scope.topNewsItemIndex = Math.max(0, $scope.topNewsItemIndex - 1);
                }
                if(topNewsItemPosition && topNewsItemPosition.top + topNewsItem.outerHeight(true) < 0) {
                    $scope.topNewsItemIndex = Math.min($scope.data.news.length, $scope.topNewsItemIndex + 1);
                }
            };

            /**
             * Runs the linky library on the text of news items in the feed.
             * @method runLinky
             * @private
             */
            var runLinky = function() {
                // Use $timeout to ensure that linky is run after angular's digest updates the items in the feed.
                $timeout(function() {
                    $element.find(".item .content").linky($scope.linkyConfig);
                });
            };

            /**
             * Event handler for filter changed events issued over Neon's messaging channels.
             * @param {Object} message A Neon filter changed message.
             * @method onFiltersChanged
             * @private
             */
            var onFiltersChanged = function(message) {
                if(message.addedFilter && message.addedFilter.databaseName === $scope.options.database.name && message.addedFilter.tableName === $scope.options.table.name && !$scope.dataFromNewsEvent.length) {
                    resetAndQueryForData();
                }
            };

            /**
             * Event handler for news events issued over Neon's messaging channels.
             * @param {Object} message A Neon news message.
             * @method onNews
             * @private
             */
            var onNews = function(message) {
                if(message.news && message.name && message.name === $scope.feedName) {
                    // Show all of the news instead of slicing it to avoid odd behavior during news-highlights events.
                    $scope.data.news = message.news;
                    $scope.data.news.forEach(function(item) {
                        if(item.primaryTitle) {
                            item.primaryTitleTranslated = item.primaryTitle;
                        }
                        if(item.secondaryTitle) {
                            item.secondaryTitleTranslated = item.secondaryTitle;
                        }
                        if(item.content) {
                            item.contentTranslated = item.content;
                        }
                    });
                    $scope.data.newsCount = message.news.length;
                    $scope.feedType = (message.type || $scope.feedType).toUpperCase();
                    $scope.dataFromNewsEvent = message.news;
                    $scope.topNewsItemIndex = 0;
                    runLinky();

                    if(message.news.length) {
                        refreshTranslation();
                    }
                }
            };

            /**
             * Event handler for news highlights events issued over Neon's messaging channels.
             * @param {Object} message A Neon news highlights message.
             * @method onNewsHighlights
             * @private
             */
            var onNewsHighlights = function(message) {
                if(message.name && message.name === $scope.feedName) {
                    if(message.show) {
                        $scope.data.show.primaryTitles = message.show.primaryTitles || [];
                        $scope.data.show.secondaryTitles = message.show.secondaryTitles || [];
                    }
                    if(message.highlights) {
                        $scope.data.highlights.primaryTitles = message.highlights.primaryTitles || [];
                        $scope.data.highlights.secondaryTitles = message.highlights.secondaryTitles || [];
                    }
                }
            };

            /**
             * Event handler for date selected events issued over Neon's messaging channels.
             * @param {Object} message A Neon date selected message.
             * @method onDateSelected
             * @private
             */
            var onDateSelected = function(message) {
                $scope.selectedDate = message.end;
            };

            /**
             * Displays data for any currently active datasets.
             * @method displayActiveDataset
             * @private
             */
            var displayActiveDataset = function() {
                if(!datasetService.hasDataset() || $scope.loadingData) {
                    return;
                }

                $scope.linkyConfig = datasetService.getLinkyConfig() || DEFAULT_LINKY_CONFIG;
                $scope.databases = datasetService.getDatabases();
                $scope.options.database = $scope.databases[0];
                if($scope.bindDatabase) {
                    for(var i = 0; i < $scope.databases.length; ++i) {
                        if($scope.bindDatabase === $scope.databases[i].name) {
                            $scope.options.database = $scope.databases[i];
                            break;
                        }
                    }
                }
                $scope.updateTables();
            };

            /**
             * Updates the list of available tables and the default table to use in this visualization from the tables in the active dataset.
             * @method updateTables
             */
            $scope.updateTables = function() {
                $scope.tables = datasetService.getTables($scope.options.database.name);
                $scope.options.table = $scope.tables[0];
                if($scope.bindTable) {
                    for(var i = 0; i < $scope.tables.length; ++i) {
                        if($scope.bindTable === $scope.tables[i].name) {
                            $scope.options.table = $scope.tables[i];
                            break;
                        }
                    }
                }

                $scope.updateFields();
            };

            /**
             * Updates the list of available fields and the default fields to use in this visualization from the fields in the active dataset.
             * @method updateFields
             */
            $scope.updateFields = function() {
                $scope.loadingData = true;

                $scope.fields = datasetService.getSortedFields($scope.options.database.name, $scope.options.table.name);
                var primaryTitleFieldName = $scope.bindPrimaryTitleField || $scope.bindHeadField || "";
                $scope.options.primaryTitleField = _.find($scope.fields, function(field) {
                    return field.columnName === primaryTitleFieldName;
                }) || datasetService.createBlankField();
                var secondaryTitleFieldName = $scope.bindSecondaryTitleField || $scope.bindNameField || "";
                $scope.options.secondaryTitleField = _.find($scope.fields, function(field) {
                    return field.columnName === secondaryTitleFieldName;
                }) || datasetService.createBlankField();
                var dateFieldName = $scope.bindDateField || datasetService.getMapping($scope.options.database.name, $scope.options.table.name, neonMappings.DATE) || "";
                $scope.options.dateField = _.find($scope.fields, function(field) {
                    return field.columnName === dateFieldName;
                }) || datasetService.createBlankField();
                var contentFieldName = $scope.bindContentField || $scope.bindTextField || "";
                $scope.options.contentField = _.find($scope.fields, function(field) {
                    return field.columnName === contentFieldName;
                }) || datasetService.createBlankField();
                var filterFieldName = $scope.bindFilterField || "";
                $scope.options.filterField = _.find($scope.fields, function(field) {
                    return field.columnName === filterFieldName;
                }) || datasetService.createBlankField();
                $scope.options.filterValue = $scope.bindFilterValue || "";

                $scope.feedName = $scope.bindFeedName || datasetService.getMapping($scope.options.database.name, $scope.options.table.name, neonMappings.NEWSFEED_NAME) || "";
                $scope.feedType = $scope.bindFeedType ? $scope.bindFeedType.toUpperCase() : datasetService.getMapping($scope.options.database.name, $scope.options.table.name, neonMappings.NEWSFEED_TYPE) || DEFAULT_TYPE;

                $scope.dataFromNewsEvent = [];
                resetAndQueryForData();
            };

            /**
             * Clear the data and query for new data to display in this visualization using the Neon Connection.
             * @method resetAndQueryForData
             * @private
             */
            var resetAndQueryForData = function() {
                $scope.data.news = [];
                $scope.topNewsItemIndex = 0;
                linksPopupService.deleteLinks($scope.visualizationId + "-primary");
                linksPopupService.deleteLinks($scope.visualizationId + "-secondary");

                queryForData(function(data, connection) {
                    updateData(data);
                    refreshTranslation();
                    runLinky();
                    $scope.loadingData = false;
                    queryForNewsCount(connection);
                });
            };

            /**
             * Query for data to display in this visualization using the Neon Connection.
             * @param {Function} callback
             * @method resetAndQueryForData
             * @private
             */
            var queryForData = function(callback) {
                if($scope.errorMessage) {
                    errorNotificationService.hideErrorMessage($scope.errorMessage);
                    $scope.errorMessage = undefined;
                }

                $scope.dataFromNewsEvent = false;
                // Save the title during the query so the title doesn't change immediately if the user changes the unshared filter.
                $scope.queryTitle = $scope.generateTitle(true);

                var connection = connectionService.getActiveConnection();

                if(!connection || !datasetService.isFieldValid($scope.options.dateField) || !datasetService.isFieldValid($scope.options.contentField)) {
                    updateData([]);
                    $scope.loadingData = false;
                    return;
                }

                var query = buildQuery();

                connection.executeQuery(query, function(results) {
                    $scope.$apply(function() {
                        callback(results.data, connection);
                    });
                }, function(response) {
                    $scope.$apply(function() {
                        callback([], connection);
                    });
                    if(response.responseJSON) {
                        $scope.errorMessage = errorNotificationService.showErrorMessage($element, response.responseJSON.error, response.responseJSON.stackTrace);
                    }
                });
            };

            /**
             * Builds the query for this visualization.
             * @method buildQuery
             * @return {neon.query.Query}
             * @private
             */
            var buildQuery = function() {
                var fields = [$scope.options.dateField.columnName, $scope.options.contentField.columnName];
                if(datasetService.isFieldValid($scope.options.primaryTitleField)) {
                    fields.push($scope.options.primaryTitleField.columnName);
                }
                if(datasetService.isFieldValid($scope.options.secondaryTitleField)) {
                    fields.push($scope.options.secondaryTitleField.columnName);
                }

                var query = new neon.query.Query().selectFrom($scope.options.database.name, $scope.options.table.name).withFields(fields)
                    .sortBy($scope.options.dateField.columnName, $scope.options.sortDirection)
                    .limit($scope.options.limit);

                if(datasetService.isFieldValid($scope.options.filterField) && $scope.options.filterValue) {
                    var operator = "contains";
                    var value = $scope.options.filterValue;
                    if($.isNumeric(value)) {
                        operator = "=";
                        value = parseFloat(value);
                    }
                    query.where($scope.options.filterField.columnName, operator, value);
                }

                return query;
            };

            /**
             * Updates this visualization to display the given query result data.
             * @param {Array} data The query result data containing {Object} data rows mapping column name to value.
             * @method updateData
             * @private
             */
            var updateData = function(data) {
                var mappings = datasetService.getMappings($scope.options.database.name, $scope.options.table.name);

                data.forEach(function(item) {
                    var primary = datasetService.isFieldValid($scope.options.primaryTitleField) ? $scope.helpers.getNestedValue(item, $scope.options.primaryTitleField.columnName) : "";
                    var secondary = datasetService.isFieldValid($scope.options.secondaryTitleField) ? $scope.helpers.getNestedValue(item, $scope.options.secondaryTitleField.columnName) : "";
                    var hasLinks = createExternalLinksForNewsItemData(mappings, primary, secondary);

                    var content = $scope.helpers.getNestedValue(item, $scope.options.contentField.columnName);
                    if(_.isArray(content)) {
                        content = content.join("\n");
                    }

                    $scope.data.news.push({
                        date: new Date($scope.helpers.getNestedValue(item, $scope.options.dateField.columnName)),
                        primaryTitle: primary,
                        primaryTitleTranslated: primary,
                        secondaryTitle: secondary,
                        secondaryTitleTranslated: secondary,
                        content: content,
                        contentTranslated: content,
                        linksPopupButtonJson: createLinksPopupButtonJson(primary, secondary),
                        linksPopupButtonIsDisabled: !hasLinks
                    });
                });
            };

            /**
             * Creates the external links for the given news primary and secondary title properties using the given mappings and returns if any links were created.
             * @param {Array} mappings
             * @param {String} primary
             * @param {String} secondary
             * @method createExternalLinksForNewsItemData
             * @private
             * @return {Boolean}
             */
            var createExternalLinksForNewsItemData = function(mappings, primary, secondary) {
                var primaryLinksCount = primary ? createExternalLinks(mappings, $scope.options.primaryTitleField, primary, $scope.visualizationId + "-primary") : 0;
                var secondaryLinksCount = secondary ? createExternalLinks(mappings, $scope.options.secondaryTitleField, secondary, $scope.visualizationId + "-secondary") : 0;
                return primaryLinksCount || secondaryLinksCount;
            };

            /**
             * Creates the external links for the given field and value using the given mappings, saves the links in the links popup using the given source, and
             * returns the number of links that were created.
             * @param {Array} mappings
             * @param {Object} fieldObject
             * @param {Number} or {String} value
             * @param {String} source
             * @method createExternalLinks
             * @private
             * @return {Number}
             */
            var createExternalLinks = function(mappings, fieldObject, value, source) {
                var links = linksPopupService.createAllServiceLinkObjects(external.services, mappings, fieldObject.columnName, value);

                if(links.length) {
                    linksPopupService.addLinks(source, linksPopupService.generateKey(fieldObject, value), links);
                }

                return links.length;
            };

            /**
             * Creates and returns the JSON string for the links popup button using the given news primary and secondary title properties.
             * @param {String} primary
             * @param {String} secondary
             * @method createLinksPopupButtonJson
             * @private
             * @return {String}
             */
            var createLinksPopupButtonJson = function(primary, secondary) {
                var list = [];
                if(primary) {
                    list.push({
                        source: $scope.visualizationId + "-primary",
                        key: linksPopupService.generateKey($scope.options.primaryTitleField, primary)
                    });
                }
                if(secondary) {
                    list.push({
                        source: $scope.visualizationId + "-secondary",
                        key: linksPopupService.generateKey($scope.options.secondaryTitleField, secondary)
                    });
                }
                return linksPopupService.createButtonJsonFromList(list);
            };

            /**
             * Updates the 'from' language on translation and translates if 'Show Translation' is checked
             * @param {String} language The 'from' translation language to change to
             * @method onFromLanguageChange
             */
            $scope.onFromLanguageChange = function(language) {
                $scope.translationLanguages.chosenFromLanguage = language;
                refreshTranslation();
            };

            /**
             * Updates the 'to' language on translation and translates if 'Show Translation' is checked
             * @param {String} language The 'to' translation language to change to
             * @method onToLanguageChange
             */
            $scope.onToLanguageChange = function(language) {
                $scope.translationLanguages.chosenToLanguage = language;
                refreshTranslation();
            };

            /**
             * Translates all text back to its original form if checked is false, or to the specified 'to' language
             * if checked is true.
             * @param {Boolean} checked Whether 'Show Translation' is checked or unchecked
             * @param {String} fromLang The 'from' language to use for translation
             * @param {String} toLang The 'to' language to use for translation
             * @method updateTranslation
             */
            $scope.updateTranslation = function(checked, fromLang, toLang) {
                $scope.options.showTranslation = checked;
                $scope.translationLanguages.chosenFromLanguage = fromLang;
                $scope.translationLanguages.chosenToLanguage = toLang;
                refreshTranslation();
            };

            /**
             * Refreshes the translations if translation is on.
             * @method refreshTranslation
             * @private
             */
            var refreshTranslation = function() {
                $scope.data.translatedRange = [-1, -1];
                if($scope.options.showTranslation) {
                    translate($scope.topNewsItemIndex, $scope.topNewsItemIndex + TRANSLATION_INTERVAL);
                }
            };

            /**
             * Translates text within the translation limit with the from/to languages specified.
             * @param {Integer} [sliceStart] Optional field to specify at what index to start translating text at.
             * @param {Integer} [sliceEnd] Optional field to specify at what index to end translating text at (exclusive).
             * @method translate
             * @private
             */
            var translate = function(sliceStart, sliceEnd) {
                $scope.loadingData = true;

                if($scope.errorMessage) {
                    errorNotificationService.hideErrorMessage($scope.errorMessage);
                    $scope.errorMessage = undefined;
                }

                sliceStart = sliceStart || 0;
                sliceEnd = sliceEnd || sliceStart + TRANSLATION_INTERVAL;

                translateNewsProperty("primaryTitle", sliceStart, sliceEnd, function() {
                    translateNewsProperty("secondaryTitle", sliceStart, sliceEnd, function() {
                        translateNewsProperty("content", sliceStart, sliceEnd, function() {
                            translationService.saveTranslationCache();
                            runLinky();
                            $scope.data.translatedRange[0] = $scope.data.translatedRange[0] < 0 ? sliceStart : Math.min($scope.data.translatedRange[0], sliceStart);
                            $scope.data.translatedRange[1] = $scope.data.translatedRange[1] < 0 ? sliceEnd : Math.max($scope.data.translatedRange[1], sliceEnd);
                            $scope.loadingData = false;
                        });
                    });
                });
            };

            /**
             * Translates the given property in the news data between the given start and end indices.
             * @param {String} newsProperty
             * @param {Integer} sliceStart
             * @param {Integer} sliceEnd
             * @param {Function} successCallback
             * @method translateNewsProperty
             * @private
             */
            var translateNewsProperty = function(newsProperty, sliceStart, sliceEnd, successCallback) {
                var dataText = _.pluck($scope.data.news, newsProperty).map(function(data) {
                    return $.isNumeric(data) ? "" : data;
                });

                var translationSuccessCallback = function(response) {
                    var index = sliceStart;
                    response.data.data.translations.forEach(function(item) {
                        while(!$scope.data.news[index][newsProperty] && index < sliceEnd) {
                            index++;
                        }
                        if(index < sliceEnd) {
                            var newsItem = $scope.data.news[index];
                            newsItem[newsProperty + "Translated"] = item.translatedText;
                            newsItem.isTranslated = newsItem.isTranslated || newsItem[newsProperty] !== newsItem[newsProperty + "Translated"];
                            index++;
                        }
                    });
                    successCallback();
                };

                var translationFailureCallback = function(response) {
                    for(var i = sliceStart; i < sliceEnd; ++i) {
                        $scope.data.news[i][newsProperty + "Translated"] = $scope.data.news[i][newsProperty];
                        $scope.data.news[i].isTranslated = false;
                    }
                    $scope.errorMessage = errorNotificationService.showErrorMessage($element, response.message,  response.reason);
                    $scope.loadingData = false;
                };

                translationService.translate(dataText.slice(sliceStart, sliceEnd), $scope.translationLanguages.chosenToLanguage,
                    translationSuccessCallback, translationFailureCallback, $scope.translationLanguages.chosenFromLanguage);
            };

            /**
             * Query for the (non-limited) count of news data to display in this visualization using the given Neon Connection.
             * @param {Object} connection
             * @method queryForNewsCount
             * @private
             */
            var queryForNewsCount = function(connection) {
                var query = new neon.query.Query().selectFrom($scope.options.database.name, $scope.options.table.name).aggregate(neon.query.COUNT, "*", "count");
                if(datasetService.isFieldValid($scope.options.filterField) && $scope.options.filterValue) {
                    var operator = $.isNumeric($scope.options.filterValue) ? "=" : "contains";
                    query.where(neon.query.where($scope.options.filterField.columnName, operator, $scope.options.filterValue));
                }

                connection.executeQuery(query, function(results) {
                    $scope.$apply(function() {
                        $scope.data.newsCount = results.data[0].count;
                    });
                }, function(response) {
                    $scope.$apply(function() {
                        $scope.data.newsCount = 0;
                    });
                    if(response.responseJSON) {
                        $scope.errorMessage = errorNotificationService.showErrorMessage($element, response.responseJSON.error, response.responseJSON.stackTrace);
                    }
                });
            };

            /**
             * Triggered by changing a field in the options menu.
             * @method handleChangeField
             */
            $scope.handleChangeField = function() {
                // TODO Logging
                if(!$scope.loadingData) {
                    $scope.dataFromNewsEvent = [];
                    resetAndQueryForData();
                }
            };

            /**
             * Triggered by clicking one of the sort-by-date buttons.
             * @param {Number} direction Either $scope.ASCENDING or $scope.DESCENDING
             * @method handleChangeSort
             */
            $scope.handleChangeSort = function(direction) {
                // TODO Logging
                if($scope.options.sortDirection === direction) {
                    if($scope.dataFromNewsEvent.length) {
                        $scope.data.news.reverse();
                        $scope.data.translatedRange = [$scope.data.news.length - $scope.data.translatedRange[1], $scope.data.news.length - $scope.data.translatedRange[0]];
                    } else {
                        resetAndQueryForData();
                    }
                }
            };

            /**
             * Triggered by changing the unshared filter field in the options menu.
             * @method handleChangeUnsharedFilterField
             */
            $scope.handleChangeUnsharedFilterField = function() {
                // TODO Logging
                $scope.options.filterValue = "";
                if(!$scope.loadingData && $scope.options.filterValue) {
                    resetAndQueryForData();
                }
            };

            /**
             * Triggered by changing the unshared filter value in the options menu.
             * @method handleChangeUnsharedFilterValue
             */
            $scope.handleChangeUnsharedFilterValue = function() {
                // TODO Logging
                if(!$scope.loadingData) {
                    resetAndQueryForData();
                }
            };

            /**
             * Triggered by removing the unshared filter in the options menu.
             * @method handleRemoveUnsharedFilter
             */
            $scope.handleRemoveUnsharedFilter = function() {
                // TODO Logging
                $scope.options.filterValue = "";
                if(!$scope.loadingData) {
                    resetAndQueryForData();
                }
            };

            /**
             * Returns the style class for the given news item.
             * @param {Object} item
             * @method getNewsItemStyleClass
             * @return {String}
             */
            $scope.getNewsItemStyleClass = function(item) {
                var style = [];
                if($scope.selectedDate && item.date.getTime() > $scope.selectedDate.getTime()) {
                    style.push("future");
                }
                if($scope.data.highlights.primaryTitles.length || $scope.data.highlights.secondaryTitles.length) {
                    if($scope.data.highlights.primaryTitles.indexOf(item.primaryTitle) >= 0 || $scope.data.highlights.secondaryTitles.indexOf(item.secondaryTitle) >= 0) {
                        style.push("highlight");
                    }
                }
                if($scope.data.show.primaryTitles.length || $scope.data.show.secondaryTitles.length) {
                    if($scope.data.show.primaryTitles.indexOf(item.primaryTitle) < 0 && $scope.data.show.secondaryTitles.indexOf(item.secondaryTitle) < 0) {
                        style.push("hidden");
                    }
                }
                return style.join(" ");
            };

            /**
             * Generates and returns the title for this visualization.
             * @param {Boolean} resetQueryTitle
             * @method generateTitle
             * @return {String}
             */
            $scope.generateTitle = function(resetQueryTitle) {
                if(resetQueryTitle) {
                    $scope.queryTitle = "";
                }
                if($scope.queryTitle) {
                    return $scope.queryTitle;
                }
                var title = $scope.options.filterValue ? $scope.options.filterValue + " " : "";
                if($scope.bindTitle) {
                    return title + $scope.bindTitle;
                }
                return title + $scope.options.table.prettyName;
            };

            /**
             * Creates and returns an object that contains all the binding fields needed to recreate the visualization's state.
             * @return {Object}
             * @method bindFields
             * @private
             */
            var bindFields = function() {
                var bindingFields = {};

                bindingFields["bind-title"] = $scope.bindTitle ? "'" + $scope.bindTitle + "'" : undefined;
                bindingFields["bind-primary-title-field"] = ($scope.options.primaryTitleField && $scope.options.primaryTitleField.columnName) ? "'" + $scope.options.primaryTitleField.columnName + "'" : undefined;
                bindingFields["bind-secondary-title-field"] = ($scope.options.secondaryTitleField && $scope.options.secondaryTitleField.columnName) ? "'" + $scope.options.secondaryTitleField.columnName + "'" : undefined;
                bindingFields["bind-date-field"] = ($scope.options.dateField && $scope.options.dateField.columnName) ? "'" + $scope.options.dateField.columnName + "'" : undefined;
                bindingFields["bind-content-field"] = ($scope.options.contentField && $scope.options.contentField.columnName) ? "'" + $scope.options.contentField.columnName + "'" : undefined;
                bindingFields["bind-filter-field"] = ($scope.options.filterField && $scope.options.filterField.columnName) ? "'" + $scope.options.filterField.columnName + "'" : undefined;
                var hasFilterValue = $scope.options.filterField && $scope.options.filterField.columnName && $scope.options.filterValue;
                bindingFields["bind-filter-value"] = hasFilterValue ? "'" + $scope.options.filterValue + "'" : undefined;
                bindingFields["bind-feed-name"] = $scope.feedName ? "'" + $scope.feedName + "'" : undefined;
                bindingFields["bind-feed-type"] = $scope.feedType ? "'" + $scope.feedType + "'" : undefined;
                bindingFields["bind-table"] = ($scope.options.table && $scope.options.table.name) ? "'" + $scope.options.table.name + "'" : undefined;
                bindingFields["bind-database"] = ($scope.options.database && $scope.options.database.name) ? "'" + $scope.options.database.name + "'" : undefined;

                return bindingFields;
            };

            neon.ready(function() {
                initialize();
                displayActiveDataset();
            });
        }
    };
}]);