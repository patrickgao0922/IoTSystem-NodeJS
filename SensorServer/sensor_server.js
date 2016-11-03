// Temperature and humadity sensors
const coap    = require('coap') // or coap
, server  = coap.createServer()
, tempFile = 'temperature.txt'
, humidityFile = 'humidity.txt'
, liquidFile = 'liquid.txt'
, fs = require('fs')
, files = [tempFile,humidityFile,liquidFile]

var interval
server.on('request', function(req, res) {

  var urlString = req.url

  var command = req.url.split('/')[1];
    // commands
    console.log(req.headers['Observe'])

  //fetch coap service
  if (req.headers['Observe'] !== 0) // No observe
  {
    clearInterval(interval)
    // fetch command
    if (command == 'fetch'){
         // Reading File-- Learning from Node.js Docs https://nodejs.org/api/fs.html
         var tempArray = []
         var humidityArray=[]
         var liquidArray=[]
         for (fileIndex = 0; fileIndex<files.length; fileIndex++){
          var fileContent = fs.readFileSync(files[fileIndex]).toString().split('\n')
          for (var i = 0; i < fileContent.length-1; i++) {
            var record = fileContent[i].split(',')
            var time = new Date(Date.parse(record[0]))
            var value = Number(record[1])
            var jsonObj = {time:time, value:value}

            if (fileIndex == 0) {
              tempArray.push(jsonObj)
            } else if (fileIndex == 1) {
              humidityArray.push(jsonObj)
            } else {
              liquidArray.push(jsonObj)
            }
          }
          fs.unlinkSync(files[fileIndex],function(){
            console.log("File is deleted")
          })
        }

        // generate response data as javascript Object
        var responseData = {temperature:tempArray,humidity: humidityArray,liquid:liquidArray}
        console.log(responseData)
        
        return res.end(JSON.stringify(responseData))
        
      }

      // get the latest data
      if (command == 'latest') {
        var tempObj
        var humidityObj
        var liquidObj
        for (fileIndex = 0; fileIndex<files.length; fileIndex++){
          var fileContent = fs.readFileSync(files[fileIndex]).toString().split('\n')
          var record = fileContent[fileContent.length-2].split(',')
          var time = new Date(Date.parse(record[0]))
          var value = Number(record[1])
          var jsonObj = {time:time, value:value}
          if (fileIndex == 0) {
            tempObj=jsonObj
          } else if (fileIndex == 1) {
            humidityObj=jsonObj
          } else {
            liquidObj=jsonObj
          }          
        }
        var jsonObj={temperature:tempObj,humidity: humidityObj,liquid:liquidObj}
        return res.end(JSON.stringify(jsonObj))
      }

    }

    // Observe
    interval = setInterval(function() {
      var tempObj
      var humidityObj
      var liquidObj
      for (fileIndex = 0; fileIndex<files.length; fileIndex++){
        var fileContent = fs.readFileSync(files[fileIndex]).toString().split('\n')
        var record = fileContent[fileContent.length-2].split(',')
        var time = new Date(Date.parse(record[0]))
        var value = Number(record[1])
        var jsonObj = {time:time, value:value}

        if (fileIndex == 0) {
          tempObj=jsonObj
        } else if (fileIndex == 1) {
          humidityObj=jsonObj
        } else {
          liquidObj=jsonObj
        }
      }
      var jsonObj={temperature:tempObj,humidity: humidityObj,liquid:liquidObj}
      res.write(JSON.stringify(jsonObj))
    }, 1000)
  })
server.listen(function() {
  console.log('server started')
})

