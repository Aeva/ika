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
        // "test_level.jta",
        // "test_level_bake.png",
        "forest_path.jta",
        "forest_path_bake.png",
        "haze.png",
        "psycho_bake.png",
        "psycho.jta",

        "meta.frag",
    ],
};


ika.load_room = function (asset) {
    var model = please.access(asset).instance();
    var visible = [];
    var display = new please.GraphNode();
    var collision = new please.GraphNode();

    please.gl.get_program("custom").activate();
    //please.gl.get_program("collision_shader").activate();
    var cache = [];
    for (var i=0; i<model.children.length; i+=1) {
        cache.push(model.children[i]);
    }
    for (var i=0; i<cache.length; i+=1) {
        var child = cache[i];
        if (child.node_name.startsWith("wall")) {
            child.__regen_glsl_bindings();
            child.shader.color = [0,0,0];
            collision.add(child);
        }
        else if (child.node_name.startsWith("floor")) {
            child.__regen_glsl_bindings();
            child.shader.color = [1,1,1];
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


ika.px_type = function (color) {
    if (color[0] === 255 && color[2] === 255) {
        return "floor";
    }
    else if (color[0] === 255 && color[2] === 0) {
        return "haze";
    }
    else if (color[0] === 0 && color[2] === 255) {
        return "flux";
    }
    else if (color[0] === 0 && color[2] === 0) {
        return "wall";
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
    please.pipeline.add(5, "project/collision", function () {
        var canvas = please.gl.canvas;
        please.render(ika.collision_pass);
        ika.samples.upon = ika.px_type(please.gl.pick(0.5, 0.5));
        ika.samples.ahead = ika.px_type(please.gl.pick(0.5, 0.47));
        ika.samples.behind = ika.px_type(please.gl.pick(0.5, 0.57));
    }).skip_when(function () { return ika.collision_pass === undefined });

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

    // build and activate the custom shader program
    var prog = please.glsl("custom", "simple.vert", "meta.frag");
    prog.activate();
    
    
    // initialize a scene graph object for visible objects
    var graph = new please.SceneGraph();


    // add a handle for our player
    var player = ika.player = new please.GraphNode();
    please.make_animatable(player, "ahead");
    please.make_animatable(player, "behind");
    graph.add(player);
    player.location_x = 7;
    player.rotation_z = 180;
    player.ahead = function () {
        var mat = mat4.create();
        mat4.translate(mat, this.shader.world_matrix, [0, -.6, 0]);
        return vec3.transformMat4(vec3.create(), vec3.create(), mat);
    };
    player.behind = function () {
        var mat = mat4.create();
        mat4.translate(mat, this.shader.world_matrix, [0, .3, 0]);
        return vec3.transformMat4(vec3.create(), vec3.create(), mat);
    };
    
    player.add(please.access("psycho.jta").instance());


    // connect the input handler
    ika.add_input_handler();

    
    // add a camera object to the scene graph
    var camera = ika.camera = new please.CameraNode();
    camera.look_at = function () {
        return [player.location_x, player.location_y, player.location_z + 2];
    };
    camera.location = function () {
        var mat_a = mat4.create();
        var mat_b = mat4.create();
        var mat_c = mat4.create();
        mat4.translate(mat_a, mat4.create(), player.location);
        mat4.rotateZ(mat_b, mat_a, please.radians(player.rotation_z));
        mat4.translate(mat_c, mat_b, [0.0, 9.7, 20.7]);
        
        return vec3.transformMat4(
            vec3.create(), vec3.create(), mat_c);
    };
    camera.fov = 80;

    graph.add(camera);
    camera.activate();



    // initialize a scene graph for collision geometry
    var collision_graph = new please.SceneGraph();
    var ortho = ika.ortho = new please.CameraNode();
    ortho.set_orthographic();
    ortho.width = 128;
    ortho.height = 128;
    ortho.look_at = player;
    ortho.location = function () {
        return [player.location_x, player.location_y, 40];
    };
    ortho.up_vector = function () {
        var rotation = mat4.rotateZ(
            mat4.create(), mat4.create(), please.radians(player.rotation_z));
        return vec3.transformMat4(vec3.create(), [0, -1, 0], rotation);
    };
    collision_graph.add(ortho);
    ortho.activate();

    // shader for collision detection
    //var prog = please.glsl("collision_shader", "simple.vert", "collision.frag");
    

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


    // test level thing
    var room_data = ika.load_room("forest_path.jta");
    graph.add(room_data.display);
    collision_graph.add(room_data.collision);

    
    // light test
    var light = ika.light = new SpotLightNode();
    light.location = [10, -14, 17];
    light.look_at = [0, 0, 5];
    light.fov = 60;
    graph.add(light);

    // light.location_x = please.oscillating_driver(10, -10, 5000);
    // light.location_y = please.oscillating_driver(-15, -20, 2500);




    // make sure that the player object nor any of its children have a
    // shadow add a depth texture pass
    player.propogate(function (node) {
        node.no_shadow = true;
    });

    //please.glsl("light_mask", "simple.vert", "depth.frag");
    ika.depth_pass = new please.RenderNode("custom");
    ika.depth_pass.shader.depth_pass = true;
    ika.depth_pass.graph = graph;
    ika.depth_pass.render = function () {
        light.activate();
        this.graph.draw();
        // this.graph.draw(function (node) {
        //     return !!node.no_shadow;
        // });
        camera.activate();
    };


    var add_lighting = function(node) {
        node.shader.depth_texture = ika.depth_pass;
        node.shader.mystery_scalar = function () {
            return (light.far - light.near) / 2;
        };
        node.shader.light_view_matrix = function () {
            return light.view_matrix;
        };
        node.shader.light_projection_matrix = function () {
            return light.projection_matrix;
        };
    };

    
    // Add a renderer using the default shader.
    //please.glsl("light_mask", "simple.vert", "illumination.frag");
    ika.light_pass = new please.RenderNode("custom");
    ika.light_pass.shader.illumination_pass = true;
    ika.light_pass.clear_color = [0,0,0,1];
    ika.light_pass.graph = graph;
    add_lighting(ika.light_pass);
    

    // diffuse pass
    ika.diffuse_pass = new please.RenderNode("custom");
    ika.diffuse_pass.shader.diffuse_pass = true;
    ika.diffuse_pass.graph = graph;

        
    // bitmask pass
    //var prog = please.glsl("bitmask", "simple.vert", "bitmask.frag");
    ika.bitmask = new please.RenderNode("custom");
    ika.bitmask.shader.bitmask_pass = true;
    ika.bitmask.shader.mask_texture = ika.light_pass;
    ika.bitmask.shader.fg_texture = ika.diffuse_pass;
    ika.bitmask.shader.bg_texture = "haze.png";


    // collision pass
    ika.collision_pass = new please.RenderNode("custom");
    ika.collision_pass.shader.collision_pass = true;
    ika.collision_pass.graph = collision_graph;
    ika.collision_pass.clear_color = [1, 0, 0, 1];
    add_lighting(ika.collision_pass);
    
    
    // // debug
    // var pip = new please.PictureInPicture();
    // pip.shader.main_texture = ika.bitmask;
    // pip.shader.pip_texture = ika.collision_pass; //ika.depth_pass;
    
    
    // Transition from the loading screen prefab to our renderer
    ika.viewport.raise_curtains(ika.bitmask);
}));



var SpotLightNode = function () {    
    please.CameraNode.call(this);
    this.width = 1;
    this.height = 1;
    this.near = 10;
};
SpotLightNode.prototype = Object.create(please.CameraNode.prototype);
