/*

 Ika prototype
 version < 1.0

.

 Copyright (c) 2015, Aeva M. Palecek

 Ika is free software: you can redistribute it and/or modify it under
 the terms of the GNU General Public License as published by the Free
 Software Foundation, either version 3 of the License, or (at your
 option) any later version. See https://www.gnu.org/licenses/gpl.txt
 for more information.
 
 Ika is distributed in the hope that it will be useful, but WITHOUT
 ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 for more details.

 Art assets included with Ika, unless stated otherwise, are made
 available to you under the terms of the Creative Commons Attribution
 Share-Alike License version 4.0 or newer.  For more details, see
 http://creativecommons.org/licenses/by-sa/4.0/

 Have a nice day ^_^
 
*/

"use strict";


// [+] please.radians(degrees)
//
// Converts from degrees to radians.
//
// - **degrees** An angular value expressed in dgersee.
//
var radians = function (degrees) {
    return degrees*(Math.PI/180);
};


// linear interpoltaion function
var mix = function (lhs, rhs, a) {
    return lhs + a*(rhs-lhs);
};


// local namespace
var ika = {
    "player" : {
        "location" : [-4.5, 6.5, 0],
        "rotation_z" : 180,
    },
    "input" : {
        "up" : false,
        "left" : false,
        "down" : false,
        "right" : false,
    },
    "map" : [],
};
for (var x=0; x<16; x+=1) {
    ika.map.push([]);
    for (var y=0; y<16; y+=1) {
        ika.map[x].push(0);
    }
}




// returns true for clear and false for wall
ika.pick = function(world_x, world_y) {
    var local_x = (world_x - ika.map.locus[0]) + 8;
    var local_y = ((world_y - ika.map.locus[1])*-1) + 8;
    if (Math.abs(local_x-8) > 7 || Math.abs(local_y-8) > 7) {
        return false;
    }
    else {
        var floor_x = Math.floor(local_x);
        var floor_y = Math.floor(local_y);
        var ceil_x = Math.ceil(local_x);
        var ceil_y = Math.ceil(local_y);
        var fract_x = local_x - floor_x;
        var fract_y = local_y - floor_y;

        var nw = Math.ceil(ika.map[floor_x][ceil_y]/255);
        var ne = Math.ceil(ika.map[ceil_x][ceil_y]/255);
        var sw = Math.ceil(ika.map[floor_x][floor_y]/255);
        var se = Math.ceil(ika.map[ceil_x][floor_y]/255);

        var north = mix(nw, ne, fract_x);
        var south = mix(sw, se, fract_x);
        var found = mix(south, north, fract_y);

        var reading = "" + nw + ":" + ne + "\n" + sw + ":" + se;
        // console.info(reading);
        // console.info(found);
        return found == 1.0;
    }
};




// returns the offset to move one unit in the given angle
ika.vector = function (angle, unit) {
    // zero degrees faces negative y, rotation is "anti clockwise"
    // x = sin(angle)
    // y = -cos(angle)
    var rad = radians(angle);
    return [Math.sin(rad)*unit, -Math.cos(rad)*unit];
};




// calls ika.pick, relative to the player
ika.pick_vector = function (angle, dist) {
    var vector = ika.vector(angle, dist);
    var test_x = ika.player.location[0] + vector[0];
    var test_y = ika.player.location[1] + vector[1];

    if (ika.pick(test_x, test_y)) {
        return [test_x, test_y];
    }
    else {
        return false;
    }
};




//
ika.move_player = function (angle, dist) {
    var veer = 0;
    var veer_angle = 15;
    var max_veer = 75;

    var check = ika.pick_vector(angle, dist);
    if (check) {
        ika.player.location[0] = check[0];
        ika.player.location[1] = check[1];
    }
    else {
        check = ika.pick_vector(angle, dist * 0.5);
        if (check) {
            ika.player.location[0] = check[0];
            ika.player.location[1] = check[1];
        }
        else {
            while (veer <= max_veer) {
                veer += veer_angle;
                var speed = mix(0.8, 0.1, (veer-veer_angle)/max_veer);
                var rhs = ika.pick_vector(angle + veer, dist*speed);
                var lhs = ika.pick_vector(angle + veer*-1, dist*speed);
                if (!!rhs != !!lhs) {
                    check = rhs ? rhs : lhs;
                    ika.player.location[0] = check[0];
                    ika.player.location[1] = check[1];
                    break;
                }
                else if (rhs && lhs) {
                    break;
                }
            }
        }
    }
};




// request the character be moved
ika.pending_bump = null;
ika.bump = function () {
    clearTimeout(ika.pending_bump);
    ika.pending_bump = setTimeout(ika.__bump_call, 25);
};
ika.__bump_call = function () {
    var active = false;
    var invert = false;
    if (!ika.input.up ^ !ika.input.down) {
        var dist = ika.input.up ? 0.275 : -0.15;
        var angle = ika.player.rotation_z;
        ika.move_player(angle, dist);        
        active = true;
    }
    if (!ika.input.left ^ !ika.input.right) {
        var dir = ika.input.left ? 1 : -1;
        if (invert) {
            dir *= -1;
        }
        ika.player.rotation_z += 3 * dir;
        active = true;
    }
    if (active) {
        ika.bump();
    }
    postMessage({"player" : ika.player});
};



ika.test_delay = null;
ika.debug_post = function () {
    if (!ika.test_delay) {
        ika.test_delay = setTimeout(ika.__debug_call, 50);
    }
};
ika.__debug_call = function () {
    ika.test_delay = null;
    var msg = " origin: " + ika.map.locus[0] + ", " + ika.map.locus[1] + "\n";
    for (var y=0; y<16; y+=1) {
        msg += "  "
        for (var x=0; x<16; x+=1) {
            //msg += ika.map[x][y] === 1.0 ? "X" : " ";
            //msg += ika.map[x][y] + " "
            if (ika.map[x][y] === 0) {
                msg += "##";
            }
            else if (ika.map[x][y] < 64) {
                msg += "++";
            }
            else if (ika.map[x][y] < 128) {
                msg += "::";
            }
            else if (ika.map[x][y] < 255) {
                msg += ".'";
            }
            else {
                msg += "  ";
            }

        }
        msg += "\n";
    }
    var x_diff = ika.player.location[0] - ika.map.locus[0];
    var y_diff = ika.player.location[1] - ika.map.locus[1];
    x_diff = x_diff.toString().slice(0,5);
    y_diff = y_diff.toString().slice(0,5);
    msg += " local diff: " + x_diff + ", " + y_diff;
    postMessage({"map" : msg});
};



onmessage = function (event) {
    if (event.data.type === "input") {
        ika.input = event.data.state;
        ika.bump();
    }
    else if (event.data.type === "walls") {
        var info = event.data.info;
        var cache = event.data.cache;
        var locus = event.data.locus;

        var x=0;
        var y=15;
        var data;
        
        for (var i=0; i<cache.length; i+= 4) {
            data = cache.slice(i, i+4);
            //if (data[0] === data[1] === data[2]) {
            ika.map[x][y] = (data[0] + data[1] + data[2])/3;
            //}
            
            x+=1;
            if (x >= 16) {
                x=0;
                y-=1;
            }
        };
        ika.map.locus = locus;
        ika.debug_post();
        
        // This process could be possibly sped up by way of
        // "transfering" the byte array for the cache.  See:
        // https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
    }
};
