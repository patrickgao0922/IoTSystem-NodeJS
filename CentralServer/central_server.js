const coap    = require('coap') // or coap
, server  = coap.createServer()

var MongoClient = require('mongodb').MongoClient
, assert = require('assert')
,dbURL = 'mongodb://localhost:27017/FIT5140'

var fs = require('fs');
server.on('request', function(req, res) {
  var urlString = req.url
  console.log(urlString)
  var resource = req.url.split('/')[1]

  if(resource == '')
  {
    return res.end('No URI\n')
  }

  // Different Resources
  if (resource == 'device'){
    // Learn from http://mongodb.github.io/node-mongodb-native/2.0/reference/crud/
    MongoClient.connect(dbURL, function(err, db) {
      assert.equal(null, err);
      var col = db.collection('devices');
      col.find({}).toArray(function(err, docs) {
        assert.equal(null, err)
        res.setOption('Content-Format', 'application/json')
        res.end(JSON.stringify(docs))
        db.close()
      })
    })  
  } else {


    MongoClient.connect(dbURL, function(err, db) {
      assert.equal(null, err);

      var query = urlString.split('/')[2]
      if (query !== undefined){
        var queryName = query.split('?')[0]
        console.log(queryName)
      }


      var col
    // specify different different sensor data
    if (resource == 'temperature') {

      col = db.collection('temperature')
      
    } else if (resource == 'humidity') {
      col = db.collection('humidity')
    } else {
      col = db.collection('liquid')
    }

    // function
    if (queryName == 'dailyaverage'){ // get daily average values
      var params = query.split('?')[1].split('&')
      var paramObjects = []
      for (i = 0;i<params.length;i++){
        paramObjects.push({paramName:params[i].split('=')[0],paramValue:params[i].split('=')[1]})
      }

      // parse dates to UTC
      var startDateYear = Number(paramObjects[0].paramValue.split('-')[0])
      var startDateMonth = Number(paramObjects[0].paramValue.split('-')[1])-1
      var startDateDay = Number(paramObjects[0].paramValue.split('-')[2])
      var startDate = new Date(startDateYear,startDateMonth,startDateDay)

      var endDateYear = Number(paramObjects[1].paramValue.split('-')[0])
      var endDateMonth = Number(paramObjects[1].paramValue.split('-')[1])-1
      var endDateDay = Number(paramObjects[1].paramValue.split('-')[2])
      var endDate = new Date(endDateYear,endDateMonth,endDateDay,23,59,59)

      var room = Number(paramObjects[2].paramValue)


      // Get aggregation results from database
      col.aggregate([
        { $match:{$and:[{time:{$gte:startDate}},
        {time:{$lte:endDate}},
        {room:room}]}},
        {$project:{
          month:{$month:"$time"},
          day:{$dayOfMonth:"$time"},
          value:"$value"

        }
      },
      {$group:{"_id":{month:"$month",day:"$day"},"average":{$avg:"$value"}}}
      ]).toArray(function(err,result){
        assert.equal(err, null);
        res.setOption('Content-Format', 'application/json')

        // Reparse result into response format
        var resultObject = []
        for (resultIndex=result.length-1;resultIndex>=0;resultIndex--){
          var month = result[resultIndex]._id.month
          var day = result[resultIndex]._id.day
          resultObject.push({month:month,day:day,value:result[resultIndex].average})
        }
        var responseObj = {datatype:resource,query:queryName,result:resultObject}
        console.log(responseObj)
        res.end(JSON.stringify(responseObj))
      })

    } else if (queryName == 'hourlyaverage') { // get hourly average values
      var params = query.split('?')[1].split('&')
      var paramObjects = []
      for (i = 0;i<params.length;i++){
        paramObjects.push({paramName:params[i].split('=')[0],paramValue:params[i].split('=')[1]})
      }
      var startDateYear = Number(paramObjects[0].paramValue.split('-')[0])
      var startDateMonth = Number(paramObjects[0].paramValue.split('-')[1])-1
      var startDateDay = Number(paramObjects[0].paramValue.split('-')[2])
      var startDate = new Date(startDateYear,startDateMonth,startDateDay)

      var endDateYear = Number(paramObjects[1].paramValue.split('-')[0])
      var endDateMonth = Number(paramObjects[1].paramValue.split('-')[1])-1
      var endDateDay = Number(paramObjects[1].paramValue.split('-')[2])



      var endDate = new Date(endDateYear,endDateMonth,endDateDay,23,59,59)

      var room = Number(paramObjects[2].paramValue)
      col.aggregate([
        { $match:{$and:[{time:{$gte:startDate}},
        {time:{$lte:endDate}},
        {room:room}]}
      },
      {
        $project:{
          month:{$month:"$time"},
          day:{$dayOfMonth:"$time"},
          hour:{$hour:"$time"},
          value:"$value"

        }
      },

      {$group:{"_id":{month:"$month",day:"$day",hour:"$hour"},"average":{$avg:"$value"}}}
      ]).toArray(function(err,result){
        assert.equal(err, null);
        res.setOption('Content-Format', 'application/json')
        var resultObject = []



        for (resultIndex=result.length-1;resultIndex>=0;resultIndex--){
          var recordHourString = result[resultIndex]._id.hour > 9 ? result[resultIndex]._id.hour+":00:00Z": "0" +result[resultIndex]._id.hour+":00:00Z"
          var recordDayString=result[resultIndex]._id.day > 9 ? ""+result[resultIndex]._id.day : "0" +result[resultIndex]._id.day
          var reocrdMonthString = result[resultIndex]._id.month > 9 ? ""+result[resultIndex]._id.month : "0" +result[resultIndex]._id.month



          recordDateString = "2015-"+reocrdMonthString+"-"+recordDayString+"T"+recordHourString
          console.log(recordDateString)
          var recordDate=new Date(recordDateString)
          console.log(recordDate)

          resultObject.push({month:recordDate.getMonth()+1,day:recordDate.getDate(),hour:recordDate.getHours(),value:result[resultIndex].average})
        }
        var responseObj = {datatype:resource,query:queryName,result:resultObject}

        console.log(responseObj)
        res.end(JSON.stringify(responseObj))
      })
} else if (queryName=='eariestdate'){
  col.aggregate([
    {$group:{"_id":null,"min":{$min:"$time"}}}
    ]).toArray(function(err,result){
      assert.equal(err, null)

      var date = result[0].min

      res.setOption('Content-Format', 'application/json')

      res.end(JSON.stringify({datatype:resource,date:date}))
    })
  }

})

}

})


server.listen(function() {
  console.log('server started')
})

