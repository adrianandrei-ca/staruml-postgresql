/*
 * Copyright (c) 2016 Smart Surfer. All rights reserved.
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


define(function (require, exports, module) {
    "use strict";

    var Repository = app.getModule("core/Repository"),
        ProjectManager = app.getModule("engine/ProjectManager"),
        Engine = app.getModule("engine/Engine"),
        FileSystem = app.getModule("filesystem/FileSystem"),
        FileUtils = app.getModule("file/FileUtils"),
		Dialogs = app.getModule("dialogs/Dialogs"),
        Async = app.getModule("utils/Async"),
        ERD = app.getModule("erd/ERD"),
		Toast = app.getModule('ui/Toast');

    var CodeGenUtils = require("SUtils");

    /**
     * DDL Generator
     * @constructor
     *
     * @param {type.Repository} baseModel
     * @param {string} basePath generated files and directories to be placed
     */
    function DDLGenerator(baseModel, basePath) {
        /** @member {type.Model} */
        this.baseModel = baseModel;

        /** @member {string} */
        this.basePath = basePath;
    }

    /**
     * Return Indent String based on options
     * @param {Object} options
     * @return {string}
     */
    DDLGenerator.prototype.getIndentString = function (options) {
        if (options.useTab) {
            return "\t";
        } else {
            var i, len, indent = [];
            for (i = 0, len = options.indentSpaces; i < len; i++) {
                indent.push(" ");
            }
            return indent.join("");
        }
    };

    /**
     * Return Foreign Keys for an Entity
     * @param {type.ERDEntity} elem
     * @return {Array.<ERDColumn>}
     */
    DDLGenerator.prototype.getIndexColumns = function (elem) {
        var keys = [];
        elem.columns.forEach(function (col) {
			var idxTag = CodeGenUtils.tagByValue('index', col);
            if (idxTag) {
                keys.push(col);
            }
        });
        return keys;
    };

    DDLGenerator.prototype.dataType = function (elem, options) {
		var varLenFunc = function (elem, options) {
			return "(" + elem.length + ")";
		}
		var noLenFunc = function (elem, options) {
			return "";
		}
		var typeOf = function (type, lenFunc) {
			return function (elem, options) {
				return type + lenFunc(elem, options);
			}
		}
		var typeOfWithOverride = function (type, override, lenFunc) {
			return function (elem, options) {
				if (elem.length == -1) {
					return override + lenFunc(elem, options);
				} else {
					return type + lenFunc(elem, options);
				}
			}
		}
		var map = {
			VARCHAR: typeOf("varchar", varLenFunc),
			BOOLEAN: typeOf("boolean", noLenFunc),
			INTEGER: typeOfWithOverride("integer", "serial", noLenFunc),
			CHAR: typeOf("char", varLenFunc),
			BINARY: typeOf("bytea", noLenFunc),
			VARBINARY: typeOf("bytea", noLenFunc),
			BLOB: typeOf("bytea", noLenFunc),
			TEXT: typeOf("text", noLenFunc),
			SMALLINT: typeOfWithOverride("smallint", "smallserial", noLenFunc),
			BIGINT: typeOfWithOverride("bigint", "bigserial", noLenFunc),
			DECIMAL: typeOf("numeric", varLenFunc),
			NUMERIC: typeOf("numeric", varLenFunc),
			FLOAT: typeOf("real", noLenFunc),
			DOUBLE: typeOf("double", noLenFunc),
			BIT: typeOf("bit", varLenFunc),
			DATE: typeOf("date", noLenFunc),
			TIME: typeOf("time without time zone", noLenFunc),
			DATETIME: typeOf("timestamp with time zone", noLenFunc),
            TIMESTAMPTZ: typeOf("timestamp with time zone", noLenFunc),
			TIMESTAMP: typeOf("timestamp without time zone", noLenFunc),
			POINT: typeOf("point", noLenFunc),
			POLYGON: typeOf("polygon", noLenFunc),
            CIDR: typeOf("cidr", noLenFunc),
            INET: typeOf("inet", noLenFunc)
		};
		if (typeof map[elem.type] !== 'undefined') {
			return map[elem.type](elem, options);
		} else {
			return elem.type;
		}
	}

    /**
     * Return DDL column string
     * @param {type.ERDColumn} elem
     * @param {Object} options
     * @return {String}
     */
    DDLGenerator.prototype.columnDeclaration = function (columnName, elem, comments, defaultValue, options) {
        var self = this;
        var line = columnName;
        var _type = self.dataType(elem, options);
        line += " " + _type;
        if (elem.primaryKey || !elem.nullable) {
            line += " NOT NULL";
        }
		if (_type.indexOf('serial') == -1) {
			line += defaultValue;
		}
		var documentation = elem.documentation;
		if (!!documentation) {
			comments.push({
				col: columnName,
				doc: CodeGenUtils.asComment(documentation)
			});
		}
		if (typeof(elem.is_enum) !== 'undefined') {
			elem.type = 'enum';
		}
        return line;
    };


    /**
     * Write Foreign Keys
     * @param {StringWriter} codeWriter
     * @param {type.ERDEntity} elem
     * @param {Object} options
     */
    DDLGenerator.prototype.writeUserIndexes = function (codeWriter, tableName, elem, options) {
        var self = this,
            idxCols = self.getIndexColumns(elem);

		var idxDef = [];
		idxCols.forEach(function (col) {
			var idxTags = CodeGenUtils.tagsByValue('index', col);
			var colName = self.columnName(col, options);
			idxTags.forEach(function (tag) {
				idxDef.push({
					column: colName,
					idxName: tag.name,
					seq: tag.number,
					desc: tag.checked,
				});
			});
		});

		idxDef = _.groupBy(idxDef, function (o) { return o.idxName; });
		_.map(idxDef, function (o) {
			var cols = [];
			// sort the index columns by seq
			var sObj = _.sortBy(o, function (obj) { return obj.seq; });
			sObj.forEach(function (obj) {
				if (obj.desc)
					cols.push(obj.column + " DESC");
				else
					cols.push(obj.column);
			});
			// generate the index
			var idxName = o[0].idxName;
			codeWriter.writeLine(" -- Index: " + idxName);
			codeWriter.writeLine("CREATE INDEX ON " + tableName);
			codeWriter.indent();
			codeWriter.writeLine("(" + cols.join(", ") + ");");
			codeWriter.outdent();
		});
		codeWriter.writeLine();
    };

	DDLGenerator.prototype.tableName = function (elem, options) {
		var tag = CodeGenUtils.tag('table', elem);
		var dbName = '';
		if (tag) {
			dbName = tag.value;
		}
		if (!dbName) {
			dbName = CodeGenUtils.replaceAll(elem.name, ' ', '_');
		}
		if (!CodeGenUtils.isValidIdentifier(dbName)) {
			Toast.error("Table name is not valid: " + dbName
				+ ", please edit the table tag for " + elem.name);
			return '';
		}
		return dbName.toLowerCase();
	}

	DDLGenerator.prototype.columnName = function (elem, options) {
		var tag = CodeGenUtils.tag('column', elem);
		var dbName = '';
		if (tag) {
			dbName = tag.value;
		}
		if (!dbName) {
			dbName = CodeGenUtils.replaceAll(elem.name, ' ', '_');
		}
		if (!CodeGenUtils.isValidIdentifier(dbName)) {
			Toast.error("Column name is not valid: " + dbName
				+ ", please edit the column tag for " + elem.name);
			return '';
		}
		return dbName.toLowerCase();
	}

	DDLGenerator.prototype.columnDefault = function (elem, options) {
		var tag = CodeGenUtils.tag('default', elem);
		if (!tag) {
			return "";
		}

		var dbName = tag.value;
		return ' DEFAULT ' + dbName;
	}

    /**
     * Write Table
     * @param {StringWriter} codeWriter
     * @param {type.ERDEntity} elem
     * @param {Object} options
     */
    DDLGenerator.prototype.generateTable = function (codeWriter, dropWriter, elem, options, schemaName, prefix, refs) {
        var self = this;
        var lines = [],
            primaryKeys = [],
			foreignKeys = [],
			foreignKeyCtr = [],
            uniques = [],
			comments = [],
			drop_enums = [];

		var tableName = prefix + self.tableName(elem, options);
		var table = schemaName + "." + tableName
		
		// create enums
		elem.columns.forEach(function (col) {
			var _type = self.dataType(col, options);
			if (_type && _type.toLowerCase() === "enum") {
				var enums = CodeGenUtils.stringTag(_type, col);
				if (enums) {
					var column = self.columnName(col, options);
					var typeName = table + "_" + column;
					var enumDecl = CodeGenUtils.enumAsList(enums);

					codeWriter.writeLine("CREATE TYPE " + typeName + " AS ENUM(" + enumDecl + ");\n");
					col.type = typeName;
					col.is_enum = 1;
					drop_enums.push("DROP TYPE " + typeName + " CASCADE;");
				}
			}
		});
		
        // Table
        codeWriter.writeLine("CREATE TABLE " + table + " (");
        codeWriter.indent();
		dropWriter.writeLine("DROP TABLE " + table + " CASCADE;");
		// drop enums
		for (var i = 0, len = drop_enums.length; i < len; i++) {
            dropWriter.writeLine(drop_enums[i]);
        }

        // Columns
        elem.columns.forEach(function (col) {
			var column = self.columnName(col, options);
			if (column) {
				if (col.primaryKey) {
					primaryKeys.push(column);
				} else
					if (col.unique) {
						uniques.push(column);
					} else
						if (column && col.foreignKey && !col.primaryKey) {
							foreignKeys.push(column);
						}
				if (options.foreignKey && col.referenceTo) {
					foreignKeyCtr.push(col);
				}
			}
			var defaultValue = self.columnDefault(col, options);
            column && lines.push(self.columnDeclaration(column, col, comments,
				defaultValue, options));
        });

        // Primary Keys
        if (primaryKeys.length > 0) {
            lines.push("PRIMARY KEY (" + primaryKeys.join(", ") + ")");
        }

        // Write lines
        for (var i = 0, len = lines.length; i < len; i++) {
            codeWriter.writeLine(lines[i] + (i < len - 1 ? "," : ""));
        }

        codeWriter.outdent();
        codeWriter.writeLine(");");
        codeWriter.writeLine();

		// uniques (combined?)
		if (uniques.length > 0) {
			codeWriter.writeLine("ALTER TABLE " + table);
			codeWriter.indent();
			codeWriter.writeLine("ADD UNIQUE (" + uniques.join(", ") + ");");
			codeWriter.outdent();
			codeWriter.writeLine();
		}

		if (foreignKeyCtr.length > 0) {
			for (var i = 0, len = foreignKeyCtr.length; i < len; i++) {
				var col = foreignKeyCtr[i];
				var colName = self.columnName(col, options);
				var refCol = col.referenceTo;
				var refColName = self.columnName(refCol, options);
				var refTableObj = refCol._parent;
				var refTableName = self.tableName(refTableObj, options);
				if (refTableObj._parent instanceof type.ERDDiagram) {
					var prefix = CodeGenUtils.stringTag("prefix", refTableObj._parent)
					refTableName = prefix + refTableName;
				}
				var refSchemaName = self.schemaName(refTableObj._parent._parent, options);
				refs.push("ALTER TABLE " + table + " ADD CONSTRAINT FK_" + tableName + "__" + colName 
					+ " FOREIGN KEY (" + colName + ") REFERENCES " + refSchemaName + "." + refTableName
					+ "(" + refColName + ");");
			}
		}
		
		// generate simple FK indexes
		if (foreignKeys.length > 0) {
			for (var i = 0, len = foreignKeys.length; i < len; i++) {
				codeWriter.writeLine("CREATE INDEX ON " + table);
				codeWriter.indent();
				codeWriter.writeLine("(" + foreignKeys[i] + ");");
				codeWriter.outdent();
			}
			codeWriter.writeLine();
		}

		self.writeUserIndexes(codeWriter, table, elem, options);

		var documentation = elem.documentation;
		if (!!documentation) {
			codeWriter.writeLine("COMMENT ON TABLE " + table);
			codeWriter.indent();
			codeWriter.writeLine("IS " + CodeGenUtils.asComment(documentation) + ";");
			codeWriter.outdent();
		}
		comments.forEach(function (comment) {
			codeWriter.writeLine("COMMENT ON COLUMN " + table +
				"." + comment.col);
			codeWriter.indent();
			codeWriter.writeLine("IS " + comment.doc + ";");
			codeWriter.outdent();
		});
		(!documentation && comments.length == 0) || codeWriter.writeLine();
    };

	DDLGenerator.prototype.generateDatabase = function (elem, path, options) {
		if (elem instanceof type.Project) {
			var tag = CodeGenUtils.tag('database', elem);
			var dbName = '';
			if (tag) {
				dbName = tag.value;
			}
			if (!dbName) {
				dbName = CodeGenUtils.replaceAll(elem.name, ' ', '_');
			}
			if (!tag && !CodeGenUtils.isValidIdentifier(elem.name)) {
				CodeGenUtils.addStringTag('database', elem, dbName.toLowerCase());
			}
			if (!tag) {
				CodeGenUtils.addStringTag('database', elem, dbName.toLowerCase());
			}
			if (!CodeGenUtils.isValidIdentifier(dbName)) {
				Toast.warning("Database name is not valid: " + dbName
					+ ", please edit the database tag for " + elem.name);
				return false;
			}
            var codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
			codeWriter.writeLine("-- Database: " + elem.name);
			codeWriter.writeLine("-- Author: " + elem.author);
			codeWriter.writeLine('CREATE DATABASE ' + dbName.toLowerCase());
			codeWriter.indent();
			codeWriter.writeLine("WITH OWNER = " + options.owner);
			codeWriter.indent();
			codeWriter.writeLine("ENCODING = '" + options.encoding + "'");
			codeWriter.writeLine("TABLESPACE = " + options.tablespace);

			var collation = options.dbCollation;
			if (collation !== 'default') {
				codeWriter.writeLine("LC_COLLATE = '" + collation + "'");
				codeWriter.writeLine("LC_CTYPE = '" + collation + "'");
			}
			codeWriter.writeLine("CONNECTION LIMIT = -1;");
			codeWriter.outdent();
			codeWriter.outdent();
			var documentation = elem.documentation;
			if (!!documentation) {
				codeWriter.writeLine();
				codeWriter.writeLine("COMMENT ON DATABASE " + dbName.toLowerCase());
				codeWriter.indent();
				codeWriter.writeLine("IS " + CodeGenUtils.asComment(documentation) + ";");
			}

			var file = FileSystem.getFileForPath(path + "/db_create.sql");
            FileUtils.writeText(file, codeWriter.getData(), true);

			codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
			codeWriter.writeLine('DROP DATABASE ' + dbName.toLowerCase() + ";");

			file = FileSystem.getFileForPath(path + "/db_drop.sql");
            FileUtils.writeText(file, codeWriter.getData(), true);

			return true;
		} else {
			Toast.error("No project found, database DDL generator expects a main project");
			return false;
		}
	}

	DDLGenerator.prototype.schemaName = function (elem, options) {
		var dbName = CodeGenUtils.stringTag('schema', elem);
		if (!dbName) {
			dbName = 'public';
		} else if (!CodeGenUtils.isValidIdentifier(dbName)) {
			Toast.warning("Schema name not valid: " + dbName);
		}
		return dbName;
	}

	DDLGenerator.prototype.generateSchema = function (elem, path, options) {
		var codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
		var dropWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
		var schemas = [];
		var self = this;
		elem.ownedElements.forEach(function (e) {
			if (e instanceof type.ERDDataModel) {

				var schemaName = self.schemaName(e, options).toLowerCase();
				var dataModelName = CodeGenUtils.replaceAll(e.name, ' ', '_').toLowerCase();
				self.generateTables(e, path, options, schemaName, dataModelName);
				if (schemaName !== 'public' && schemas.indexOf(schemaName) == -1) {
					schemas.push(schemaName);
					codeWriter.writeLine("-- Schema for: " + e.name);
					codeWriter.writeLine('CREATE SCHEMA ' + schemaName);
					codeWriter.indent();
					codeWriter.writeLine("AUTHORIZATION " + options.owner + ";");
					codeWriter.outdent();
					var documentation = e.documentation;
					if (documentation) {
						codeWriter.writeLine();
						codeWriter.writeLine("COMMENT ON SCHEMA " + schemaName);
						codeWriter.indent();
						codeWriter.writeLine("IS " + CodeGenUtils.asComment(documentation) + ";");
						codeWriter.outdent();
					}
					dropWriter.writeLine("DROP SCHEMA " + schemaName + ";");
				}
			}
		});
		if (codeWriter.hasContent()) {
			var file = FileSystem.getFileForPath(path + "/schema_create.sql");
			FileUtils.writeText(file, codeWriter.getData(), true);
			file = FileSystem.getFileForPath(path + "/schema_drop.sql");
			FileUtils.writeText(file, dropWriter.getData(), true);
		}

		return true;
	}

	DDLGenerator.prototype.generateTables = function (elem, path, options, schema, dataModelName) {
        var self = this;

		var tableCodeWriter = new CodeGenUtils.CodeWriter(self.getIndentString(options));
		var tableDropWriter = new CodeGenUtils.CodeWriter(self.getIndentString(options));
		var refs = [];
		var tableRefs = [];
		elem.ownedElements.forEach(function (diagram) {
			console.log(diagram);
			if (diagram instanceof type.ERDDiagram) {
				var codeWriter = new CodeGenUtils.CodeWriter(self.getIndentString(options));
				var dropWriter = new CodeGenUtils.CodeWriter(self.getIndentString(options));
				
				var prefix = CodeGenUtils.stringTag("prefix", diagram);
				diagram.ownedElements.forEach(function (entity) {
					Toast.info("Generate table DDL for " + entity.name);
					if (!self.generateTable(codeWriter, dropWriter, entity, options, schema, prefix, refs)) {
						return false;
					}
				});
				// add the references
				for (var i = 0, len = refs.length; i < len; i++) {
					codeWriter.writeLine(refs[i]);
				}
				
				if (codeWriter.hasContent()) {
					var diagName = CodeGenUtils.replaceAll(diagram.name, ' ', '_').toLowerCase();
					var file = FileSystem.getFileForPath(path + "/" + dataModelName + "_" +
						diagName + "_create.sql");
					FileUtils.writeText(file, codeWriter.getData(), true);
					file = FileSystem.getFileForPath(path + "/" + dataModelName + "_" +
						diagName + "_drop.sql");
					FileUtils.writeText(file, dropWriter.getData(), true);
				}
			} else if (diagram instanceof type.ERDEntity) {
				// generate table
				Toast.info("Generate table DDL for " + diagram.name);
				if (!self.generateTable(tableCodeWriter, tableDropWriter, diagram, options, schema, '', tableRefs)) {
					return false;
				}
			}
		});

		if (tableCodeWriter.hasContent()) {
			for (var i = 0, len = tableRefs.length; i < len; i++) {
				tableCodeWriter.writeLine(tableRefs[i]);
			}
			var file = FileSystem.getFileForPath(path + "/" + dataModelName +
				"_table_create.sql");
			FileUtils.writeText(file, tableCodeWriter.getData(), true);
			file = FileSystem.getFileForPath(path + "/" + dataModelName +
				"_table_drop.sql");
			FileUtils.writeText(file, tableDropWriter.getData(), true);
		}

		return true;
	}

    /**
     * Generate codes from a given element
     * @param {type.Model} elem
     * @param {string} path
     * @param {Object} options
     * @return {$.Promise}
     */
    DDLGenerator.prototype.generate = function (elem, path, options) {
        var result = new $.Deferred(),
            self = this,
            codeWriter,
            file;

		try {
			self.generateDatabase(elem, path, options);
			Toast.info("Database creation files completed.");

			self.generateSchema(elem, path, options);

			Dialogs.showInfoDialog("Project DDL files generated in " + path);
		} catch (ex) {
			Dialogs.showErrorDialog("Project generation failed: " + ex);
			console.log(ex);
		}

        return result.promise();
    };


    /**
     * Generate
     * @param {type.Model} baseModel
     * @param {string} basePath
     * @param {Object} options
     */
    function generate(baseModel, basePath, options) {
        var generator = new DDLGenerator(baseModel, basePath);
        return generator.generate(baseModel, basePath, options);
    }

    exports.generate = generate;

});
