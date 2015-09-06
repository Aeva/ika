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
        "location" : [0, 0, 0],
        "rotation_z" : 180,
    },
    "input" : {
        "up" : false,
        "left" : false,
        "down" : false,
        "right" : false,
    },
};

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


onmessage = function (event) {
    if (event.data.type === "input") {
        ika.input = event.data.state;
        ika.bump();
    }
};
