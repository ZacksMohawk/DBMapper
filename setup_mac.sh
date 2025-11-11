#!/bin/bash

touch ~/.zshrc

DBMAPPERSET=false

while read -r line
do
	if [[ "$line" =~ ^"alias dbmapper="* ]]; then
		DBMAPPERSET=true
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

source ~/.zshrc

echo "Setup complete"