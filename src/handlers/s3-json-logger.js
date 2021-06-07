// initialise AWS sdk package
const AWS = require("aws-sdk");

// mapbox api packages
const mbxClient = require("@mapbox/mapbox-sdk");
const mbxDatasets = require("@mapbox/mapbox-sdk/services/datasets");

// initialise s3 api
const s3 = new AWS.S3();

// grab mapbox API from env variables. Specified in the template.yml
const MAPBOX_API = process.env.MAPBOX_SECRET_TOKEN;
// datasetId from existing dataset
const DATASET_ID = process.env.MAPBOX_DATASET_ID;
// specify the baseClient and the token
const baseClient = mbxClient({
  accessToken: MAPBOX_API,
});

// init the dataSet client
const datasetsClient = mbxDatasets(baseClient);

/**
 * A Lambda function that upload result of geojson file in s3 to mapbox account
 */
exports.s3JsonLoggerHandler = async (event, context) => {
  const getObjectRequests = event.Records.map(async (record) => {
    const params = {
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    };
    try {
      const data = await s3.getObject(params).promise();
      const parsedData = JSON.parse(data.Body);
      const featureArray = parsedData.features;

      // make API call in loop
      const batchCalls = featureArray.map(async (data, idx) => {
        console.log("ITEM", data);
        await datasetsClient
          .putFeature({
            datasetId: DATASET_ID,
            featureId: `${idx} - data.properties.item`,
            feature: data,
          })
          .send();
      });
      await Promise.all(batchCalls);
    } catch (err) {
      console.error("Error calling S3 getObject:", err);
      return await Promise.reject(err);
    }
  });
  return Promise.all(getObjectRequests).then(() => {
    console.debug("Complete!");
  });
};

/*  to do
- init mapbox api
- read from env variables
*/
