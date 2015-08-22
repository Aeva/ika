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
        "cube.jta",
        "test_level.jta",
        "test_level_bake.png",
        "haze.png",

        "depth.frag",
        "bitmask.frag",
        "illumination.frag",
    ],
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
    var camera = ika.camera = new please.CameraNode();
    camera.look_at = [0.0, 0.0, 0.0];
    camera.location = [0.0, -30.0, 30.0];
    graph.add(camera);
    camera.activate();
    

    // define this before the cubes as a temporary bugfix :P
    // var prog = please.glsl("misty_shader", "simple.vert", "misty.frag");
    // prog.activate();
    // var prog = please.glsl("light_mask", "simple.vert", "illumination.frag");
    // prog.activate();

    // add the handle for level assets
    ika.cubes = new please.GraphNode();
    graph.add(ika.cubes);
    
    // add a center reference for now
    var cube_model = please.access("cube.jta");
    var cube = ika.cube = cube_model.instance();
    cube.location = [0, 0, 1];
    cube.shader.color = [0, 0, 0];
    graph.add(cube);
    camera.look_at = cube;

    // test level thing
    var bg_model = please.access("test_level.jta");
    var test = bg_model.instance();
    graph.add(test);

    // light test
    var light = ika.light = new SpotLightNode();
    light.location = [10, -10, 15];
    light.look_at = [0, 0, 5];
    light.fov = 60;
    graph.add(light);

    light.location_x = please.oscillating_driver(10, -10, 5000);
    light.location_y = please.oscillating_driver(-10, -15, 2500);




    // add a depth texture pass
    please.glsl("depth_shader", "simple.vert", "depth.frag");
    ika.depth_pass = new please.RenderNode("depth_shader");
    ika.depth_pass.graph = graph;
    ika.depth_pass.render = function () {
        light.activate();
        this.graph.draw();
        camera.activate();
    };

    
    // Add a renderer using the default shader.
    please.glsl("light_mask", "simple.vert", "illumination.frag");
    ika.light_pass = new please.RenderNode("light_mask");
    ika.light_pass.shader.depth_texture = ika.depth_pass;
    ika.light_pass.shader.mystery_scalar = function () {
        return (light.far - light.near) / 2;
    };
    ika.light_pass.shader.light_view_matrix = function () {
        return light.view_matrix;
    };
    ika.light_pass.shader.light_projection_matrix = function () {
        return light.projection_matrix;
    };
    ika.light_pass.clear_color = [0,0,0,1];
    ika.light_pass.graph = graph;


    // diffuse pass
    ika.diffuse_pass = new please.RenderNode("default");
    ika.diffuse_pass.graph = graph;

        
    // bitmask pass
    var prog = please.glsl("bitmask", "simple.vert", "bitmask.frag");
    ika.combined = new please.RenderNode("bitmask");
    ika.combined.shader.mask_texture = ika.light_pass;
    ika.combined.shader.fg_texture = ika.diffuse_pass;
    ika.combined.shader.bg_texture = "haze.png";

    
    // debug
    var pip = new please.PictureInPicture();
    pip.shader.main_texture = ika.combined;
    pip.shader.pip_texture = ika.depth_pass;
    
    
    // Transition from the loading screen prefab to our renderer
    ika.viewport.raise_curtains(pip);
}));



var SpotLightNode = function () {    
    please.CameraNode.call(this);
    this.width = 1;
    this.height = 1;
    this.near = 10;
};
SpotLightNode.prototype = Object.create(please.CameraNode.prototype);
