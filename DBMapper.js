global.appType = "DBMapper";
global.version = "1.1.0";

const fs = require('fs');
const PropertiesReader = require('properties-reader');
const { execSync } = require("child_process");
const cliProgress = require('cli-progress');
const prompt = require('prompt-sync')();
const Logger = require('./includes/Logger');

Logger.log();
Logger.log(fs.readFileSync('AppLogo.txt', 'utf8').replace('[version]', 'DBMapper v' + version));
Logger.log();

/**
 * Objects and Variables
 */

let dbMap = {};

if (!fs.existsSync('maps')){
	fs.mkdirSync('maps');
}
if (!fs.existsSync('pages')){
	fs.mkdirSync('pages');
}

// command line params
let configPath;
if (process.argv.indexOf("-configPath") != -1){
	configPath = process.argv[process.argv.indexOf("-configPath") + 1];
	if (!configPath){
		Logger.log("Defaulting to local config\n");
		configPath = 'config.ini';
	}
}
else {
	Logger.log("Defaulting to local config\n");
	configPath = 'config.ini';
}

// properties
let properties = PropertiesReader(configPath);
global.debugMode = properties.get('main.debug.mode');
let username = properties.get('main.username');
let ip = properties.get('main.ip');
let dbType = properties.get('main.dbType');
let dbConnectionName = properties.get('main.dbConnectionName'); 
let dbConnectString = properties.get('main.dbConnectString');

let validDbTypes = ['MySQL', 'CockroachDB'];

let exportFilePath = 'maps/dbMap_' + dbConnectionName + '_' + ip + '.json';
let multibar, progressBar1, progressBar2;


if (process.argv.indexOf("-dbMaps") != -1){
	chooseMap();
	process.exit(0);
}

function mapDb(){
	validateDbType();
	if (fs.existsSync(exportFilePath)){
		let confirmContinue = prompt('DB Map "' + exportFilePath + '" already exists. Do you wish to re-map/overwrite? (y/n): ');
		if (!confirmContinue || confirmContinue.toLowerCase() != 'y'){
			let confirmVisualise = prompt('Open DB visualisation? (y/n): ');
			if (!confirmVisualise || confirmVisualise.toLowerCase() == 'y'){
				visualiseFromFile(exportFilePath);
			}
			process.exit(0);
		}
	}
	Logger.log("Mapping...");

	multibar = new cliProgress.MultiBar({
	    clearOnComplete: false,
	    hideCursor: true,
	    format: ' {bar} | {name} | {value}/{total}',
	    stopOnComplete: true
	}, cliProgress.Presets.shades_grey);

	progressBar1 = multibar.create(100, 0);
	progressBar1.update(0, {name: ""});
	multibar.update();

	fs.writeFileSync('query.sql', 'SHOW DATABASES;');
	let databasesResult = fetchResult();
	let splitDatabasesResult = databasesResult.split("\n");

	// process these databases into a map
	for (let index = 1; index < splitDatabasesResult.length; index++){
		let dbName = splitDatabasesResult[index].split("	")[0];
		if (!dbName){
			continue;
		}
		if (progressBar2){
			progressBar2.update(0, {name: ""});
		}
		progressBar1.update(((index - 1) / (splitDatabasesResult.length - 2)) * 100, {name: dbName});
		multibar.update();
		dbMap[dbName] = fetchTables(dbName);
	}

	progressBar1.update(100, {name: ""});
	progressBar2.update(100, {name: ""});
	multibar.stop();

	Logger.log('\nExporting dbMap to: ' + exportFilePath + '\n');
	fs.writeFileSync(exportFilePath, JSON.stringify(dbMap, null, 4));

	let confirmVisualise = prompt('Open DB visualisation? (y/n): ');
	if (!confirmVisualise || confirmVisualise.toLowerCase() == 'y'){
		visualiseFromFile(exportFilePath);
	}
}

function fetchResult(){
	if (ip){
		execSync('scp query.sql ' + username + '@' + ip + ':~/; rm query.sql');
		return execSync('ssh -l "' + username + '" "' + ip + '" "' + dbConnectString + '; rm query.sql;"').toString();	
	}
	let result = execSync(dbConnectString).toString();
	fs.unlinkSync('query.sql');
	return result;
}

