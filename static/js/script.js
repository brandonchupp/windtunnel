const ATTACK_ANGLE_MIN = -25;
const ATTACK_ANGLE_MAX = 25;
const FAN_SPEED_MIN = 0;
const FAN_SPEED_MAX = 100;

function init_knob(id, options) {
    $('#' + id).knob({
        stopper: true,
        width: 180,
        height: 180,
        fgColor: '#0055b8',
        inputColor: '#0055b8',
        displayInput: true,
        ...options
    });
}

function init_readout(socket, id) {
    socket.on(id, function(value){
      $('#' + id).html(value);
    });
}

function build_pressure_breakdown(static, dynamic) {
    return `<div>Static Pressure: ${static} lbs</div><div>Dynamic Pressure: ${dynamic} lbs</div>`;
}

$(document).ready(() => {
    var socket = io();
    var dynamic = 0;
    var static = 0;

    $('#total_pressure').tooltip({
        html: true,
        title: build_pressure_breakdown(0, 0)
    });

    socket.on('dynamic_pressure', function(new_dynamic){
        dynamic = new_dynamic;
        $('#total_pressure').tooltip('dispose');
        $('#total_pressure').tooltip({
            html: true,
            title: build_pressure_breakdown(static, dynamic)
        });
        $('#total_pressure').html(static + dynamic);
    });

    socket.on('static_pressure', function(new_static){
        static = new_static;
        $('#total_pressure').tooltip('dispose');
        $('#total_pressure').tooltip({
            html: true,
            title: build_pressure_breakdown(static, dynamic)
        });
        $('#total_pressure').html(static + dynamic);
    });

    init_readout(socket, 'drag');
    init_readout(socket, 'lift');
    init_readout(socket, 'velocity');

    

    $('#record').on('click', () => {
        socket.emit('toggle_record');
        location.reload();
    });

    init_knob('fan_speed', {
        min: FAN_SPEED_MIN,
        max: FAN_SPEED_MAX,
        step: 1,
        angleArc: 250,
        angleOffset: -125,
        'format': (value) => {
             return value;
        },
        'release': (value) => {
            socket.emit('fan_speed', value)
        }
    });

    init_knob('attack_angle', {
        min: ATTACK_ANGLE_MIN,
        max: ATTACK_ANGLE_MAX,
        step: 1,
        angleArc: 250,
        angleOffset: -125,
        'format': (value) => {
             return value + '˚';
        },
        'release': (value) => {
            socket.emit('attack_angle', value)
        }
    });
});