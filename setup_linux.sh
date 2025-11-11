#!/bin/bash

touch ~/.bashrc

DBMAPPERSET=false

while read -r line
do
	if [[ "$line" =~ ^"alias dbmapper="* ]]; then
		DBMAPPERSET=true
	fi
done < ~/.bashrc

NEWLINESET=false

if [[ "$DBMAPPERSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'dbmapper' alias";
	echo "alias dbmapper='dt=\$(pwd); cd $(pwd); node --no-warnings DBMapper.js -folderPath \$dt; cd \$dt;'" >> ~/.bashrc
fi

source ~/.bashrc

echo "Setup complete"