function fetchTables(dbName){
	fs.writeFileSync('query.sql', 'USE ' + dbName + '; SHOW TABLES;');
	let tablesResult = fetchResult();
	let splitTablesResult = tablesResult.split("\n");

	let tablesMap = {};

	if (!progressBar2){
		progressBar2 = multibar.create(100, 0);
	}

	// process these tables into a map
	let tableName;
	for (let index = 2; index < splitTablesResult.length; index++){
		tableName = extractTableName(splitTablesResult[index]);
		if (!tableName){
			continue;
		}
		progressBar2.update(((index - 2) / (splitTablesResult.length - 3)) * 100, {name: tableName});
		multibar.update();
		tablesMap[tableName] = fetchFields(dbName, tableName);
	}
	progressBar2.update(100, {name: tableName});
	multibar.update();

	return tablesMap;
}

function extractTableName(tableLine){
	if (dbType == "MySQL"){
		return tableLine;	
	}
	if (dbType == "CockroachDB"){
		return tableLine.split("\t")[1];
	}
}

function fetchFields(dbName, tableName){
	fs.writeFileSync('query.sql', 'USE ' + dbName + '; SHOW COLUMNS FROM ' + tableName + ';');
	let fieldsResult = fetchResult();
	let splitFieldsResult = fieldsResult.split("\n");

	let fieldsMap = {};

	// process these fields into an array
	for (let index = 2; index < splitFieldsResult.length; index++){
		let fieldsArray = splitFieldsResult[index].split("\t");
		let fieldName = fieldsArray[0];
		if (!fieldName){
			continue;
		}
		fieldsMap[fieldName] = {
			"type" : fieldsArray[1],
			"nullable" : fieldsArray[2],
			"default" : fieldsArray[3],
			"generation_expression" : fieldsArray[4],
			"indices" : fieldsArray[5],
			"hidden" : fieldsArray[6]
		};
	}

	return fieldsMap;
}

function visualiseFromFile(dbFilePath){
	let dbMap = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
	visualise(dbFilePath, dbMap);
}

function visualise(dbFilePath, dbMap){
	let dbMapTitle = dbFilePath.replaceAll('maps/dbMap_', '');
	dbMapTitle = dbMapTitle.substring(0, dbMapTitle.indexOf('_'));
	let pageContent = fs.readFileSync('template.html', 'utf8')
		.replaceAll("<<dbMap>>", JSON.stringify(dbMap))
		.replaceAll("<<title>>", dbMapTitle);

	let htmlPagePath = dbFilePath.replace("json", "html").replaceAll('maps/', 'pages/');
	fs.writeFileSync(htmlPagePath, pageContent);
	execSync('open -a "Google Chrome" ' + htmlPagePath);
}

function validateDbType(){
	if (!validDbTypes.includes(dbType)){
		Logger.log("Invalid dbType. Must be one of: " + validDbTypes.toString());
		process.exit(0);
	}
}

function chooseMap(){
	let mapFiles = fs.readdirSync('maps');
	if (mapFiles.length == 0){
		Logger.log('No pre-existing map files found. Aborting');	
		process.exit(0);
	}
	Logger.log('Please choose which DB Map to visualise\n');
	for (let index = 0; index < mapFiles.length; index++){
		let mapFile = mapFiles[index].replaceAll('.json', '').replaceAll('dbMap_', '');
		Logger.log('\t' + (index + 1) + '. ' + mapFile);
	}
	Logger.log();
	let dbMapChoice = prompt('Choose (1-' + mapFiles.length + '): ');
	if (!dbMapChoice){
		process.exit(0);
	}
	dbMapChoice = dbMapChoice.trim();
	if (isNaN(dbMapChoice)){
		Logger.log("Not a number. Aborting");
		process.exit(0);
	}
	dbMapChoice = parseInt(dbMapChoice);
	if (dbMapChoice < 1 || dbMapChoice > mapFiles.length){
		Logger.log("Invalid choice. Aborting");
		process.exit(0);
	}

	visualiseFromFile('maps/' + mapFiles[dbMapChoice - 1]);
}

mapDb();