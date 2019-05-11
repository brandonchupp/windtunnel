//var five = require("johnny-five");
//var board = new five.Board();

const express = require('express')
const app = express()
const port = 3000

app.use(express.static(__dirname + '/Public'));
console.log(__dirname)

app.get('/', (req, res) => res.send('Hello World!'));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

// board.on("ready", function() {
//     var sensor = new five.Sensor("A0");

//     // When the sensor value changes, log the value
//     // sensor.on("change", function(value) {
//     //     console.log(value);
//     // });

//     // dynamic_pressure - real

//     // static_pressure - real

//     // lift - real

//     // drag - real

//     // attack_angle - real

//     // fan_speed


// });