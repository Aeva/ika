#extension GL_EXT_draw_buffers : require
precision mediump float;

// mgrl builtins
uniform vec4 mgrl_clear_color;
uniform float mgrl_buffer_width;
uniform float mgrl_buffer_height;

// for lighting
uniform mat4 light_projection_matrix;
uniform mat4 light_view_matrix;

// varying
varying vec2 local_tcoords;
varying vec3 world_position;
varying float linear_depth;

// samplers
uniform sampler2D diffuse_texture;
uniform sampler2D spatial_texture;
uniform sampler2D light_texture;

uniform sampler2D mask_texture;
uniform sampler2D fg_texture;
uniform sampler2D bg_texture;

// mode switching
uniform int shader_pass;

// collision
uniform float depth_bias;
uniform vec3 wall_type;


#include "normalize_screen_coord.glsl"


float illumination(vec3 _position, float _depth) {
  // transform the world coordinate into the light's view space  
  vec3 position = (light_view_matrix * vec4(_position, 1.0)).xyz;

  // apply the light's projection matrix
  vec4 light_projected = light_projection_matrix * vec4(position, 1.0);
  
  // determine the vector from the light source to the fragment
  vec2 light_normal = light_projected.xy/light_projected.w;
  vec2 light_uv = light_normal*0.5+0.5;

  if (light_uv.x < 0.0 || light_uv.y < 0.0 || light_uv.x > 1.0 || light_uv.y > 1.0) {
    return 0.0;
  }

  if (length(light_normal) <=1.0) {
    float light_depth_1 = texture2D(light_texture, light_uv).r;
    float light_depth_2 = length(position);
    float illuminated = step(light_depth_2, light_depth_1 + depth_bias);
    return illuminated;
  }
  else {
    return 0.0;
  }
}


void main(void) {
  if (shader_pass == 0) {
    // g-buffer pass
    vec4 diffuse = texture2D(diffuse_texture, local_tcoords);
    if (diffuse.a < 0.5) {
      discard;
    }
    gl_FragData[0] = diffuse;
    gl_FragData[1] = vec4(world_position, linear_depth);
  }
  else if (shader_pass == 1) {
    float depth = linear_depth;
    gl_FragData[0] = vec4(depth, depth, depth, 1.0);
  }
  else if (shader_pass == 2) {
    // light perspective pass
    vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
    vec4 space = texture2D(spatial_texture, tcoords);
    if (space.w == -1.0) {
      discard;
    }
    else {
      float light = illumination(space.xyz, space.w);
      gl_FragData[0] = vec4(light, light, light, 1.0);
    }
  }
  else if (shader_pass == 3) {
    // combine the lighting and diffuse passes and display
    vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
    vec4 diffuse = texture2D(diffuse_texture, tcoords);
    if (diffuse.w == -1.0) {
      discard;
    }
    vec4 lightmap = texture2D(light_texture, tcoords);
    vec3 shadow = diffuse.rgb * 0.2;
    vec3 color = mix(shadow, diffuse.rgb, lightmap.rgb);
    gl_FragData[0] = vec4(color, 1.0);
  }


  else if (shader_pass == 4) {
    // bitmask pass
    vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
    float mask = texture2D(mask_texture, tcoords).r;
    vec4 sampled = mask < 0.5 ? texture2D(bg_texture, tcoords) : texture2D(fg_texture, tcoords);
    gl_FragData[0] = sampled;
  }
  else if (shader_pass == 5) {
    // collision masking
    vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
    vec4 space = texture2D(spatial_texture, tcoords);
    if (space.w == -1.0) {
      discard;
    }
    else {
      float light = illumination(space.xyz, space.w);
      if (light < 0.5) {        
        gl_FragData[0] = mgrl_clear_color;
      }
      else {
        gl_FragData[0] = vec4(1.0);
      }
    }
  }
  else if (shader_pass == 6) {
    // render collision data
    vec2 tcoords = normalize_screen_coord(gl_FragCoord.xy);
    vec4 space = texture2D(spatial_texture, tcoords);
    if (space.w == -1.0) {
      discard;
    }
    else {
      gl_FragData[0] = vec4(wall_type, 1.0);
    }
  }
  else if (shader_pass == 7) {
    // render collision data as a geometry pass
    gl_FragData[0] = vec4(wall_type, 1.0);
  }
}
