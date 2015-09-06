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

ika.samples = {
    "upon" : null,
    "ahead" : null,
    "behind" : null,
};
ika.mode = "human";

// [+] please.radians(degrees)
//
// Converts from degrees to radians.
//
// - **degrees** An angular value expressed in dgersee.
//
var radians = function (degrees) {
    return degrees*(Math.PI/180);
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
        var dir = ika.input.up ? "ahead" : "behind";
        var target = ika.player[dir];
        invert = dir === "behind";
        var angle_mod = dir === "ahead" ? 0 : 180;
        var vector_x = Math.sin(radians(ika.player.rotation_z + angle_mod));
        var vector_y = -Math.cos(radians(ika.player.rotation_z + angle_mod));
        
        if ((ika.mode === "human" && ika.samples[dir] !== "wall") || ika.mode === "monster") {
            // zero degrees faces negative y, rotation is "anti clockwise"
            // 
            // x = sin(angle)
            // y = -cos(angle)
            ika.player.location[0] += vector_x;
            ika.player.location[1] += vector_y;
        }
        if (ika.mode === "human" && ika.samples.upon === "haze") {
            ika.mode = "monster";
        }
        else if (ika.mode === "monster" && ika.samples.upon === "floor") {
            ika.mode = "human";
        }
        
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
    var msg = "\n";
    for (var y=0; y<16; y+=1) {
        msg += "    "
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
        ika.debug_post();
        
        // This process could be possibly sped up by way of
        // "transfering" the byte array for the cache.  See:
        // https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage
    }
};
