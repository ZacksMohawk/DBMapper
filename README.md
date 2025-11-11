# Zack's Mohawk Limited
## DBMapper

## Overview

A command line application for the automatic mapping and visual representation of all databases found at a specified location

## How To Install

	npm install

To setup the 'dbmapper' alias, run the setup script. You will then be able to run DBMapper from any location

	./setup_mac.sh

or

	./setup_linux.sh

## How To Configure

All functionality is defined in the config.ini file.

If you are connecting to a remote server via SSH, you must define your SSH username and the target IP address. Leave blank if using localhost

	username={your SSH username}
	ip={target IP address}

You must define the dbType. Currently, DBMapper only supports MySQL and CockroachDB.

	dbType={MySQL or CockroachDB}

You should give the connection a name (either the name of the remote server, or 'localhost' if mapping a local DB)

	dbConnectionName=...

Most importantly, you must define your dbConnectionString. This is what is used to execute the DB queries, in order to elucidate the structure of all associated DBs.

For MySQL, this is suitable:

	dbConnectString=export MYSQL_PWD={your MySQL password}; mysql --user="{your MySQL username}" < query.sql

And for CockroachDB:

	sudo cockroach sql --file query.sql --certs-dir=/opt/cockroachdb/secrets

## How To Run

From the DBMapper folder:

	node DBMapper

From any location, having run the relevant setup script:

	dbmapper

The application will then attempt to connect to the DB and produce a JSON file containing the DB's structural data. You will then be asked if you would like to visualise the results, where selecting 'y' will open up an interactive HTML page allowing you to explore the results
