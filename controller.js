/*

 Ika prototype
 version < 1.0

.

 Copyright (c) 2014, Aeva M. Palecek

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


ika.input = {
    "up" : false,
    "left" : false,
    "down" : false,
    "right" : false,
};

ika.samples = {
    "upon" : null,
    "ahead" : null,
    "behind" : null,
};

ika.mode = "human";


ika.add_input_handler = function () {
    var key_handler = function (state, key) {
        // arrow key handler
        if (state === "cancel") {
            ika.input[key] = false;
        }
        else if (state === "press" && ika.input[key] === false) {
            ika.input[key] = performance.now();
            ika.bump();
        }
    };

    please.keys.enable();
    please.keys.connect("up", key_handler);
    please.keys.connect("left", key_handler);
    please.keys.connect("down", key_handler);
    please.keys.connect("right", key_handler);
};


// request the character be moved
ika.__pending_bump = null;
ika.bump = function () {
    window.clearTimeout(ika.__pending_bump);
    ika.__pending_bump = window.setTimeout(ika.__bump_call, 0);
};
ika.__bump_call = function () {
    var active = false;
    var invert = false;
    if (!ika.input.up ^ !ika.input.down) {
        var dir = ika.input.up ? "ahead" : "behind";
        var target = ika.player[dir];
        invert = dir === "behind";
        if ((ika.mode === "human" && ika.samples[dir] !== "wall") || ika.mode === "monster") {
            ika.player.location = target;
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
};
