var unirest = require('unirest');
var azureStorage = require('azure-storage');
var url = require('url');
var assert = require('assert');
var async = require('async');
var fs = require('fs');
var path = require('path');
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
	this._isInitialized = false;
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

Indexer.prototype.initialize = function(callback){
	/**
	Azure media sercices apis will give you a 301 redirect to a specific endpoint
	for the are of the world your app is running in. This function basically
	calls the jobs api to get the real endpoint.
	**/

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : this._mediaServicesAccountName,
		'client_secret' : this._mediaServicesKey,
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){
		if(!response.body.access_token){
			return callback({message:'fail to authenticate to azure ', content: response.body});
		}
		var access_token = response.body.access_token;

		unirest.get(_serviceEndpoint + '/API/Jobs')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json',
		'Content-Type' : 'application/json',
		'x-ms-version': '2.2',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){

			if(response.error){
				console.dir(response.body);
				return callback({message:'recieved error from azure', contents: response.body});
			}

			//we've recieved our actual api endpoint. start using that one
			if(url.parse(response.body['odata.metadata']).hostname !== url.parse(_serviceEndpoint).hostname){
				//switch to the correct api endpoint
				parts = url.parse(response.body['odata.metadata']);
				_serviceEndpoint = parts.protocol + '//' + parts.hostname;
				if(parts.port){
					_serviceEndpoint += ':' + parts.port;
				}
				this._isInitialized = true;
				return callback(null);
			}
			this._isInitialized = true;
			return callback(null);

		});
	});

};
Indexer.prototype.createAsset = function(localFilePath, fileName, callback){

	assert(true, localFilePath !== null || localFilePath !== undefined, 'must provide localFilePath');
	assert(true, fileName !== null || fileName !== undefined, 'must provide fileName');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, this._isInitialized === true, 'must call the initialize() function prior to calling this function');
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
		//_debug('access token: ' + response.body.access_token);
		var access_token = response.body.access_token;
		unirest.post(_serviceEndpoint + '/API/Assets')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json',
		'Content-Type' : 'application/json',
		'x-ms-version': '2.7',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.send({'Name': fileName,
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

				//_debug('access token: ' + response.body.access_token);
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

						return callback({message:'recieved error from azure api', contents: response.body});
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

Indexer.prototype.startJob = function(jobName, assetIdsArray, callback){

	assert(true, jobName !== null || jobName !== undefined, 'must provide jobName');
	assert(true, assetIdsArray !== null || assetIdsArray !== undefined, 'must provide assetIdsArray');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, this._isInitialized === true, 'must call the initialize() function prior to calling this function');

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

		var access_token = response.body.access_token;
		unirest.get(_serviceEndpoint + '/API/MediaProcessors')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json',
		'Content-Type' : 'application/json',
		'x-ms-version': '2.7',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){
			var indexerId = null;
			for(var z in response.body.value){
				if(response.body.value[z].Description == 'Azure Media Indexer'){
					//we found the indexer option assign it to indexerId
					indexerId = response.body.value[z].Id;
				}
			}
			if(!indexerId){
				return callback({message:'could not find Azure Media Indexer service option'});
			}
			var taskBody = '<?xml version="1.0" encoding="utf-8"?><taskBody><inputAsset>JobInputAsset(0)</inputAsset><outputAsset assetCreationOptions="0" assetName="output">JobOutputAsset(0)</outputAsset></taskBody>';
			
			var postObject = {'Name': jobName, 'InputMediaAssets': [], 'Tasks':[]};
			_debug('received body');

			for(var i in assetIdsArray){

				var idName = "\'" + encodeURIComponent(assetIdsArray)+ "\'";
				postObject.InputMediaAssets.push(
				{'__metadata': {
					uri: "https://media.windows.net/api/Assets(" + idName + ")"
				}});
				var instanceTaskBody = taskBody.replace(/Asset\(0\)/g, 'Asset(' + i + ')');
				postObject.Tasks.push({'Configuration': '', 'MediaProcessorId': indexerId, 'TaskBody': instanceTaskBody});
			}
			
			_debug('sending body to jobs api:');
			
			_debug(postObject);
			_debug(postObject.InputMediaAssets);

			unirest.post(_serviceEndpoint + '/API/Jobs')
			.headers({'Authorization' :'Bearer ' + access_token,
			'Accept': 'application/json;odata=verbose',
			'Content-Type' : 'application/json;odata=verbose',
			'x-ms-version': '2.2',
			'DataServiceVersion': '3.0'})
			.send(JSON.stringify(postObject))
			.end(function(response){

				if(response.error){
					_debug('recieved ERROR response from jobs');
					_debug(response.body);
					return callback({ message: 'error recieved from azure api', contents: response.body});
				}

				_debug('sucessfully started job!');
				return callback(null, response.body.d);
				
			});
		});

	});

};

