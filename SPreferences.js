/*
 * Copyright (c) 2016 Smart Surfer. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains the
 * property of Adrian Andrei. 
 *
 */

define(function (require, exports, module) {
    "use strict";

    var AppInit           = app.getModule("utils/AppInit"),
        Core              = app.getModule("core/Core"),
        PreferenceManager = app.getModule("core/PreferenceManager");

    var preferenceId = "psql";

    var ddlPreferences = {
        "psql.gen": {
            text: "Postgresql DDL Generation",
            type: "Section"
        },
        "psql.gen.owner": {
            text: "Owner name",
            description: "Postgresql objects owner name",
            type: "String",
            default: "postgres"
        },
		"psql.gen.tablespace": {
            text: "Storage tablespace name",
            description: "Tablespace name where all data will be stored",
            type: "String",
            default: "pg_default"
        },
		"psql.gen.encoding": {
            text: "Storage character set",
            description: "Character set encoding",
            type: "Dropdown",
			options: [
				{ value: "BIG5", text: "Big Five - Traditional Chinese" },
				{ value: "EUC_KR", text: "Extended UNIX Code-KR - Korean" },
				{ value: "EUC_KR", text: "Extended UNIX Code-KR - Korean" },
                { value: "EUC_TW", text: "Extended UNIX Code-TW - Traditional Chinese, Taiwanese" },
				{ value: "LATIN10", text: "ISO 8859-16, ASRO SR 14111 - Romanian" },
				{ value: "UTF8", text: "Unicode, 8-bit" }
            ],
            default: "UTF8"
        },
		"psql.gen.collation": {
            text: "Database collation",
            description: "Database collation",
            type: "Dropdown",
			options: [
				{ value: "default", text: "default" },
                { value: "en_AU.utf8", text: "en_AU.utf8" },
                { value: "en_US.utf8", text: "en_US.utf8" },
				{ value: "en_CA.utf8", text: "en_CA.utf8" },
				{ value: "en_GB.utf8", text: "en_GB.utf8" },
				{ value: "en_HK.utf8", text: "en_HK.utf8"},
                { value: "POSIX", text: "POSIX" }
            ],
            default: "default"
        },
        "psql.gen.foreignKeyConstraint": {
            text: "Generate Foregin Key Constraints",
            description: "Generate Foreign Key constraint when reference field is populated.",
            type: "Check",
            default: false
        },
        "psql.gen.useTab": {
            text: "Use Tab",
            description: "Use Tab for indentation instead of spaces.",
            type: "Check",
            default: false
        },
        "psql.gen.indentSpaces": {
            text: "Indent Spaces",
            description: "Number of spaces for indentation.",
            type: "Number",
            default: 4
        }
    };

    function getId() {
        return preferenceId;
    }

    function getGenOptions() {
        return {
            owner            : PreferenceManager.get("psql.gen.owner"),
            tablespace       : PreferenceManager.get("psql.gen.tablespace"),
			encoding         : PreferenceManager.get("psql.gen.encoding"),
			dbCollation      : PreferenceManager.get("psql.gen.collation"),
            foreignKey       : PreferenceManager.get("psql.gen.foreignKeyConstraint"),
            useTab           : PreferenceManager.get("psql.gen.useTab"),
            indentSpaces     : PreferenceManager.get("psql.gen.indentSpaces")
        };
    }

    AppInit.htmlReady(function () {
        PreferenceManager.register(preferenceId, "Postgresql DDL", ddlPreferences);
    });

    exports.getId         = getId;
    exports.getGenOptions = getGenOptions;

});
