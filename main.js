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

const ddlGenerator = require('./generator')

function getGenOptions () {
  return {
    owner: app.preferences.get('psqlddl.gen.owner'),
    tablespace: app.preferences.get('psqlddl.gen.tablespace'),
    encoding: app.preferences.get('psqlddl.gen.encoding'),
    collation: app.preferences.get('psqlddl.gen.collation'),
    foreignKeyConstraint: app.preferences.get('psqlddl.gen.foreignKeyConstraint'),
    useTab: app.preferences.get('psqlddl.gen.useTab'),
    indentSpaces: app.preferences.get('psqlddl.gen.indentSpaces')
  }
}


/**
 * Command Handler for DDL Generation
 *
 * @param {Element} base
 * @param {string} path
 * @param {Object} options
 * @return {$.Promise}
 */
function _handleGenerate(base, path, options) {
  // If options is not passed, get from preference
  options = options || getGenOptions()
  // If base is not assigned, popup ElementPicker
  if (!base) {
    app.elementPickerDialog.showDialog('Select a project to generate DDL for', null, type.Project).then(function ({buttonId, returnValue}) {
      if (buttonId === 'ok') {
        base = returnValue
        // If path is not assigned, popup Save Dialog to save a file
        if (!path) {
          var files = app.dialogs.showOpenDialog('Pick the folder where the Postgresql DDL will be generated', null, null, {properties: ['openDirectory']})
          if (files && files.length > 0) {
            path = files[0]
            ddlGenerator.generate(base, path, options)
          }
        } else {
          ddlGenerator.generate(base, path, options)
        }
      }
    })
  } else {
    // If path is not assigned, popup Save Dialog to save a file
    if (!path) {
      var files = app.dialogs.showOpenDialog('Pick the folder where the Postgresql DDL will be generated', null, null, {properties: ['openDirectory']})
      if (files && files.length > 0) {
        path = files[0]
        ddlGenerator.generate(base, path, options)
      }
    } else {
      ddlGenerator.generate(base, path, options)
    }
  }
}

/**
* Popup PreferenceDialog with DDL Preference Schema
*/
function _handleConfigure () {
  app.commands.execute('application:preferences', 'psqlddl')
}

function init () {
  app.commands.register('psqlddl:generate', _handleGenerate)
  app.commands.register('psqlddl:configure', _handleConfigure)
}

exports.init = init
