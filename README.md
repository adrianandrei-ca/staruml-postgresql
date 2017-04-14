# Postgresql DDL Extension for StarUML 2

This extension for [StarUML](http://staruml.io) support to generate DDL (Data Definition Language) from PostgreSQL. Install this extension from Extension Manager of StarUML.

## Usage

1. Click the menu (`Tools > Postgresql Model Generation > Generate DDL...`)
2. Select a directory where the generated code will be deployed
3. Save the ERD model if changes were perfomed during code generation.

If you want to change the generation options please follow the steps below.
1. Click the menu (`Tools > Postgresql Model Generation > Configure...`)
2. From `Preferences/Postgresql DDL` tab set your preferences and close
3. Follow the spteps above to re-generate with the new preferences.

## Generation rules

Belows are the rules to convert from ERD elements to DDL.

All entities and columns are converted to create table statements as follow:

+ `Project`: provides the database name, either derived from its name or through the `database` tag. If the tag is not present one will be created with the actual name.
+ `Data Model`: part of a `Project`, it gives the schema where all member tables will be created. The schema name is provided by the `schema` tag, default value being `public` if none is defined.
+ `ER Diagram`: groups all the Entities. Each entity will be transformed into a table and at this level the user can provide a table name prefix for them using the tag `prefix`.
+ `Entity`: provides table description. The table name is composed of the `ER Diagram` prefix (optional) and the entity name. The `table` tag can be used to override the `Entity` name.
+ `Column`: generates a table column. The column name is derived from the name but the `column` tag can be used to override it. The default value can be stored in the `default` tag.

### Index and constraints creation
- primary key: each column marked as primary key will be part of the primary key constraint.
- foreign key: each column marked as foreign key will have its own index
- unique constraint: the columns marked as unique will be part of the table's unique contraint. With this version only one unique contraint is generated per table.
- reference constraints: for a foreign key column with the reference field populated, a reference contraint will be created.

### Type mapping
The integer columns with length `-1` will be mapped to the equivalent serial type. For instance `BIGINT` with length `-1` will be mapped to `BIGSERIAL`.

| StarUML Type | PostgreSQL type | Note |
| --- | --- | --- |
| VARCHAR | varchar| length can be used for maximum size|
| BOOLEAN | boolean| length is not used |
|INTEGER|integer| serial if length is set to -1|
|CHAR|char|length can be used for size|
|BINARY|bytea| length is ignored |
|VARBINARY|bytea| length is ignored |
|BLOB|bytea| length is ignored |
|TEXT|text| length is not used |
|SMALLINT|smallint|smallserial with length -1|
|BIGINT|bigint|bigserial if length is -1 |
|DECIMAL|numeric| length is used |
|NUMERIC|numeric| length is used|
|FLOAT|real| length is ignored|
|DOUBLE|double precision| length is ignored|
|BIT|bit| length is used |
|DATE|date| length is not used |
|TIME|time without time zone| length is not used |
|DATETIME|timestamp with time zone| length is not used|
|TIMESTAMPTZ|timestamp with time zone| length is not used|
|TIMESTAMP|timestamp without time zone| length is not used|
|POINT|point||
|POLYGON|polygon||
| enum | [table]_[column] type | enumeration type named with the provided pattern | 

### Generated files name pattern

For ease of use the files are generated following specific patterns. In general the files are in pairs, one ending in `_create` for the object creation and one ending in `_drop` that will clear all objects from the database.

| Type | Creation filename pattern | Removal filename pattern | Deployment notes |
| --- | --- | --- | --- |
| Database | `db_create.sql` | `db_drop.sql` | Unless the database name is changed these files needs to be run once |
| Schema | `schema_create.sql` | `schema_drop.sql` | If schema name changes these files need to be run followed by the table ones |
| Diagram Tables | `<model name>_<diagram name>_create.sql` | `<model name>_<diagram name>_drop.sql` | Code for all the children diagram entities|
| Schema tables |  `<model name>_table_create.sql` | `<model name>_table_drop.sql` | Code for all the children data model entities|

* Note: the difference between diagram and schema tables is given by the model owner: the diagram entities that are moved under a diagram are diagram tables, the others (default) are schema's.

### File deployment

Once files are generated or changed, you have to deploy or re-deploy them into your database server. Connect to the server using `psql` or your favorite client and deploy the files based on the scenarios below.

* Note: if you choose to have reference constraints please deploy the file accordingly.

#### Initial deployment.
It is assumed that the DDL is generated for the first time. The files should be deployed in the following oder:
- deploy the database creation file, for instance from the `psql` prompt: `\i db_create.sql`
- deploy the schema creation files, `\i schema_create.sql`
- for each data model deploy the table file or files.

#### Remove the tables.
Tables should be removed if model changes are performed to them. Identify the specific data model or diagram where the table are and run the specific script ending with `_drop.sql`.

#### Clean up the database.
Run `db_drop.sql`.

### User tags

It is possible to assist with the code generation through custom tags with specific names. The code generation will normally use the model names to generate the SQL ones but that can be overriden.

| Tag | Level | Description |
| --- | --- | --- |
| `database` | `Project` | Overrides the database name given by the normalized project name |
| `prefix` | `ERDDiagram` | Gives the prefix of all the table names of the diagram |
| `schema` | `ERDDataModel` | Indicates the schema where the tables will be created |
| `table` | `Entity` | Override the table name otherwise given by the normalized `Entity` name |
| `column` | `Column` | Override the column name, otherwise given by the `Column` name |
| `default` | `Column` | Gives the default column value. The string value is taken as is so user needs to be aware of specific database syntax |
| `enum` | `Column` | Gives the column comma separated enumeration elements |

- Note: name normalization consists in replacing the space characters with underscores and converting to lower case.

The override tags are used to separate the high level model from the physical model. The model table name may be user/business friendly but the generated one may follow specific constraints that can be hard to follow at the high level.
For example, the `User` table can be problematic in a real schema as `User` is a keyword but it makes perfect sense while building the model; the database name for this table may end up being `cex_people_usr`.

## Enumeration types

Postgresql supports enumeration for column value and the plugin allows the user to define them using the `enum` custom tag. The user can declare the column type as `enum` and then add the custom `enum` tag on the column.
The `value` text field should have the list of possible values. The plugin will subsequently create a dedicated enumration type with the name pattern `table_column`.

In order to facilitate the usage of enumeration values, an implicit character varying conversion cast is created; as such the user can use the enumeration values as strings without an explicit casting.

In the included example, the Employee status field is a (permanent, temporary) enumeration.

## Options

The following preferences are currently available:

| Preference | Description |
| --- | --- |
| `Owner` | Postgresql object owner, only one for entire model |
| `Storage tablespace` | Database storage tablespace name |
| `Storage character set` | Database storage character set |
| `Database collation` | Collation list |
| `Generate Foreign Key Constraints` | Generate foreign key constraints when column reference field is populated |
| `Use tab` | use `TAB` for indentation |
| `Indent spaces` | Number of spaces to be used for indentation if tab use is off |

## Contributions

Any contributions are welcome. If you find a bug or have a suggestion, please post as an issue.

## Notes.

By default the entities when dropped into the diagram view are added in the model as diagram siblings. They can be manually moved into the diagram manually to achieve a similar structure with the sample included.
However the generator accommodates for both cases.
 