Indexer.prototype.getAllJobs = function(callback){

	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, this._isInitialized === true, 'must call the initialize() function prior to calling this function');

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : this._mediaServicesAccountName,
		'client_secret' : this._mediaServicesKey,
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){
		if(!response.body.access_token){
			return callback({message:'fail to authenticate to azure ', content: response.body});
		}
		var access_token = response.body.access_token;

		unirest.get(_serviceEndpoint + '/API/Jobs')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json',
		'Content-Type' : 'application/json',
		'x-ms-version': '2.2',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){

			if(response.error){
				console.dir(response.body);
				return callback({message:'recieved error from azure', contents: response.body});
			}

			//return array of jobs
			return callback(null, response.body.value);

		});
	});
};

Indexer.prototype.deleteJob = function(jobId, callback){

	assert(true, jobId !== null || jobId !== undefined, 'must provide jobId');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : 'zillabytecrawler',
		'client_secret' : 'QKlJGROkJrwmI3XffnosGLZcFddTalCCcngi/XggI9w=',
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){

		if(!response.body.access_token){
			return callback({message:'fail to authenticate to azure ', content: response.body});
		}
		var access_token = response.body.access_token;

		unirest.delete(_serviceEndpoint + '/API/Jobs(\'' + jobId +'\')')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json;odata=verbose',
		'Content-Type' : 'application/json;odata=verbose',
		'x-ms-version': '2.2',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){

			if(response.error){
				_debug(response.body);
				return callback({message:'recieved error from azure', contents: response.body});
			}

			return callback(null, {message: 'sucessfully deleted job ' + jobId});
		});
	});

};

Indexer.prototype.getJob = function(jobId, callback){

	assert(true, jobId !== null || jobId !== undefined, 'must provide jobId');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, this._isInitialized === true, 'must call the initialize() function prior to calling this function');

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : this._mediaServicesAccountName,
		'client_secret' : this._mediaServicesKey,
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){
		if(!response.body.access_token){
			return callback({message:'fail to authenticate to azure ', content: response.body});
		}
		var access_token = response.body.access_token;

		unirest.get(_serviceEndpoint + '/API/Jobs(\'' + jobId +'\')')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json',
		'Content-Type' : 'application/json',
		'x-ms-version': '2.2',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){

			if(response.error){
				console.dir(response.body);
				return callback({message:'recieved error from azure', contents: response.body});
			}

			//return array of jobs
			return callback(null, response.body);

		});
	});
};

Indexer.prototype.cancelJob = function(jobId, callback){
	assert(true, jobId !== null || jobId !== undefined, 'must provide jobId');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : 'zillabytecrawler',
		'client_secret' : 'QKlJGROkJrwmI3XffnosGLZcFddTalCCcngi/XggI9w=',
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){

		if(!response.body.access_token){
			return callback({message:'fail to authenticate to azure ', content: response.body});
		}
		var access_token = response.body.access_token;

		unirest.get(_serviceEndpoint + '/API/CancelJob?jobid=\'' + encodeURIComponent(jobId) + '\'')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json;odata=verbose',
		'Content-Type' : 'application/json;odata=verbose',
		'x-ms-version': '2.2',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){

			if(response.error){
				_debug(response.body);
				return callback({message:'recieved error from azure', contents: response.body});
			}

			return callback(null, {message: 'sucessfully cancelled job ' + jobId});
		});
	});
	
};

