var unirest = require('unirest');
var azureStorage = require('azure-storage');
var url = require('url');
var _debugMode = false;
var _authenticationEndpoint = 'https://wamsprodglobal001acs.accesscontrol.windows.net/v2/OAuth2-13';
var _serviceEndpoint = 'https://media.windows.net';
function Indexer(mediaSerivcesAccountName,
	mediaServicesKey, storageAccountName, storageAccountKey, debug){

	_debugMode = debug;
	this._blobService = azureStorage.createBlobService(storageAccountName,
	storageAccountKey);
	this._mediaServicesAccountName = mediaSerivcesAccountName;
	this._mediaServicesKey = mediaServicesKey;
	this._storageAccountName = storageAccountName;
	this._storageAccountKey = storageAccountKey;
}

function _debug(content){

	if(_debugMode){
		if(typeof content == 'object'){
			console.dir(content);
		}
		else{
			console.log(content);
		}
	}
}

Indexer.prototype.createAsset = function(localFilePath, fileName, callback){

	_debug(_authenticationEndpoint);
	_debug('this._mediaServicesAccountName: ' + this._mediaServicesAccountName);
	_debug('this._mediaServicesAccountName:' + this._mediaServicesKey);

	var that = this;

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : this._mediaServicesAccountName,
		'client_secret' : this._mediaServicesKey,
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){
		if(response.error){
			_debug(response.body);
			return callback({message: 'received error from azure api', content: response.body});
		}
		//console.log('access token: ' + response.body.access_token);
		var access_token = response.body.access_token;
		unirest.post(_serviceEndpoint + '/API/Assets')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json',
		'Content-Type' : 'application/json',
		'x-ms-version': '2.7',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.send({'Name': 'sedouardAsset',
		'Options': 0})
		.followAllRedirects(true)
		.end(function(response){

			if(response.error){
				return callback({error: response.error, content: response.body});
			}

			//we've recieved our actual api endpoint. start using that one
			if(url.parse(response.body['odata.metadata']).hostname !== url.parse(_serviceEndpoint).hostname){
				//switch to the correct api endpoint
				parts = url.parse(response.body['odata.metadata']);
				_serviceEndpoint = parts.protocol + '//' + parts.hostname;
				if(parts.port){
					_serviceEndpoint += ':' + parts.port;
				}
				return that.createAsset(localFilePath, fileName, callback);
			}
			_debug(response.status);
			_debug(response.body);
			var containerName = response.body.Uri.split('/')[response.body.Uri.split('/').length -1].trim();
			_debug('container name = ' + containerName);
			_debug('name length = ' + containerName.length);

			var startDate = new Date();
			var expiryDate = new Date(startDate);
			expiryDate.setMinutes(startDate.getMinutes() + 100);
			startDate.setMinutes(startDate.getMinutes() - 100);

			var assetId = response.body.Id;
			var assetInfo = response.body;
			that._blobService.createBlockBlobFromLocalFile(containerName, fileName, localFilePath, function(error, result, response){
				if(error){
				
					return callback(error);

				}

				_debug('file uploaded!');
				_debug(result);

				//console.log('access token: ' + response.body.access_token);
				_debug('https://media.windows.net/API/CreateFileInfos?assetid=\'' + encodeURIComponent(assetId) + '\'');
				unirest.get(_serviceEndpoint +'/API/CreateFileInfos?assetid=\'' + encodeURIComponent(assetId) + '\'')
				.headers({'Authorization' :'Bearer ' + access_token,
				'Accept': 'application/json;odata=verbose',
				'Content-Type' : 'application/json;odata=verbose',
				'x-ms-version': '2.6',
				'DataServiceVersion': '3.0',
				'MaxDataServiceVersion' : '3.0'})
				.end(function(response){

					if(response.error){
						_debug.log('recieved error from azure api');
						_debug.log(response.body);

						return res.send(500, {message:'recieved error from azure api', contents: response.body});
					}

					_debug('sucessfully created new file');
					_debug(response);
					_debug(response.body);

					return callback(null, assetInfo);
				});
			});

		});

	});

};

module.exports = Indexer;