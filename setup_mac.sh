#!/bin/bash

touch ~/.zshrc

DBMAPPERSET=false
DBMAPSSET=false

while read -r line
do
	if [[ "$line" =~ ^"alias dbmapper="* ]]; then
		DBMAPPERSET=true
	fi
	if [[ "$line" =~ ^"alias dbmaps="* ]]; then
		DBMAPSSET=true
	fi
done < ~/.zshrc

NEWLINESET=false

if [[ "$DBMAPPERSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.zshrc
		NEWLINESET=true
	fi
	echo "Setting 'dbmapper' alias";
	echo "alias dbmapper='dt=\$(pwd); cd $(pwd); node --no-warnings DBMapper.js -folderPath \$dt; cd \$dt;'" >> ~/.zshrc
fi

if [[ "$DBMAPSSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.zshrc
		NEWLINESET=true
	fi
	echo "Setting 'dbmaps' alias";
	echo "alias dbmaps='dt=\$(pwd); cd $(pwd); node --no-warnings DBMapper.js -folderPath \$dt -dbMaps; cd \$dt;'" >> ~/.zshrc
fi

source ~/.zshrc

echo "Setup complete"