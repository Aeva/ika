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
    "viewport" : null,
    "manifest" : [
        // add art assets here
        "cube.jta",
        "test_level.jta",
        "test_level_bake.png",
        "second_space.jta",
        // "forest_path.jta",
        // "forest_path_bake.png",
        "haze.png",
        "psycho_bake.png",
        "psycho_bake_red.png",
        "psycho.jta",

        //"meta.frag",
        "new_deferred.vert",
        "new_deferred.frag",
    ],
    "physics" : new Worker("physics.js"),
};


ika.load_room = function (asset) {
    // build and activate the custom shader program
    var prog = please.gl.get_program("mgrl_illumination");
    prog.activate();

    var model = please.access(asset).instance();
    var visible = [];
    var display = new please.GraphNode();
    var collision = new please.GraphNode();


    var cache = [];
    for (var i=0; i<model.children.length; i+=1) {
        cache.push(model.children[i]);
    }
    for (var i=0; i<cache.length; i+=1) {
        var child = cache[i];
        if (child.node_name.startsWith("wall")) {
            child.__regen_glsl_bindings();
            child.shader.wall_type = [0,0,0];
            child.shader.diffuse_texture = "girl_with_headphones.png";
            collision.add(child);
        }
        else if (child.node_name.startsWith("floor")) {
            child.__regen_glsl_bindings();
            child.shader.wall_type = [1,1,1];
            child.shader.diffuse_texture = "girl_with_headphones.png";
            collision.add(child);
        }
        else {
            visible.push(child);
        }
    }
    if (visible.length === 1) {
        display = visible[0];
    }
    else {
        for (var i=0; i<visible.length; i+=1) {
            display.add(visible[i]);
        }
    }

    collision.location = function () { return display.location; };
    collision.rotation = function () { return display.rotation; };
    collision.scale = function () { return display.scale; };

    please.gl.get_program("default").activate();
    
    return {
        "display" : display,
        "collision" : collision,
    };
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
    gl.disable(gl.CULL_FACE);
    
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
        if (ika.terrain_renderer && ika.second_terrain_renderer) {
            //please.indirect_render(ika.second_terrain_renderer);
            please.indirect_render(ika.terrain_renderer);
        };
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

    // build and activate the custom shader program
    var prog = please.glsl(
        "mgrl_illumination", "new_deferred.vert", "new_deferred.frag");
    prog.activate();
        
    // initialize the scene graphs we'll be using
    var graph = ika.graph = new please.SceneGraph();
    var second_graph = new please.SceneGraph();

    // Define our renderers
    ika.renderer = new please.DeferredRenderer();
    ika.renderer.graph = graph;
    ika.renderer.shader.light_texture.shader.depth_bias = 0.0;

    ika.second_renderer = new ika.renderers.SecondSpace(prog, second_graph);

    var collision_graph = new please.SceneGraph();
    var second_collision_graph = new please.SceneGraph();
    ika.second_terrain_renderer = new ika.renderers.CollisionDataRenderer(prog, second_collision_graph, true);
    ika.second_terrain_renderer.frequency = 12;
    ika.terrain_renderer = new ika.renderers.CollisionRenderer(
        prog, collision_graph);

    // add a handle for our player
    var player = ika.player = new please.GraphNode();
    please.make_animatable(player, "ahead");
    please.make_animatable(player, "behind");
    graph.add(player);
    player.location = [-4.5, 6.5, 0];
    player.rotation_z = 180;

    ika.physics.onmessage = function(event) {
        if (event.data.player) {
            player.location = event.data.player.location;
            player.rotation_z = event.data.player.rotation_z;
        }
        else if (event.data.map) {
            ika.new_mapdata(event.data.map);
        }
    };
    
    player.add(please.access("psycho.jta").instance());
    player.propogate(function (node) {node.cast_shadows = false; });

    // connect the input handler
    ika.add_input_handler();

    // add a secondspace double for our player
    var doppel = please.access("psycho.jta").instance();
    doppel.shader.diffuse_texture = "psycho_bake_red.png";
    doppel.location = function () { return player.location; };
    doppel.rotation = function () { return player.rotation; };
    second_graph.add(doppel);

    
    // add a camera object to the scene graph
    var camera = ika.camera = new please.CameraNode();
    camera.look_at = function () {
        //return [player.location_x, player.location_y, player.location_z + 5];
        //return [player.location_x, player.location_y, player.location_z+4];
        return [0, 0, 0];
    };
    camera.location = function () {
        // var mat_a = mat4.create();
        // var mat_b = mat4.create();
        // var mat_c = mat4.create();
        // mat4.translate(mat_a, mat4.create(), player.location);
        // mat4.rotateZ(mat_b, mat_a, please.radians(player.rotation_z));
        // //mat4.translate(mat_c, mat_b, [0.0, 9.7, 20.7]);
        // mat4.translate(mat_c, mat_b, [0.0, 5, 10]);
        
        // return vec3.transformMat4(
        //     vec3.create(), vec3.create(), mat_c);
        return [0, -1, 20];
    };
    camera.fov = 80;

    graph.add(camera);
    camera.activate();

    var second_camera = new please.CameraNode();
    second_camera.look_at = function () { return camera.look_at; }
    second_camera.location = function () { return camera.location; }
    second_camera.fov = function () { return camera.fov; }
    second_graph.add(second_camera);



    // initialize a scene graph for collision geometry
    var ortho = ika.ortho = new please.CameraNode();
    ortho.set_orthographic();
    ortho.width = 256;
    ortho.height = 256;
    ortho.look_at = function () {
        var scale = 1;
        return [
            Math.round(player.location_x/scale)*scale,
            Math.round(player.location_y/scale)*scale,
            0
        ];
    };
    ortho.location = function () {
        var scale = 1;
        return [
            Math.round(player.location_x/scale)*scale,
            Math.round(player.location_y/scale)*scale,
            40
        ];
    };
    ortho.up_vector = [0, 1, 0];
    collision_graph.add(ortho);
    ortho.activate();

    var second_ortho = new please.CameraNode();
    second_ortho.set_orthographic();
    second_ortho.width = 256;
    second_ortho.height = 256
    second_ortho.look_at = function () { return ortho.look_at; };
    second_ortho.location = function () { return ortho.location; };
    second_ortho.up_vector = function () { return ortho.up_vector; };
    second_collision_graph.add(second_ortho);
    second_ortho.activate();


    //var room_data = ika.load_room("forest_path.jta");
    var room_data = ika.room_data = ika.load_room("test_level.jta");
    graph.add(room_data.display);
    collision_graph.add(room_data.collision);


    var second_space = ika.second_space = ika.load_room("second_space.jta");
    second_graph.add(second_space.display);
    second_collision_graph.add(second_space.collision);

        
    // light test
    var light = new please.SpotLightNode();
    light.location = [10, -14, 17];
    light.location_x = please.oscillating_driver(-10, 20, 5000);
    light.look_at = [0, 0, 5];
    light.fov = 45;
    graph.add(light);

    light = new please.SpotLightNode();
    light.location = [-5, 0, 17];
    light.look_at = [-6, -5, 5];
    light.fov = 50;
    graph.add(light);


    // main bitmask pass
    var bitmask = new ika.renderers.Bitmask(
        prog, ika.renderer.shader.light_texture, ika.renderer, ika.second_renderer);
    bitmask.frequency = 30;
    
    // var pip = new please.PictureInPicture();
    // pip.shader.main_texture = bitmask;
    // pip.shader.pip_texture = ika.second_terrain_renderer;
    // //pip.shader.pip_texture = ika.terrain_renderer;
    
    // Transition from the loading screen prefab to our renderer
    ika.viewport.raise_curtains(bitmask);
    //ika.viewport.raise_curtains(pip);
}));
