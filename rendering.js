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


ika.renderers = {};


ika.renderers.Bitmask = function (prog, mask, fg, bg, options) {
    var bitmask = new please.RenderNode(prog, options);
    bitmask.shader.shader_pass = 4;
    bitmask.shader.geometry_pass = false;
    bitmask.shader.mask_texture = mask;
    bitmask.shader.fg_texture = fg;
    bitmask.shader.bg_texture = bg;
    return bitmask;
};


ika.renderers.SecondSpace = function (prog, graph) {
    var gbuffer_options = {
        "width" : 512,
        "height" : 512,
        "buffers" : ["color", "spatial"],
        "type": gl.FLOAT,
    };
    var node = new please.RenderNode(prog, gbuffer_options);
    node.shader.shader_pass = 0;
    node.shader.geometry_pass = true;
    node.graph = graph;
    node.clear_color = [0.2, 0.2, 0.2, 1.0];
    return node;
};


ika.renderers.CollisionDataRenderer = function (prog, graph, geometric) {
    var collision_options = {
        "width" : 16,
        "height" : 16,
        "buffers" : ["color"],
    };
    var realm = new please.RenderNode(prog, collision_options);
    realm.graph = graph;
    realm.clear_color = [0, 0, 0, 1];
    realm.shader.shader_pass = 6;
    realm.shader.geometry_pass = !!(geometric);

    return realm;
}


ika.renderers.CollisionRenderer = function (prog, graph) {
    // extra gbuffer pass for collision detection
    var gbuffer_options = {
        "width" : 512,
        "height" : 512,
        "buffers" : ["color", "spatial"],
        "type": gl.FLOAT,
    };
    var gbuffers = new please.RenderNode(prog, gbuffer_options);
    gbuffers.clear_color = [-1, -1, -1, -1];
    gbuffers.shader.shader_pass = 0;
    gbuffers.shader.geometry_pass = true;
    gbuffers.graph = graph;
    

    // collision pass
    var collision_options = {
        "width" : 16,
        "height" : 16,
    };
    var collision_mask = new please.RenderNode(prog, collision_options);
    collision_mask.graph = graph;
    collision_mask.clear_color = [0, 0, 0, 1];
    collision_mask.shader.shader_pass = 5;
    collision_mask.shader.geometry_pass = false;
    collision_mask.shader.depth_bias = 2;
    collision_mask.shader.spatial_texture = gbuffers.buffers.spatial;
    collision_mask.render = function () {
        if (ika.renderer.graph !== null && ika.renderer.shader.light_texture.targets) {
            gl.disable(gl.DEPTH_TEST);
            gl.enable(gl.CULL_FACE);
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
            this.locus = this.graph.camera.look_at;
        }
    };

    
    // light world collision data
    var light_world = new ika.renderers.CollisionDataRenderer(prog, graph);
    light_world.shader.spatial_texture = gbuffers.buffers.spatial;

    
    // collision bitmask pass
    var bitmask = new ika.renderers.Bitmask(
        prog,
        collision_mask,
        light_world,
        ika.second_terrain_renderer,
        collision_options);
    bitmask.frequency = 12;

    bitmask.stream_callback = function (cache, info) {
        ika.physics.postMessage({
            "type" : "walls",
            "cache" : cache,
            "info" : info,
            "locus" : collision_mask.locus,
        });
    };

    return bitmask;
};
