const port = 3000;
const DEV_MODE = true;

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const ejs = require('ejs');
var five = require("johnny-five");

const STATIC_FILES = [
    ['/js/bootstrap', '/node_modules/bootstrap/dist/js'],
    ['/js/jquery', '/node_modules/jquery/dist'],
    ['/css/bootstrap', '/node_modules/bootstrap/dist/css']
]

var recording = false;
var fan_speed = 0;
var attack_angle = 0;
var velocity = 0;
var temp = 0;
var baro_pressure = 0;
var recorded_data = {
    'static_pressure': [],
    'dynamic_pressure': [],
    'total_pressure': [],
    'lift': [],
    'drag': [],
    'velocity': []
}
const ATTACK_ANGLE_MIN = -25;
const ATTACK_ANGLE_MAX = 25;
const FAN_SPEED_MIN = 0;
const FAN_SPEED_MAX = 100;
var lift = 0;
var drag = 0;
var drag_tare = 0;
var lift_tare = 0;
var dynamic_pressure = 0;
var static_pressure = 0;
var total_pressure = 0;


function isNumber(n) {
    // Validates that a value n is a number
    return !isNaN(parseFloat(n)) && isFinite(n);
}

app.use(express.static(__dirname + '/static'));

STATIC_FILES.forEach((value) => {
    app.use(value[0], express.static(__dirname + value[1]));
});

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

let initSocket = (servo) => {
    var prompt_velocity = true;

    io.on('connection', function(socket) {
        // Initialize readings to zero
        socket.emit('drag', 0);
        socket.emit('lift', 0);
        socket.emit('velocity', 0);
        socket.emit('static_pressure', 0);
        socket.emit('total_pressure', 0);


        function velocity_set() {
            // Formula from:
            // github.com/brandonchupp/windtunnel/issues/2#issuecomment-518896932
            velocity = 1096.2 * Math.sqrt(
                (dynamic_pressure * 27.6799)/
                (1.325 * baro_pressure / (temp + 460))
            );
            socket.emit('velocity', velocity);
            if (recording) {
                recorded_data['velocity'].push(velocity);
            }
        }

        if (prompt_velocity) {
            socket.emit('prompt_velocity');
        }
        socket.on('velocity_set', function(dict) {
            prompt_velocity = false;
            temp = dict['temp'];
            baro_pressure = dict['pressure'];
            velocity_set();
        });


        // Continuously update the results of recording
        setInterval(function() {
            socket.emit('update_record', recorded_data);
        }, 500);

        if (DEV_MODE) {
            setInterval(function() {
                lift = Math.random() - lift_tare;
                drag = Math.random() - drag_tare;
                static_pressure = Math.random();
                total_pressure = Math.random();
                dynamic_pressure = total_pressure - static_pressure;
                socket.emit('lift', lift);
                socket.emit('drag', drag);
                socket.emit('static_pressure', static_pressure);
                socket.emit('total_pressure', total_pressure);
                if (!prompt_velocity) {
                    velocity_set();
                }
                if (recording) {
                    recorded_data['drag'].push(drag - drag_tare);
                    recorded_data['lift'].push(lift - lift_tare);
                    recorded_data['static_pressure'].push(static_pressure);
                    recorded_data['dynamic_pressure'].push(total_pressure - static_pressure);
                    recorded_data['total_pressure'].push(total_pressure);
                    socket.emit('update_record', recorded_data);
                }
            }, 1000);
        } else {
            // Some functionality requires the board and won't work if
            // it isn't available.

            // load cell
            board.i2cConfig();
            board.i2cWriteReg(0x2A, 0x12, 0xA, function(bytes) {});
            board.i2cRead(0x2A, 0x12, 0x8, function(bytes) {
                const buf = Buffer.from(bytes);
                drag = buf.readUIntBE(0,3);
                lift = buf.readUIntBE(0,6);
                // handling overflow from negative
                if (drag >= 0x800000){
                    drag -= 0xFFFFFF;
                }
                if (lift >= 0x800000){
                    lift -= 0xFFFFFF;
                }
                // CALIBRATE READING HERE
                socket.emit('drag', drag - drag_tare);
                if (recording) {
                    recorded_data['drag'].push(drag - drag_tare);
                }

                // pressure sensor
                var static_pressure_sensor = five.Sensor("A0");
                static_pressure_sensor.on("change", function(value) {
                    // Numbers were chosen because of the given conversion to psi from mV 1024
                    // is the voltage ratio, and the other numbers are in the given formula
                    static_pressure = Math.round((value*15.76/1024 + 1.54)*1000)/1000;

                    socket.emit('static_pressure', static_pressure);

                    if (recording) {
                        recorded_data['static_pressure'].push(static_pressure);
                        socket.emit('update_record', recorded_data);
                    }
                });

                var total_pressure_sensor = five.Sensor("A1");
                total_pressure_sensor.on("change", function(value) {
                    total_pressure = Math.round((value*15.76/1024 + 1.54)*1000)/1000;
                    dynamic_pressure = total_pressure - static_pressure;

                    socket.emit('total_pressure', total_pressure);
                    if (recording) {
                        recorded_data['total_pressure'].push(total_pressure);
                        socket.emit('update_record', recorded_data);
                    }
                });

            });
        }

        socket.on('toggle_record', () => {
            recording = !recording;
        });

        socket.on('drag_tare', () => {
            // Tare the drag to make it zero
            drag_tare = drag - drag_tare;
            console.log(`Taring drag ${drag_tare}`);
        });

        socket.on('lift_tare', () => {
            // Tare the lift to make it zero
            lift_tare = lift - lift_tare;
            console.log(`Taring lift to ${lift_tare}`);
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
            if (!DEV_MODE) {
                servo.to((attack_angle * (50/25) + SERVO_CENTER));
            }
            console.log(`Attack Angle set to ${value}`);
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
            velocity_set();
            console.log(`Fan Speed set to ${value}`);
        });
    });
}


if (!DEV_MODE) {
    var board = new five.Board();
    board.on("ready", function() {
        const servo = five.Servo(2);
        initSocket(servo);
    });
} else {
    initSocket();
}

server.listen(port, () => {
    console.log('Server started...')
    console.log(`Wind Tunnel GUI is accessible from your browser at localhost:${port}`);
});
