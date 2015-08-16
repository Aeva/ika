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

// local namespace
var ika = {
    "viewport" : null,
    "manifest" : [
        // add art assets here
        "misty.frag",
        "cube.jta",
    ],
    "levels" : {},
};


ika.levels.start = "" +
    "#################\n" + 
    "#               #\n" +
    "#               #\n" + 
    "#     ## ##     #\n" + 
    "#    #  #  #    #\n" +
    "#   #       #   #\n" +
    "#   #       #   #\n" + 
    "#    #     #    #\n" + 
    "#     #   #     #\n" + 
    "#      # #      #\n" + 
    "#       #       #\n" + 
    "#               #\n" +
    "#               #\n" + 
    "#################\n";


ika.load_level = function (level_name) {
    var cube_model = please.access("cube.jta");
    var radius = 10;

    var lines = ika.levels[level_name].trim().split("\n");
    var width = lines[0].length;
    var height = lines.length;

    var grid = 2;
    var offset_x = (width-1)/2;
    var offset_y = (height-1)/2;

    for (var y=0; y<height; y+=1) {
        for (var x=0; x<width; x+=1) {
            var cube = cube_model.instance();
            var slot = lines[height-1-y][x];
            if (slot === "#") {
                cube.location = [(x-offset_x)*grid, (y-offset_y)*grid, 0];
                cube.shader.color = [1, 0, 0];
                cube.use_manual_cache_invalidation();
                ika.cubes.add(cube);
            }
        }
    }
};


addEventListener("load", function setup () {    
    // Attach the opengl rendering context.  This must be done before
    // anything else.
    please.gl.set_context("gl_canvas", {
        antialias : false,
    });

    // These should be defaults in m.grl but aren't currently :P
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Define where m.grl is to find various assets when using the
    // load methed.
    please.set_search_path("img", "images/");
    please.set_search_path("jta", "models/");
    please.set_search_path("glsl", "glsl/");
    please.set_search_path("audio", "sounds/");
    
    // Queue up assets to be downloaded before the game starts.
    ika.manifest.map(please.load);

    // Register a render passes with the scheduler, which automates
    // maintainig a fullscreen state when the canvas has the
    // 'fullscreen' css class applied to it.
    please.pipeline.add_autoscale();
    
    // register a render pass with the scheduler
    please.pipeline.add(10, "project/draw", function () {
        please.render(ika.viewport);
    }).skip_when(function () { return ika.viewport === null; });

    // start the rendering pipeline
    please.pipeline.start();

    // Show a loading screen
    ika.viewport = new please.LoadingScreen();
});


addEventListener("mgrl_fps", function (event) {
    document.getElementById("fps").innerHTML = event.detail;
});


addEventListener("mgrl_media_ready", please.once(function () {
    // The "mgrl_media_ready" event is called when pending downloads
    // have finished.  As we are using this to initialize and start
    // the game, the callback is wrapped in the "please.once"
    // function, to ensure that it is only called once.
    
    // initialize a scene graph object
    var graph = new please.SceneGraph();

    // add a camera object to the scene graph
    var camera = new please.CameraNode();
    camera.look_at = [0.0, 0.0, 0.0];
    camera.location = [0.0, -30.0, 30.0];
    graph.add(camera);
    camera.activate();

    // define this before the cubes as a temporary bugfix :P
    var prog = please.glsl("misty_shader", "simple.vert", "misty.frag");
    prog.activate();

    // add the handle for level assets
    ika.cubes = new please.GraphNode();
    graph.add(ika.cubes);

    // load some cubes
    ika.load_level("start");

    // add a center reference for now
    var cube_model = please.access("cube.jta");
    var cube = cube_model.instance();
    cube.location = [0, 0, 1];
    cube.shader.color = [0, 0, 0];
    graph.add(cube);
    camera.look_at = cube;

    // Add a renderer using the default shader.
    ika.diffuse_pass = new please.RenderNode("misty_shader");
    ika.diffuse_pass.graph = graph;
    var gloom = 0.175;
    ika.diffuse_pass.clear_color = [gloom, gloom, gloom, 1];

        
    // Transition from the loading screen prefab to our renderer
    ika.viewport.raise_curtains(ika.diffuse_pass);
}));
