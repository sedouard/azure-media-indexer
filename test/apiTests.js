/// <reference path="../lib/eventful-node.d.ts"/>
var assert = require("assert");
var path = require('path');
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
describe('createAsset', function(){
  describe('#searchEvents()', function(){
    it('should no error object signaling a sucessful asset upload and creation', function(done){
      

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

          done();
      });
    });
  });
});