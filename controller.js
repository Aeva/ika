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
        }
        ika.physics.postMessage({
            "type" : "input",
            "state" : ika.input,
        });
    };

    please.keys.enable();
    please.keys.connect("up", key_handler);
    please.keys.connect("left", key_handler);
    please.keys.connect("down", key_handler);
    please.keys.connect("right", key_handler);
};


ika.new_mapdata = function (map_data) {
    var el = document.getElementById("minimap");
    el.innerHTML = map_data;
};