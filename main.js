/*
 * Copyright (c) 2014 MKLab. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*global define, $, _, window, app, type, appshell, document */

define(function (require, exports, module) {
    'use strict';

    var AppInit             = app.getModule('utils/AppInit'),
        Repository          = app.getModule('core/Repository'),
        Engine              = app.getModule('engine/Engine'),
        Commands            = app.getModule('command/Commands'),
        CommandManager      = app.getModule('command/CommandManager'),
        MenuManager         = app.getModule('menu/MenuManager'),
        Dialogs             = app.getModule('dialogs/Dialogs'),
        ElementPickerDialog = app.getModule('dialogs/ElementPickerDialog'),
        FileSystem          = app.getModule('filesystem/FileSystem'),
        FileSystemError     = app.getModule('filesystem/FileSystemError'),
        ExtensionUtils      = app.getModule('utils/ExtensionUtils'),
        Toast 				= app.getModule('ui/Toast');

    var CodeGenUtils   = require('SUtils'),
        DDLPreferences = require('SPreferences'),
        DDLGenerator   = require('SGenerator');

    /**
     * Commands IDs
     */
    var CMD_PSQL           = 'psql',
        CMD_PSQL_GENERATE  = 'psql.generate',
        CMD_PSQL_CONFIGURE = 'psql.configure';

    /**
     * Command Handler for DDL Generation
     *
     * @param {Element} base
     * @param {string} path
     * @param {Object} options
     * @return {$.Promise}
     */
    function _handleGenerate(base, path, options) {
        var result = new $.Deferred();

        // If options is not passed, get from preference
        options = options || DDLPreferences.getGenOptions();
        
        var ProjectManager = app.getModule('engine/ProjectManager');
        var project = ProjectManager.getProject();
		
        // if repository is present pick a folder where DDL code will be saved
        if (!!project) {
			// pick a folder where the code is generated
            FileSystem.showOpenDialog(false, true, 'Pick the folder where the Postgresql DDL will be generated', 
				null, null, function (err, selectedPath) {
					if (!err && selectedPath.length > 0) {
						    DDLGenerator.generate(project, selectedPath, options).then(result.resolve, result.reject);
					} else {
						    Toast.warning('DDL generation is cancelled');
                            result.reject(FileSystem.USER_CANCELED);
					}
				});
        } else {
            // no project present
            Toast.error('No project found');
            return result.reject('No project found');
        }
        return result.promise();
    }

    /**
     * Popup PreferenceDialog with DDL Preference Schema
     */
    function _handleConfigure() {
        CommandManager.execute(Commands.FILE_PREFERENCES, DDLPreferences.getId());
    }

    // Register Commands
    CommandManager.register('Postgresql Code Generation',   CMD_PSQL,           CommandManager.doNothing);
    CommandManager.register('Generate DDL...', 				CMD_PSQL_GENERATE,  _handleGenerate);
    CommandManager.register('Configure...',    				CMD_PSQL_CONFIGURE, _handleConfigure);

    var menu = MenuManager.getMenu(Commands.TOOLS);
    var menuItem = menu.addMenuItem(CMD_PSQL);
    menuItem.addMenuItem(CMD_PSQL_GENERATE);
    menuItem.addMenuDivider();
    menuItem.addMenuItem(CMD_PSQL_CONFIGURE);

});
