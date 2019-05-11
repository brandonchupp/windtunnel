//var five = require("johnny-five");
//var board = new five.Board();

const port = 3000

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');

var recording = false;
var fan_speed = 0;
var attack_angle = 0;
const ATTACK_ANGLE_MIN = -25;
const ATTACK_ANGLE_MAX = 25;
const FAN_SPEED_MIN = 0;
const FAN_SPEED_MAX = 100;


function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}


app.use(express.static(__dirname + '/static'));
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('pages/index', {
        attack_angle: attack_angle,
        fan_speed: fan_speed,
        page: 'control',
        recording: recording,
        title: 'Wind Tunnel',
        year: new Date().getFullYear()
    });
});

app.get('/results/', function(req, res) {
    res.render('pages/results', {
        attack_angle: attack_angle,
        fan_speed: fan_speed,
        page: 'results',
        recording: recording,
        title: 'Wind Tunnel - Results',
        year: new Date().getFullYear()
    });
});

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
    });

    socket.on('toggle_record', () => {
        recording = !recording;
    });

    socket.on('fan_speed', (value) => {
        if (!isNumber(value)) {
            value = FAN_SPEED_MIN;
        } else if (parseFloat(value) > FAN_SPEED_MAX) {
            value = FAN_SPEED_MAX;
        } else if (parseFloat(value) < FAN_SPEED_MIN) {
            value = FAN_SPEED_MIN;
        }
        fan_speed = value;
        console.log(`Fan Speed set to ${value}`);
        socket.emit('total_pressure', 10.20, 11)
    });

    socket.on('attack_angle', (value) => {
        if (!isNumber(value)) {
            value = ATTACK_ANGLE_MIN;
        } else if (parseFloat(value) > ATTACK_ANGLE_MAX) {
            value = ATTACK_ANGLE_MAX;
        } else if (parseFloat(value) < ATTACK_ANGLE_MIN) {
            value = ATTACK_ANGLE_MIN;
        }
        attack_angle = value;
        console.log(`Attack Angle set to ${value}`);
    });
});

server.listen(port, () => {
    console.log('Server started...')
    console.log(`Wind Tunnel GUI is accessible from your browser at localhost:${port}`);
});


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