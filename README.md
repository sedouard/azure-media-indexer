# Azure Media Services Indexer

![BuildStatus](https://travis-ci.org/sedouard/azure-media-indexer.svg)

This is a client library for the Azure Media Services Indexer, a nifty service that allows you to convert videos to indexable text. You can do things like find keywords in videos and even do automated captioning.

This library currently allows for a subset of video processing -- indexing a video for key phrases -- offered by the public [Azure Media Services REST api](http://msdn.microsoft.com/en-us/library/azure/hh973617.aspx).

## Getting Started


### Installing
As usual, to install this package just do:

```
npm install azure-media-indexer
```

### Initializing

```js
var Indexer = require('azure-media-indexer');
var indexer = new Indexer(process.env.MEDIASERVICES_ACCOUNT_NAME,
  process.env.MEDIASERVICES_ACCOUNT_KEY, process.env.STORAGE_ACCOUNT_NAME,
  process.env.STORAGE_ACCOUNT_KEY);
	
indexer.initialize( 
  function(err, data){
      
  console.dir(err);
  assert.equal(true, (err === null));
  // continue using library...
});
```
## Uploading a video asset

An asset is a [storage container](http://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-blob-storage/) which represents your input video file. To upload a video asset just call the `createAsset` function with the path of your video:

```js
indexer.createAsset('path-to-video-file.mp4', 'name-of-the-asset-video-in-cloud.mp4', 
        function(err, data){
        
	  console.log('created video asset with id: ' + data.Id);
	}
);
```
The API returns a container information object which contains the asset id. This is important for creating jobs and you should save this.

## Creating a New Job

A job can take up to 50 assets and index them for keywords. Although the REST Api can do more types of processing besides keyword indexing, this client library hasn't implemented that.

To create a job for indexing your uploaded videos, pick a new name for your job (it doesn't have to be unique) and pass in an array of jobId strings as the second parameter:

```js
indexer.startJob('myNewJob', [data.Id], 
	function(err,data){


            assert.equal(true, (err === null), 'failed to start job');
            
		console.log('Started new job with jobid: ' + data.Id);
 	}
 )
```

## Canceling a job

Canceling a job requires the jobId of the job to cancel:

```js
indexer.cancelJob(jobId, function(err,data){
	function(err,data){


            assert.equal(true, (err === null), 'failed to start job');
            
		console.log('Started new job with jobid: ' + jobId);
 	}
 )
```

## Getting Job Information

To get the status of a job (because they do take a while) you can use `getAllJobs` and `getJob`.

To get all your jobs (up to 1000 jobs):

```js
indexer.getAllJobs( 
        function(err, data){
          console.dir(err);
          assert.equal(true, (err === null));
          
	   for(var i in data){
	   	console.log('Found job ' + data[i].Name + ' with status ' + data[i].State);
	   }
       }
 );
```
To get a particular job:

```js
indexer.getJob('your-jobId',
            function(err, data){
            		assert.equal(true, (err === null));
            		console.log('Found job ' + data.Name + ' with status ' + data.State);
            }
);
```
The `State` property on the job object can be decoded by this list, where 0 is `Queued` and 6 is `Cancelling`:

```js
var jobState =[
    "Queued",
    "Scheduled",
    "Processing",
    "Finished",
    "Error",
    "Canceled",
    "Cancelling"
];
```

## Canceling and Deleting Jobs

To cancel a job you can use `cancelJob`. You'll have to provide the jobId you'd like to cancel:

```js
indexer.cancelJob(jobId, function(err,data){

      assert.equal(true, (err === null), 'could not cancel job');
      console.log('Successfully cancelled job!');
    }
);
```

To delete the job, which removes it from the internal Media Services database, you can call `deleteJob`:

```js
indexer.deleteJob(jobId, function(err,data){

  assert.equal(true, (err === null), err);
  console.log('Successfully deleted job!');

});
```

## Downloading Your Captioning Files

The indexer spits out a variety of files which are different versions of the keywords, phrases and sentences picked up in the video. These files are stored the output container for the job. To get the files from the output container for a particular job call the `getOutputAssetFiles` function:

```js
indexer.getOutputAssetFiles('your-job-id', '/Your/Output/Directory', function(err, data){

  assert.equal(true, (data !== null));
              
  console.log('Downloaded the following output files from the job:');
  for(var i in data.savedFiles){
    console.log(data.savedFiles[i]);
  }
);
```

# Contributing

As always, contributions are always welcome. Please be sure to to accompany any changes with appropriate unit tests.

## Running The Tests

The tests require a few environment variables to get started. Generally I set these up in a shell script file and run the tests from there:

- MEDIASERVICES_ACCOUNT_NAME: The name of the media services account
- MEDIASERVICES_ACCOUNT_KEY: The key for the account
- STORAGE_ACCOUNT_NAME: The storage account associated with the media service
- STORAGE_ACCOUNT_KEY: The storage account key associated with the media service
- TEST_VIDEO_FILE: The video the tests should use. Check [here](http://msdn.microsoft.com/en-us/library/azure/dn535852.aspx) for information on supported formats.

To run the tests ensure that you have [grunt-cli](https://www.npmjs.com/package/grunt-cli) installed and from the root repository directory run:

```
grunt
```

The [mocha](https://www.npmjs.com/package/mocha) tests will Start, Cancel, and Delete a job. It will also upload a test video file to your storage account.
