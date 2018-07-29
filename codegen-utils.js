/*
 * Copyright (c) 2018 CubicA. All rights reserved.
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

/**
* CodeWriter
*/
class CodeWriter {
    /**
     * CodeWriter
     * @constructor
     */
    constructor (indentString) {

        /** @member {Array.<string>} lines */
        this.lines = [];

        /** @member {string} indentString */
        this.indentString = (indentString ? indentString : "    "); // default 4 spaces

        /** @member {Array.<string>} indentations */
        this.indentations = [];
    }

    /**
     * Indent
     */
    indent () {
        this.indentations.push(this.indentString);
    };

    /**
     * Outdent
     */
    outdent () {
        this.indentations.splice(this.indentations.length-1, 1);
    };

    /**
     * Write a line
     * @param {string} line
     */
    writeLine (line) {
        if (line) {
            this.lines.push(this.indentations.join("") + line);
        } else {
            this.lines.push("");
        }
    };

  	/**
  	 * Appends the str to the previous line
  	 * @param {string} str
  	 */
  	write (str) {
  		if (str) {
  			var top = '';
  			if (this.lines.length > 0) {
  				top = this.lines.pop();
  			} else {
  				top = this.indentations.join("");
  			}
  			top += str;
  			this.lines.push(top);
  		}
  	}

    /**
     * Return as all string data
     * @return {string}
     */
    getData () {
          return this.lines.join("\n");
    };

  	hasContent () {
  		return this.lines.length > 0;
  	}
}

function tag (name, elem) {
	if (!elem || typeof(elem.tags) === 'undefined') {
		return null;
	}
	var len = elem.tags.length;
	var normalized_tag_name = name.toLowerCase();
	for (var i = 0; i < len; i++) {
		var tag = elem.tags[i];
		var tagName = tag.name;
		if (typeof tagName == 'undefined') {
			tagName = '';
		} else {
			tagName = tagName.toLowerCase();
		}
		if (normalized_tag_name == tagName) {
			return tag;
		}
	}
	return null;
}

function tagByValue(value, elem) {
	var len = elem.tags.length;
	for (var i = 0; i < len; i++) {
		var tag = elem.tags[i];
		if (value == tag.value) {
			return tag;
		}
	}
	return null;
}

function tagsByValue(value, elem) {
	var tags = [];
	var len = elem.tags.length;
	for (var i = 0; i < len; i++) {
		var tag = elem.tags[i];
		if (value == tag.value) {
			tags.push(tag);
		}
	}
	return tags;
}

function stringTag(name, elem) {
	var t = tag(name, elem);
	if (t && t.kind === type.Tag.TK_STRING) {
		return t.value;
	} else {
		return '';
	}
}

function addStringTag(name, elem, value) {
	var options = {
    id: "Tag",
    parent: elem,
    field: "tags",
		modelInitializer: function (tag) {
			tag.name = name;
			tag.kind = type.Tag.TK_STRING;
			tag.value = value;
		}
	}
  app.factory.createModel(options);
}

function isValidIdentifier(name) {
	if (!name)
		return false;
	if (name.length > 63)
		return false;
	var validName = /^[A-Z_][0-9A-Z_$]*$/i;
	var reserved = {
		'by':true,
		'commit': true,
		'insert':true,
		'group':true,
		'order':true,
		'table':true,
		'having':true,
		'update':true,
		'delete':true,
		'into':true,
		'set':true,
		'values':true,
		'union':true,
		'select':true,
		'from':true,
		'where':true,
		'zone':true
	};
	return validName.test(name) && !reserved[name.toLowerCase()];
}

function replaceAll(str, search, replacement) {
	return str.split(search).join(replacement);
};

function asComment(comment) {
	if (!comment)
		return null;
	var escapeCode = "";
	if (comment.indexOf('\\') > -1) {
		escapeCode = 'E';
		comment = replaceAll(comment, "\\", "\\\\\\\\");
	}
	comment = replaceAll(comment, "'", "''");
	return escapeCode + "'" + comment + "'";
}

function enumAsList(enumStr) {
	var list = enumStr.split(",");
	var enumDecl = "";
	var len = list.length;
	for (var i = 0; i < len; i++) {
		if (i > 0) {
			enumDecl += ", ";
		}
		enumDecl += "'" + list[i].trim() + "'";
	}

	return enumDecl;
}

exports.CodeWriter = CodeWriter;
exports.tag = tag;
exports.stringTag = stringTag;
exports.tagByValue = tagByValue;
exports.tagsByValue = tagsByValue;
exports.addStringTag = addStringTag;
exports.asComment = asComment;
exports.isValidIdentifier = isValidIdentifier;
exports.replaceAll = replaceAll;
exports.enumAsList = enumAsList;
