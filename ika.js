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
        // "forest_path.jta",
        // "forest_path_bake.png",
        "haze.png",
        "psycho_bake.png",
        "psycho.jta",

        //"meta.frag",
        "new_deferred.vert",
        "new_deferred.frag",
    ],
};


ika.load_room = function (asset) {
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
            collision.add(child);
        }
        else if (child.node_name.startsWith("floor")) {
            child.__regen_glsl_bindings();
            child.shader.wall_type = [1,1,1];
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

    // // register a render pass with the scheduler
    // please.pipeline.add(5, "project/collision", function () {
    //     var canvas = please.gl.canvas;
    //     please.render(ika.collision_pass);
    //     ika.samples.upon = ika.px_type(please.gl.pick(0.5, 0.5));
    //     ika.samples.ahead = ika.px_type(please.gl.pick(0.5, 0.47));
    //     ika.samples.behind = ika.px_type(please.gl.pick(0.5, 0.57));
    // }).skip_when(function () { return ika.collision_pass === undefined });

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
    var prog = please.glsl("mgrl_illumination", "new_deferred.vert", "new_deferred.frag");
    prog.activate();
        
    // initialize a scene graph object for visible objects
    var graph = new please.SceneGraph();

    // Define our renderer
    ika.renderer = new please.DeferredRenderer();
    ika.renderer.graph = graph;


    // add a handle for our player
    var player = ika.player = new please.GraphNode();
    please.make_animatable(player, "ahead");
    please.make_animatable(player, "behind");
    graph.add(player);
    //player.location = [43, 1, 0];
    player.location = [-4, 3, 0];
    //player.rotation_z = -70;
    player.rotation_z = 180;
    player.ahead = function () {
        var mat = mat4.create();
        mat4.translate(mat, this.shader.world_matrix, [0, -.2, 0]);
        return vec3.transformMat4(vec3.create(), vec3.create(), mat);
    };
    player.behind = function () {
        var mat = mat4.create();
        mat4.translate(mat, this.shader.world_matrix, [0, .15, 0]);
        return vec3.transformMat4(vec3.create(), vec3.create(), mat);
    };
    
    player.add(please.access("psycho.jta").instance());


    // connect the input handler
    ika.add_input_handler();

    
    // add a camera object to the scene graph
    var camera = ika.camera = new please.CameraNode();
    camera.look_at = function () {
        return [player.location_x, player.location_y, player.location_z + 5];
    };
    camera.location = function () {
        var mat_a = mat4.create();
        var mat_b = mat4.create();
        var mat_c = mat4.create();
        mat4.translate(mat_a, mat4.create(), player.location);
        mat4.rotateZ(mat_b, mat_a, please.radians(player.rotation_z));
        mat4.translate(mat_c, mat_b, [0.0, 9.7, 20.7]);
        //mat4.translate(mat_c, mat_b, [0.0, 9.7, 9]);
        
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
    // ortho.width = 128;
    // ortho.height = 128;
    ortho.width = 256;
    ortho.height = 256;
    //ortho.look_at = player;
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
    // ortho.up_vector = function () {
    //     var rotation = mat4.rotateZ(
    //         mat4.create(), mat4.create(), please.radians(player.rotation_z));
    //     return vec3.transformMat4(vec3.create(), [0, -1, 0], rotation);
    // };
    ortho.up_vector = [0, 1, 0];
    collision_graph.add(ortho);
    ortho.activate();


    //var room_data = ika.load_room("forest_path.jta");
    var room_data = ika.load_room("test_level.jta");
    graph.add(room_data.display);
    collision_graph.add(room_data.collision);

    
    // light test
    var light = new please.SpotLightNode();
    light.location = [10, -14, 17];
    light.look_at = [0, 0, 5];
    light.fov = 45;
    graph.add(light);

    light = new please.SpotLightNode();
    light.location = [-5, 0, 17];
    light.look_at = [-6, -5, 5];
    light.fov = 50;
    graph.add(light);



    // extra gbuffer pass for collision detection
    var gbuffer_options = {
        "width" : 256,
        "height" : 256,
        "buffers" : ["color", "spatial"],
        "type":gl.FLOAT,
    };
    var gbuffers = new please.RenderNode(prog, gbuffer_options);
    gbuffers.clear_color = [-1, -1, -1, -1];
    gbuffers.shader.shader_pass = 0;
    gbuffers.shader.geometry_pass = true;
    gbuffers.graph = collision_graph;

    
    // collision pass
    var collision_options = {
        "width" : 16,
        "height" : 16,
    };
    ika.collision_mask = new please.RenderNode(prog, collision_options);
    ika.collision_mask.graph = collision_graph;
    ika.collision_mask.clear_color = [0, 0, 0, 1];
    ika.collision_mask.shader.shader_pass = 5;
    ika.collision_mask.shader.geometry_pass = false;
    ika.collision_mask.shader.spatial_texture = gbuffers.buffers.spatial;
    ika.collision_mask.render = function () {
        if (ika.renderer.graph !== null) {
            gl.disable(gl.DEPTH_TEST);
            //gl.enable(gl.CULL_FACE);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE);
            // gl.blendFuncSeparate(
            //     gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.SRC_ALPHA, gl.ONE);

            for (var i=0; i<ika.renderer.graph.__lights.length; i+=1) {
                var light = ika.renderer.graph.__lights[i];
                this.__prog.samplers.light_texture = ika.renderer.shader.light_texture.targets[i];
                this.__prog.vars.light_view_matrix = light.camera.view_matrix;
                this.__prog.vars.light_projection_matrix = light.camera.projection_matrix;
                please.gl.splat();
            }
            gl.disable(gl.BLEND);
            gl.disable(gl.CULL_FACE);
            gl.enable(gl.DEPTH_TEST);
        }
    };
    

    // light world collision data
    ika.light_world = new please.RenderNode(prog, collision_options);
    ika.light_world.graph = collision_graph;
    ika.light_world.clear_color = [0, 0, 0, 1];
    ika.light_world.shader.shader_pass = 6;
    ika.light_world.shader.geometry_pass = false;
    ika.light_world.shader.spatial_texture = gbuffers.buffers.spatial;


    // collision bitmask pass
    ika.collision_final = new please.RenderNode(prog, collision_options);
    ika.collision_final.shader.shader_pass = 4;
    ika.collision_final.shader.mask_texture = 
    ika.collision_final.shader.fg_texture = ika.light_world
    ika.collision_final.shader.bg_texture = "haze.png";

    ika.collision_final.frequency = 30;


        
    // main bitmask pass
    ika.bitmask = new please.RenderNode(prog);
    ika.bitmask.shader.shader_pass = 4;
    ika.bitmask.shader.mask_texture = ika.renderer.shader.light_texture;//ika.light_pass;
    ika.bitmask.shader.fg_texture = ika.renderer;
    ika.bitmask.shader.bg_texture = "haze.png";

    ika.bitmask.frequency = 30;


    var pip = new please.PictureInPicture();
    pip.shader.main_texture = ika.bitmask;
    pip.shader.pip_texture = ika.collision_mask;
    
    // Transition from the loading screen prefab to our renderer
    //ika.viewport.raise_curtains(ika.bitmask);
    ika.viewport.raise_curtains(pip);
}));