Indexer.prototype.getOutputAssetFiles = function(jobId, saveDirectory, callback){

	assert(true, jobId !== null || jobId !== undefined, 'must provide jobId');
	assert(true, callback !== null || callback !== undefined, 'must provide callback');
	assert(true, this._isInitialized === true, 'must call the initialize() function prior to calling this function');
	assert(true, fs.existsSync(saveDirectory), 'provided saveDirectory does not exist');

	var that = this;

	unirest.post(_authenticationEndpoint)
	.form({'grant_type' : 'client_credentials',
		'client_id' : 'zillabytecrawler',
		'client_secret' : 'QKlJGROkJrwmI3XffnosGLZcFddTalCCcngi/XggI9w=',
		'scope': 'urn:WindowsAzureMediaServices'
	})
	.end(function(response){

		if(!response.body.access_token){
			return callback({message:'fail to authenticate to azure ', content: response.body});
		}
		var access_token = response.body.access_token;

		unirest.get(_serviceEndpoint + '/API/Jobs(\'' + jobId +'\')')
		.headers({'Authorization' :'Bearer ' + access_token,
		'Accept': 'application/json;odata=verbose',
		'Content-Type' : 'application/json;odata=verbose',
		'x-ms-version': '2.2',
		'DataServiceVersion': '3.0',
		'MaxDataServiceVersion' : '3.0'})
		.end(function(response){

			if(response.error){
				_debug(response.body);
				_debug(response.error);
				return callback({message:'recieved error from azure', contents: response.body});
			}

			console.dir(response.body);
			console.dir(response.body.d.OutputMediaAssets.__deferred.uri);
			unirest.get(response.body.d.OutputMediaAssets.__deferred.uri)
			.headers({'Authorization' :'Bearer ' + access_token,
			'Accept': 'application/json;odata=verbose',
			'Content-Type' : 'application/json;odata=verbose',
			'x-ms-version': '2.2',
			'DataServiceVersion': '3.0',
			'MaxDataServiceVersion' : '3.0'})
			.end(function(response){

				if(response.error){
					console.dir(response.body);
					console.log(response.error);
					return callback({message:'recieved error from azure', contents: response.body.content});
				}

				_debug('OutputContainerInfo - ');
				_debug(response.body.d.results);
				_debug(response.body.d.results[0]);
				for(var i in response.body.d.results){
					console.dir(response.body.d);
					var uri = response.body.d.results[i].Uri;

					response.body.d.results[i].container_name = uri.split('/')[uri.split('/').length -1].trim();
				}
				
				var containerInfo = response.body.d.results[i];

				that._blobService.listBlobsSegmented(containerInfo.container_name, null, function(err, result, response){

					if(err){
						return console.error(err);
					}

					_debug('here is a list of the produced assets...');
					_debug(result);

					//result is an array of blob information. each element is mapped to an
					//instance of the async function passed as the second param
					//this will download the blobs asynchronously
					var savedFiles = [];
					async.each(result.entries, function(blobData, cb){
						_debug('getting blob...');
						that._blobService.getBlobToStream(containerInfo.container_name, blobData.name,
						fs.createWriteStream(path.join(saveDirectory, blobData.name)), function(error,result,response){

							if(error){
								return cb(error);
							}

							_debug('sucessfully saved ' + blobData.name);
							savedFiles.push(blobData.name);
							return cb();
						});
						}, function(err){
							if(err){
								return _debug(err);
							}
							_debug('sucessfully saved all blobs');
							return callback(null, {container: containerInfo, savedFiles: savedFiles});
						}
					);
				});

			});


		});
	});

};
module.exports = Indexer;
