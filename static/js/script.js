const ATTACK_ANGLE_MIN = -25;
const ATTACK_ANGLE_MAX = 25;
const FAN_SPEED_MIN = 0;
const FAN_SPEED_MAX = 100;
const DECIMAL_PLACES = 5;

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
      $('#' + id).html(value.toFixed(DECIMAL_PLACES));
    });
}


$(document).ready(() => {
    var socket = io();
    var dynamic = 0;
    var static = 0;
    var total = 0;
    var recording_data = {}


    socket.on('prompt_velocity', () => {
        $('#velocity_modal').modal('show');
        $("#velocity_modal").on('hide.bs.modal', () => {
            var temp = parseFloat($('#velocity_temp').val());
            var pressure = parseFloat($('#velocity_pressure').val());
            socket.emit('velocity_set', {
                'temp': temp,
                'pressure': pressure
            });
        });
    });

    socket.on('velocity', (value) => {
        // parseFloat removes trailing zeros
        if (DECIMAL_PLACES) {
            $('#velocity').html(parseFloat(value.toFixed(DECIMAL_PLACES)));
        }
    });

    socket.on('total_pressure', function(new_total){
        total = new_total;
        dynamic = total - static;
        $('#total_pressure').html(total.toFixed(DECIMAL_PLACES));
        $('#dynamic_pressure').html(dynamic.toFixed(DECIMAL_PLACES));
    });

    socket.on('static_pressure', function(new_static){
        static = new_static;
        dynamic = total - static;
        $('#static_pressure').html(static.toFixed(DECIMAL_PLACES));
        $('#dynamic_pressure').html(dynamic.toFixed(DECIMAL_PLACES));
    });

    socket.on('update_record', function(data) {
        recording_data = data;
        $('#lift_results').html(data['lift'].join(', '));
        $('#drag_results').html(data['drag'].join(', '));
        $('#dynamic_pressure_results').html(data['dynamic_pressure'].join(', '));
        $('#static_pressure_results').html(data['static_pressure'].join(', '));
        $('#total_pressure_results').html(data['total_pressure'].join(', '));
        $('#velocity_results').html(data['velocity'].join(', '));
    });

    init_readout(socket, 'drag');
    init_readout(socket, 'lift');

    var downloadable_titles = [
        'lift',
        'drag',
        'dynamic_pressure',
        'static_pressure',
        'total_pressure',
        'velocity'
    ];

    downloadable_titles.forEach((title) => {
        $('#download_' + title).on('click', () => {
            csvContent = recording_data[title].join(',');
            var pom = document.createElement('a');
            var blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
            var url = URL.createObjectURL(blob);
            pom.href = url;
            pom.setAttribute('download', title + '.csv');
            pom.click();
        });
    });

    $('#record').on('click', () => {
        socket.emit('toggle_record');
        location.reload();
    });

    $('#drag_tare').on('click', () => {
        socket.emit('drag_tare');
    });

    $('#lift_tare').on('click', () => {
        socket.emit('lift_tare');
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
            socket.emit('fan_speed', value);

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
            socket.emit('attack_angle', value);
        }
    });
});