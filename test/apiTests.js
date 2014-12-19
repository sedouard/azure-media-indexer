/// <reference path="../lib/eventful-node.d.ts"/>
var assert = require("assert");
var path = require('path');
var fs = require('fs');
verifyEnvironment();
var Indexer = require('../lib/index.js');
var indexer = new Indexer(process.env.MEDIASERVICES_ACCOUNT_NAME,
  process.env.MEDIASERVICES_ACCOUNT_KEY, process.env.STORAGE_ACCOUNT_NAME,
  process.env.STORAGE_ACCOUNT_KEY, true);

var videoFile = process.env.TEST_VIDEO_FILE;



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

  describe('createAsset startJob', function(){
    it('should not give an error object signaling a sucessful asset upload and creation', function(done){
      

      indexer.createAsset(process.env.TEST_VIDEO_FILE, path.basename(process.env.TEST_VIDEO_FILE), 
        function(err, data){
      
          console.dir(err);
          assert.equal(true, (err === null));
          
          //basic check, see if we have any events
          assert.equal(true, (data !== null));
          assert.equal(true, (typeof data.Id === 'string' && data.Id !== null));
          assert.equal(true, (typeof data.State === 'number' && data.State !== null));
          assert.equal(true, (data.StorageAccountName === process.env.STORAGE_ACCOUNT_NAME && data.StorageAccountName !== null));
          assert.equal(true, (typeof data.Uri === 'string' && data.Uri !== null));
          console.dir(data);

          indexer.startJob('unitTestJob', [data.Id], function(err,data){

            console.dir(data);
            assert.equal(true, (err === null));
            assert.equal(true, (data.Name === 'unitTestJob'));
            assert.equal(true, (typeof data.Id === 'string'));
            assert.equal(true, (typeof data.State === 'number'));
            done();
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
              assert.equal(true, (typeof data.State === 'number' && data.State !== null));
              done();
            });
      });
    });
  });

  describe('#getOutputAssetFiles()', function(){
    it('getAllJobs should return all jobs and getJob should return one given an Id', function(done){
      

      indexer.getOutputAssetFiles('nb:jid:UUID:10a3fb4a-c902-4a44-b56d-13b46c8fa64f', '', function(err, data){

        //basic check, see if we have any events
        assert.equal(true, (data !== null));
        assert.equal(true, (typeof data.Id === 'string' && data.Id !== null));
        assert.equal(true, (typeof data.State === 'number' && data.State !== null));
        assert.equal(true, (data.StorageAccountName === process.env.STORAGE_ACCOUNT_NAME && data.StorageAccountName !== null));
        assert.equal(true, (typeof data.Uri === 'string' && data.Uri !== null));
        console.dir(data);

        //check that all produced assets were created
        var files = fs.readdirSync('');
        //flag for each file type we're looking for
        var smi = false;
        var aib = false;
        var info = false;
        var xml = false;
        var ttml = false;

        //validate each file type exists in this directory
        for(var i in files){
          if(path.extname(files[i]) === '.xml'){
            xml = true;

            fs.unlink(files[i], function (err) {
              if (err) throw err;
              console.log('successfully deleted ' + file[i]);
            });
          }
          else if(path.extname(files[i] === '.aib')){
            aib = true;
            fs.unlink(files[i], function (err) {
              if (err) throw err;
              console.log('successfully deleted ' + file[i]);
            });
          }
          else if(path.extname(files[i] === '.smi')){
            smi = true;
            fs.unlink(files[i], function (err) {
              if (err) throw err;
              console.log('successfully deleted ' + file[i]);
            });
          }
          else if(path.extname(files[i] === '.info')){
            info = true;
            fs.unlink(files[i], function (err) {
              if (err) throw err;
              console.log('successfully deleted ' + file[i]);
            });
          }
          else if(path.extname(files[i] === '.ttml')){
            ttml = true;
            fs.unlink(files[i], function (err) {
              if (err) throw err;
              console.log('successfully deleted ' + file[i]);
            });
          }
        }

        try{
          assert.equal(true, smi, 'missing smi file');
          assert.equal(true, xml, 'missing xml file');
          assert.equal(true, aib, 'missing aib file');
          assert.equal(true, info, 'missing info file');
          assert.equal(true, ttml, 'missing ttml file');
        }
        finally{

        }


        done();
      });
    });
  });
});


