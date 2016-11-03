var coap        = require('coap')
, bl   = require('bl')


var interval 

var requestCallback = function(){

  var MongoClient = require('mongodb').MongoClient
  var assert = require('assert')
  var ObjectId = require('mongodb').ObjectID
  var dbURL = 'mongodb://localhost:27017/FIT5140'

  MongoClient.connect(dbURL, function(err, db) {
    assert.equal(null, err)
      // fetch documents from database to get all avaliable devices in the network
      var col = db.collection('devices')
      col.find().toArray(function(err,documents) {
        assert.equal(null, err) 
        var rooms = []
        rooms = documents
        // Send fetch request to each avaliable devices
        for (var i = 0; i < rooms.length; i++) {
          var req = coap.request("coap://"+ rooms[i].ip +"/fetch")
          console.log("coap://"+ rooms[i].ip +"/fetch")
          var device = rooms[i]
          req.setOption('Accept','application/json')
          req.on('response', function(res) {
            console.log('response code', res.code)
            if (res.code !== '2.05')
              return process.exit(1)
            // Change payload data into the format which will be stored in the database
            // From JSON script in node_coap examples
            res.pipe(bl(function(err, data) {
              var json = JSON.parse(data)

              // fetched data
              var temperatureArray = json.temperature
              var liquidArray = json.liquid
              var humidityArray = json.humidity

              //used to stored formatted records
              var temperatureRecords=[]
              var liquidRecords=[]
              var humidityRecords=[]

              // format data with necessary information
              for (var j = temperatureArray.length - 1; j >= 0; j--) {
                var record = {room:device.room,time:new Date(temperatureArray[j].time),value:temperatureArray[j].value}
                temperatureRecords.push(record)
              }
              for (var j = liquidArray.length - 1; j >= 0; j--) {
                var record = {room:device.room,time:new Date(liquidArray[j].time),value:liquidArray[j].value}
                liquidRecords.push(record)
              }
              for (var j = humidityArray.length - 1; j >= 0; j--) {
                var record = {room:device.room,time:new Date(humidityArray[j].time),value:humidityArray[j].value}
                humidityRecords.push(record)
              }

              // insert data into database
              db.collection("temperature").insertMany(temperatureRecords,function(err,r){
                db.collection("liquid").insertMany(liquidRecords,function(err,r) {
                  db.collection("humidity").insertMany(humidityRecords,function(err,r) {
                    db.close()
                  })
                })
              })   

            }))
})

// send request
req.end()
}
})
})
console.log(new Date().toString() +'fetch done')
}
interval = setInterval(requestCallback,10000)




