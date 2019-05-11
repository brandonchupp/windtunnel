const port = 3000

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');
var five = require("johnny-five");
var board = new five.Board();

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
    board.on("ready", function() {
        const servo = five.Servo(2);

        // load cell
        this.i2cConfig();
        this.i2cWriteReg(0x2A, 0x12, 0xA, function(bytes) {
        });
        this.i2cRead(0x2A, 0x12, 0x8, function(bytes) {
            const buf = Buffer.from(bytes);
            var reading = buf.readUIntBE(0,3);
            // handling overflow from negative
            if (reading >= 0x800000){
                reading -= 0xFFFFFF;
            }
            // CALIBRATE READING HERE
			socket.emit('drag', reading);
        });
        
        // pressure sensor
        var pressure = five.Sensor("A0");
        pressure.on("change", function(value) {
			socket.emit('static_pressure', value);
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
            const SERVO_CENTER = 90;
            // The servo has values from 40 to 140
            servo.to((attack_angle * (50/25) + 90));
            console.log(`Attack Angle set to ${value}`);
        });
        
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
});

server.listen(port, () => {
    console.log('Server started...')
    console.log(`Wind Tunnel GUI is accessible from your browser at localhost:${port}`);
});