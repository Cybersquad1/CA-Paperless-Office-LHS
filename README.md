# Installation / User Guide - Paperless Office#
A paperless office solution for cloud applications

## Required ##
- Create a webserver or create a folder locally.
- Clone or copy the site files.
- Go into the folder and install the node packages (run "npm install")
- Make an sql database on azure or somewhere else.
- Get Api keys for the "Microsoft Conmputer Vision API" (https://www.microsoft.com/cognitive-services/en-us/computer-vision-api)
- Get Api keys for the "Text Analytics API" (https://www.microsoft.com/cognitive-services/en-us/text-analytics-api)
- Get a blob storage account on azure and make a blob storage
- Get the blob storage connection string

## Fill in the configs: ##
- Open the "config" folder
- Fill in the username, password, server and database in DBCredentialsTemplate.json
- Create a random string or hash and enter it in SessionSecretTemplate.json
- Fill in the computer vision api key in ApiKeyTemplate.json in the "api_key_cv" field
- Fill in the text analytics api key in the api_key_text field
- Fill in the blob storage connection string in azureTemplate.json
- (Save all changes)
- Rename all the template files to remove "Template", for example: ApiKeyTemplate.json -> ApiKey.json

## Ready to go! ##
- Run "node Server.js" in the website folder or just start the azure web app and the website will be running.
- The first startup the website will create the nessesary tables in the database.

## Errors? Where? ##
- If there are any errors it will log them in the "Errors" table inside the database for a complete headless experience.
- If you are running in a "development" environment, it will log to the console instead.
