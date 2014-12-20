/// <reference path="../lib/eventful-node.d.ts"/>
var assert = require("assert");
var path = require('path');
var fs = require('fs');
var async = require('async');
verifyEnvironment();
var Indexer = require('../lib/index.js');
var indexer = new Indexer(process.env.MEDIASERVICES_ACCOUNT_NAME,
  process.env.MEDIASERVICES_ACCOUNT_KEY, process.env.STORAGE_ACCOUNT_NAME,
  process.env.STORAGE_ACCOUNT_KEY, true);

var videoFile = process.env.TEST_VIDEO_FILE;

//FROM http://msdn.microsoft.com/en-us/library/azure/hh974289.aspx#create_a_job
var jobState =[
    "Queued",
    "Scheduled",
    "Processing",
    "Finished",
    "Error",
    "Canceled",
    "Cancelling"
];

function verifyEnvironment(){
  var apiKeyMessage = "Must set the environment variable: ";

  assert.equal(true, process.env.MEDIASERVICES_ACCOUNT_NAME !== undefined, apiKeyMessage + ' MEDIASERVICES_ACCOUNT_NAME');
  assert.equal(true, process.env.MEDIASERVICES_ACCOUNT_KEY !== undefined, apiKeyMessage + ' MEDIASERVICES_ACCOUNT_KEY');
  assert.equal(true, process.env.STORAGE_ACCOUNT_NAME !== undefined, apiKeyMessage + ' STORAGE_ACCOUNT_NAME');
  assert.equal(true, process.env.STORAGE_ACCOUNT_KEY !== undefined, apiKeyMessage + ' STORAGE_ACCOUNT_KEY');
  assert.equal(true, process.env.TEST_VIDEO_FILE !== undefined, apiKeyMessage + ' TEST_VIDEO_FILE');

  console.log('Test Environment Settings:');
  console.log('MEDIASERVICES_ACCOUNT_NAME: ' + process.env.MEDIASERVICES_ACCOUNT_NAME);
  console.log('MEDIASERVICES_ACCOUNT_KEY: ' + process.env.MEDIASERVICES_ACCOUNT_KEY);
  console.log('STORAGE_ACCOUNT_NAME: ' + process.env.STORAGE_ACCOUNT_NAME);
  console.log('STORAGE_ACCOUNT_KEY: ' + process.env.STORAGE_ACCOUNT_KEY);
}
describe('Indexer', function(){

  describe('#initialize()', function(){
    it('initialize should return with no error and properly find the right azure media enpoint', function(done){
      

      indexer.initialize( 
        function(err, data){
      
          console.dir(err);
          assert.equal(true, (err === null));
          done();
      });
    });
  });

  describe('createAsset startJob canceljob deletejob', function(){
    it('should not give an error object signaling a sucessful asset upload and creation', function(done){
      

      indexer.createAsset(process.env.TEST_VIDEO_FILE, path.basename(process.env.TEST_VIDEO_FILE), 
        function(err, data){
      
          console.dir(err);
          assert.equal(true, (err === null));
          
          //basic check, see if we have any events
          assert.equal(true, (data !== null), 'could not create asset');
          assert.equal(true, (typeof data.Id === 'string' && data.Id !== null));
          assert.equal(true, (typeof data.State === 'number' && data.State !== null));
          assert.equal(true, (data.StorageAccountName === process.env.STORAGE_ACCOUNT_NAME && data.StorageAccountName !== null));
          assert.equal(true, (typeof data.Uri === 'string' && data.Uri !== null));
          console.dir(data);


          indexer.startJob('unitTestJob', [data.Id], function(err,data){

            console.dir(data);
            assert.equal(true, (err === null), 'failed to start job');
            assert.equal(true, (data.Name === 'unitTestJob'));
            assert.equal(true, (typeof data.Id === 'string'));
            assert.equal(true, (typeof data.State === 'number'));

            //now cancel the job
            var jobId = data.Id;
            console.log('job id = ' + jobId);
            indexer.cancelJob(jobId, function(err,data){
              console.dir(err);
              assert.equal(true, (err === null), 'could not cancel job');

              indexer.deleteJob(jobId, function(err,data){
                console.dir(err);
                assert.equal(true, (err === null), err);
                done();
              });
            });
            

          });
      });
    });
  });

  describe('jobs', function(){
    it('getAllJobs should return all jobs and getJob should return one given an Id', function(done){
      

      indexer.getAllJobs( 
        function(err, data){
      
          console.dir(err);
          assert.equal(true, (err === null));
          
          //basic check, see if we have any jobs. we should have at least 1
          console.dir(data);
          assert.equal(true, (Object.prototype.toString.call(data) === '[object Array]'));
          assert.equal(true, (typeof data[0].Id === 'string' && data[0].Id !== null));
          assert.equal(true, (typeof data[0].State === 'number' && data[0].State !== null));
          
          indexer.getJob(data[0].Id,
            function(err, data){

              console.dir(err);
              assert.equal(true, (err === null));

              console.dir(data);
              assert.equal(true, (Object.prototype.toString.call(data) === '[object Object]'));
              assert.equal(true, (typeof data.Id === 'string' && data.Id !== null));
              assert.equal(true, (typeof data.Name === 'string' && data.Name !== null));
              assert.equal(true, (typeof data.State === 'number' && data.State !== null));
              done();
            });
      });
    });
  });

  describe('#getOutputAssetFiles()', function(){
    it('getOutputAssetFiles download all blobs in the output asset container and return the output container info', function(done){
      
      indexer.getAllJobs( 
        function(err, data){
      
          console.dir(err);
          assert.equal(true, (err === null));
          
          //basic check, see if we have any jobs. we should have at least 1
          console.dir(data);
          assert.equal(true, (Object.prototype.toString.call(data) === '[object Array]'));
          assert.equal(true, (typeof data[0].Id === 'string' && data[0].Id !== null));
          assert.equal(true, (typeof data[0].Name === 'string' && data[0].Name !== null));
          assert.equal(true, (typeof data[0].State === 'number' && data[0].State !== null));
          
          var completedJob = null;
          for(var i in data){
            if(jobState[data[i].State] === "Finished"){
              //we just need one finished job
              completedJob = data[i];
              break;
            }
          }
          if(completedJob){
            indexer.getOutputAssetFiles(data[0].Id, '', function(err, data){

              assert.equal(true, (data !== null));
              assert.equal(true, (typeof data.container.Id === 'string' && data.container.Id !== null));
              assert.equal(true, (data.container.StorageAccountName === process.env.STORAGE_ACCOUNT_NAME && data.container.StorageAccountName !== null));
              assert.equal(true, (typeof data.container.Uri === 'string' && data.container.Uri !== null));
              console.dir(data);

              for(var i in data.savedFiles){
                assert(true, fs.existsSync(data.savedFiles[i]));
              }
              done();
            });
          }
          else{
            assert(true, foundAtLeastOneCompletedJob !== null, 'Did not find any completed jobs to test getting assets');
            done();
          }
          
          
        });
        
      });
    });

});


