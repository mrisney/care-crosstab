$(function () {

    const AGENCY = "wy"
    const REST_SVC_BASE_URL = "http://dev.itis-app.com/care-rest";

    // datasources lookup
    var dataSourcesDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        load: function () {
            return $.getJSON(REST_SVC_BASE_URL +'/api/v1/' + AGENCY + '/datasources');
        }
    });

    // filters lookup
    var filtersDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/filters?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    // variables lookup
    var variablesDS = new DevExpress.data.CustomStore({
        key: "value",
        loadMode: "raw",
        cacheRawData: true,
        byKey: function (key) {
            var d = new $.Deferred();
            $.get(REST_SVC_BASE_URL + '/api/v1/' + AGENCY + '/variables?datasource=' + key)
                .done(function (dataItem) {
                    d.resolve(dataItem);
                });
            return d.promise();
        }
    });

    // crosstab data store
    var crossTabDS = new DevExpress.data.CustomStore({
        load: function (values) {
            return $.post(REST_SVC_BASE_URL + '/api/v1/' + AGENCY +'/crosstab-analysis', values);
        }
    });

    var crossTabRequest = {
        dataSource: null,
        filter: null,
        variable1: null,
        variable2: null,
        suppressNulls: true,
        noZeros: true
    };
    var crossTabResponse = {
        columns: [{}],
        rows: [{}]
    };


    function getCrossTabData() {
        console.log("CrossTab request =  " + JSON.stringify(crossTabRequest));
        $.ajax({
            url: REST_SVC_BASE_URL + '/api/v1/' + AGENCY +'/crosstab-analysis',
            type: "POST",
            data: JSON.stringify(crossTabRequest),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (data) {
                crossTabResponse.columns = data.columns;
                crossTabResponse.rows = data.rows;
                console.log("CrossTab response =  " + JSON.stringify(crossTabResponse));

                $('#crosstab-pivotgrid').dxPivotGrid('instance').option('dataSource', {
                    fields: [{
                        caption: crossTabRequest.variable1.split(':')[1],
                        width: 120,
                        dataField: crossTabRequest.variable1,
                        area: "row",
                        sortingMethod: function(a, b) {
                            return b.id - a.id;
                        }
                    },
                    {
                        caption: crossTabRequest.variable2.split(':')[1],
                        dataField: crossTabRequest.variable2,
                        area: "column",
                        sortingMethod: function(a, b) {
                            return b.id - a.id;
                        }
                    },
                    {
                        caption: "Values",
                        dataField: "value",
                        area: "data",
                        dataType: "number",
                        summaryType: "sum"
                    }],
                    store: crossTabResponse.rows
                });


                $('#crosstab-pivotgrid').dxPivotGrid('instance').getDataSource().reload();
                console.log("pivot grid reloaded");
            }
        });
    }
    function refreshForm(datasourceSelected) {
        const filterEditor = $("#crosstab-form-container").dxForm("instance").getEditor("filter");

        filtersDS.byKey(datasourceSelected).done(function (values) {
            var filters = [];
            values.forEach((element) => {
                filters.push({ value: element.value });
            });
            filterEditor.option("dataSource", filters);
            console.log("number of items : " + filters.length);
        });

        var firstVariableEditor = $("#crosstab-form-container").dxForm("instance").getEditor("variable1");
        var secondVariableEditor = $("#crosstab-form-container").dxForm("instance").getEditor("variable2");
        variablesDS.byKey(datasourceSelected).done(function (values) {
            var variables = [];
            values.forEach((element) => {
                variables.push({ value: element.value });
            });
            firstVariableEditor.option("dataSource", variables);
            secondVariableEditor.option("dataSource", variables);
            console.log("number of items : " + variables.length);
        });
    }

    var form = $("#crosstab-form-container").dxForm({
        formData: {
            datasource: null,
            filter: "",
            variable1: "",
            variable2: "",
            noZeros: false
        },
        colCount: 2,
        labelLocation: "top",
        items: [{
            dataField: "datasource",
            editorType: "dxSelectBox",
            editorOptions: {
                dataSource: dataSourcesDS,
                valueExpr: "value",
                displayExpr: "value",
                searchEnabled: false,
                value: "",
                onValueChanged: function (data) {
                    crossTabRequest.dataSource = data.value;
                    refreshForm(data.value);
                }
            },
            validationRules: [{
                type: "required",
                message: "Datasource  is required"
            }]
        }, {
            dataField: "filter",
            editorType: "dxSelectBox",
            editorOptions: {
                displayExpr: "value",
                valueExpr: "value",
                template: function (data, itemElement) {
                    $("<div class='button-indicator'></div><span class='dx-button-text'>" + data.text + "</span>").appendTo(container);
                    buttonIndicator = itemElement.find(".button-indicator").dxLoadIndicator({
                        visible: false
                    }).dxLoadIndicator("instance");
                },
                onValueChanged: function (data) {
                    crossTabRequest.filter = data.value;
                    getCrossTabData();
                }
            },
            validationRules: [{
                type: "required",
                message: "Filter is required"
            }]
        },
        {
            dataField: "variable1",
            editorType: "dxSelectBox",
            editorOptions: {
                displayExpr: "value",
                valueExpr: "value",
                onValueChanged: function (data) {
                    crossTabRequest.variable1 = data.value;
                    getCrossTabData();
                }
            }
        },
        {
            dataField: "variable2",
            editorType: "dxSelectBox",
            editorOptions: {
                displayExpr: "value",
                valueExpr: "value",
                onValueChanged: function (data) {
                    crossTabRequest.variable2 = data.value;
                    getCrossTabData();
                }
            }
        },
        {
            dataField: "noZeros",
            editorOptions: {
                onValueChanged: function (data) {
                    crossTabRequest.noZeros = data.value;
                    getCrossTabData();
                }
            }
        }
        ]
    });

    var pivotGridChart = $("#crosstab-pivotgrid-chart").dxChart({
        commonSeriesSettings: {
            type: 'bar'
        },
        tooltip: {
            enabled: true,
            format: "number",
            customizeTooltip: function (args) {
                return {
                    html: args.seriesName + " | Total<div>" + args.valueText + "</div>"
                };
            }
        },
        size: {
            height: 200
        },
        adaptiveLayout: {
            width: 450
        }
    }).dxChart("instance");

    var pivotGrid = $("#crosstab-pivotgrid").dxPivotGrid({
        allowSortingBySummary: true,
        allowFiltering: true,
        showBorders: true,
        showColumnGrandTotals: true,
        showRowGrandTotals: true,
        showRowTotals: false,
        showColumnTotals: true,
        export: {  
            enabled: true,  
            fileName: "CrossTab"
        },
        fieldChooser: {
            enabled: true,
            height: 400
        },
        dataSource: {
            fields: [{
                caption: "C001: County",
                width: 120,
                dataField: "C001: County",
                area: "row",
                sortingMethod: function(a, b) {
                    return b.id - a.id;
                },
                sortBySummaryField: "TOTAL"
            },
            {
                caption: "Day of the Week",
                dataField: "C008: Day of the Week",
                area: "column",
                sortingMethod: function(a, b) {
                    return b.id - a.id;
                }
            },
            {
                caption: "Values",
                dataField: "value",
                area: "data",
                dataType: "number",
                summaryType: "sum"
            }
            ],
            store: initData
        }
    }).dxPivotGrid("instance");

    pivotGrid.bindChart(pivotGridChart, {
        dataFieldsDisplayMode: "splitPanes",
        alternateDataFields: false
    });
    function expand() {
        var dataSource = initData;
        //dataSource.expandHeaderItem("row", ["North America"]);
        //dataSource.expandHeaderItem("column", [Sunday]);
    }
    setTimeout(expand, 0);
});